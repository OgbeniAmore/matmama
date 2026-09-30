ALTER TABLE public.anc_visits ADD COLUMN IF NOT EXISTS pregnancy_number integer NOT NULL DEFAULT 1;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS mother_client_id text REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS clients_mother_idx ON public.clients(mother_client_id);

CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mother_client_id text NOT NULL REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE,
  pregnancy_number integer NOT NULL DEFAULT 1,
  delivery_date date NOT NULL,
  place text,
  delivery_mode text,
  outcome text NOT NULL DEFAULT 'Live birth',
  number_of_babies integer NOT NULL DEFAULT 1,
  notes text,
  recorded_by uuid,
  account_id uuid REFERENCES public.accounts(id),
  facility_id uuid REFERENCES public.facilities(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mother_client_id, pregnancy_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view deliveries" ON public.deliveries FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'system_admin'::app_role) OR account_id = get_user_account_id(auth.uid()) OR is_client_shared_with_user(mother_client_id, auth.uid()));
CREATE POLICY "Staff record deliveries" ON public.deliveries FOR INSERT TO authenticated
  WITH CHECK (account_id = get_user_account_id(auth.uid()) AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = mother_client_id AND c.account_id = get_user_account_id(auth.uid())));
CREATE POLICY "Officers update deliveries" ON public.deliveries FOR UPDATE TO authenticated
  USING (account_id = get_user_account_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['facility_officer','program_manager','system_admin']::app_role[]))
  WITH CHECK (account_id = get_user_account_id(auth.uid()));
CREATE POLICY "Officers delete deliveries" ON public.deliveries FOR DELETE TO authenticated
  USING (account_id = get_user_account_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['facility_officer','program_manager','system_admin']::app_role[]));

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_deliveries AFTER INSERT OR UPDATE OR DELETE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE OR REPLACE FUNCTION public.resync_client_status(_client_id text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _service text; _next_date timestamptz; _pending_count integer; _total integer;
  _new_status text; _client_account uuid; _preg integer; _delivered boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT service, account_id INTO _service, _client_account FROM public.clients WHERE id = _client_id;
  IF _service IS NULL THEN RETURN; END IF;
  IF NOT public.has_role(auth.uid(), 'system_admin'::app_role)
     AND _client_account IS DISTINCT FROM public.get_user_account_id(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied for this client' USING ERRCODE = '42501';
  END IF;

  IF _service = 'Ante Natal Care' THEN
    SELECT COALESCE(max(pregnancy_number),1) INTO _preg FROM public.anc_visits WHERE client_id = _client_id;
    SELECT EXISTS (SELECT 1 FROM public.deliveries WHERE mother_client_id = _client_id AND pregnancy_number = _preg) INTO _delivered;
    SELECT count(*) FILTER (WHERE status IN ('Pending','Missed')), count(*),
           min(scheduled_date) FILTER (WHERE status IN ('Pending','Missed'))
      INTO _pending_count, _total, _next_date
      FROM public.anc_visits WHERE client_id = _client_id AND pregnancy_number = _preg;
  ELSIF _service = 'Routine Immunization' THEN
    SELECT count(*) FILTER (WHERE status IN ('Pending','Missed')), count(*),
           min(due_date) FILTER (WHERE status IN ('Pending','Missed'))
      INTO _pending_count, _total, _next_date
      FROM public.immunization_records WHERE client_id = _client_id;
  ELSE RETURN; END IF;

  IF _delivered THEN
    _new_status := 'Completed';
  ELSIF _total IS NULL OR _total = 0 THEN RETURN;
  ELSIF _pending_count = 0 THEN _new_status := 'Completed';
  ELSIF _next_date IS NOT NULL AND _next_date::date < (now() AT TIME ZONE 'Africa/Lagos')::date THEN _new_status := 'Defaulting';
  ELSE _new_status := 'On Track'; END IF;

  UPDATE public.clients SET status = _new_status,
        due_date = CASE WHEN _delivered THEN due_date ELSE COALESCE(_next_date, due_date) END,
        updated_at = now()
    WHERE id = _client_id
      AND (status IS DISTINCT FROM _new_status OR (NOT _delivered AND due_date IS DISTINCT FROM COALESCE(_next_date, due_date)));
END;
$function$;