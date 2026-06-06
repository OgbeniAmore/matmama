
-- 1) phcs table for admin-managed PHCs
CREATE TABLE IF NOT EXISTS public.phcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lga text NOT NULL,
  ward text NOT NULL,
  name text NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lga, ward, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.phcs TO authenticated;
GRANT ALL ON public.phcs TO service_role;

ALTER TABLE public.phcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view phcs"
  ON public.phcs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and PMs add phcs"
  ON public.phcs FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['system_admin'::app_role,'program_manager'::app_role]));

CREATE POLICY "Admins and PMs update phcs"
  ON public.phcs FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['system_admin'::app_role,'program_manager'::app_role]));

CREATE POLICY "Admins and PMs delete phcs"
  ON public.phcs FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['system_admin'::app_role,'program_manager'::app_role]));

CREATE TRIGGER update_phcs_updated_at
  BEFORE UPDATE ON public.phcs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Resync function — recompute client status & due_date from next pending visit
CREATE OR REPLACE FUNCTION public.resync_client_status(_client_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _service text;
  _next_date timestamptz;
  _pending_count integer;
  _total integer;
  _new_status text;
BEGIN
  SELECT service INTO _service FROM public.clients WHERE id = _client_id;
  IF _service IS NULL THEN RETURN; END IF;

  IF _service = 'Ante Natal Care' THEN
    SELECT count(*) FILTER (WHERE status IN ('Pending','Missed')),
           count(*),
           min(scheduled_date) FILTER (WHERE status IN ('Pending','Missed'))
      INTO _pending_count, _total, _next_date
      FROM public.anc_visits WHERE client_id = _client_id;
  ELSIF _service = 'Routine Immunization' THEN
    SELECT count(*) FILTER (WHERE status IN ('Pending','Missed')),
           count(*),
           min(scheduled_date) FILTER (WHERE status IN ('Pending','Missed'))
      INTO _pending_count, _total, _next_date
      FROM public.immunization_records WHERE client_id = _client_id;
  ELSE
    RETURN; -- Family planning: leave as-is
  END IF;

  IF _total IS NULL OR _total = 0 THEN RETURN; END IF;

  IF _pending_count = 0 THEN
    _new_status := 'Completed';
  ELSIF _next_date IS NOT NULL AND _next_date::date < (now() AT TIME ZONE 'Africa/Lagos')::date THEN
    _new_status := 'Defaulting';
  ELSE
    _new_status := 'On Track';
  END IF;

  UPDATE public.clients
    SET status = _new_status,
        due_date = COALESCE(_next_date, due_date),
        updated_at = now()
    WHERE id = _client_id
      AND (status IS DISTINCT FROM _new_status OR (due_date IS DISTINCT FROM COALESCE(_next_date, due_date)));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resync_client_status(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resync_client_status(text) TO authenticated, service_role;

-- 3) Auto resync sweep: move defaulters back to On Track when next due is in the future,
--    and mark clients completed when all visits done.
CREATE OR REPLACE FUNCTION public.auto_resync_clients()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id text;
  _count integer := 0;
BEGIN
  FOR _id IN
    SELECT id FROM public.clients
    WHERE service IN ('Ante Natal Care','Routine Immunization')
      AND status IN ('Defaulting','On Track')
  LOOP
    PERFORM public.resync_client_status(_id);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_resync_clients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_resync_clients() TO authenticated, service_role;
