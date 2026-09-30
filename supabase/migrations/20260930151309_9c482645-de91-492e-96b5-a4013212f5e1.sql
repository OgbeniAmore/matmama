ALTER TABLE public.transfer_requests
  ADD COLUMN IF NOT EXISTS transfer_type text NOT NULL DEFAULT 'permanent',
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS share_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.validate_transfer_request()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.transfer_type NOT IN ('permanent','temporary') THEN
    RAISE EXCEPTION 'Invalid transfer type';
  END IF;
  IF NEW.transfer_type = 'temporary' AND NEW.share_expires_at IS NULL THEN
    RAISE EXCEPTION 'Temporary shares need an end date';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.transfer_type = 'temporary' AND NEW.share_expires_at <= now() THEN
    RAISE EXCEPTION 'Share end date must be in the future';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS validate_transfer_request_trg ON public.transfer_requests;
CREATE TRIGGER validate_transfer_request_trg BEFORE INSERT OR UPDATE ON public.transfer_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_transfer_request();

CREATE OR REPLACE FUNCTION public.handle_transfer_approval()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' AND NEW.transfer_type = 'permanent' THEN
    UPDATE public.clients
    SET facility_id = NEW.target_facility_id,
        account_id = NEW.target_account_id,
        updated_at = now()
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_client_shared_with_user(_client_id text, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.transfer_requests t
    WHERE t.client_id = _client_id
      AND t.transfer_type = 'temporary'
      AND t.status = 'approved'
      AND t.share_expires_at > now()
      AND t.target_facility_id = public.get_user_facility_id(_user_id)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_client_shared_with_user(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_client_shared_with_user(text, uuid) TO authenticated;

CREATE POLICY "Shared facility views client" ON public.clients FOR SELECT TO authenticated
USING (public.is_client_shared_with_user(id, auth.uid()));
CREATE POLICY "Shared facility views ANC visits" ON public.anc_visits FOR SELECT TO authenticated
USING (public.is_client_shared_with_user(client_id, auth.uid()));
CREATE POLICY "Shared facility views immunizations" ON public.immunization_records FOR SELECT TO authenticated
USING (public.is_client_shared_with_user(client_id, auth.uid()));