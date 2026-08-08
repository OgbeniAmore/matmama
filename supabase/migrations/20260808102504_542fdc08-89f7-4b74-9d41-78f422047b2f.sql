-- 1. Revoke EXECUTE from anon on all public functions (none are meant for signed-out callers)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, PUBLIC', r.sig);
  END LOOP;
END $$;

-- 2. Harden SECURITY DEFINER RPCs callable by authenticated users
CREATE OR REPLACE FUNCTION public.resync_client_status(_client_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _service text;
  _next_date timestamptz;
  _pending_count integer;
  _total integer;
  _new_status text;
  _client_account uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT service, account_id INTO _service, _client_account
    FROM public.clients WHERE id = _client_id;
  IF _service IS NULL THEN RETURN; END IF;

  -- Only allow acting on clients within the caller's own account (system admins: any)
  IF NOT public.has_role(auth.uid(), 'system_admin'::app_role)
     AND _client_account IS DISTINCT FROM public.get_user_account_id(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied for this client' USING ERRCODE = '42501';
  END IF;

  IF _service = 'Ante Natal Care' THEN
    SELECT count(*) FILTER (WHERE status IN ('Pending','Missed')),
           count(*),
           min(scheduled_date) FILTER (WHERE status IN ('Pending','Missed'))
      INTO _pending_count, _total, _next_date
      FROM public.anc_visits WHERE client_id = _client_id;
  ELSIF _service = 'Routine Immunization' THEN
    SELECT count(*) FILTER (WHERE status IN ('Pending','Missed')),
           count(*),
           min(due_date) FILTER (WHERE status IN ('Pending','Missed'))
      INTO _pending_count, _total, _next_date
      FROM public.immunization_records WHERE client_id = _client_id;
  ELSE
    RETURN;
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
$function$;

CREATE OR REPLACE FUNCTION public.auto_resync_clients()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id text;
  _count integer := 0;
  _is_admin boolean;
  _account uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_any_role(auth.uid(),
      ARRAY['facility_officer','program_manager','system_admin']::app_role[]) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  _is_admin := public.has_role(auth.uid(), 'system_admin'::app_role);
  _account := public.get_user_account_id(auth.uid());

  FOR _id IN
    SELECT id FROM public.clients
    WHERE service IN ('Ante Natal Care','Routine Immunization')
      AND status IN ('Defaulting','On Track')
      AND (_is_admin OR account_id = _account)
  LOOP
    PERFORM public.resync_client_status(_id);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$function$;

-- 3. Validate client_id ownership (not just account_id) on child tables
DROP POLICY IF EXISTS "Officers create ANC visits" ON public.anc_visits;
CREATE POLICY "Officers create ANC visits" ON public.anc_visits
FOR INSERT TO authenticated
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = anc_visits.client_id
      AND c.account_id = public.get_user_account_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Officers update ANC visits" ON public.anc_visits;
CREATE POLICY "Officers update ANC visits" ON public.anc_visits
FOR UPDATE TO authenticated
USING (
  account_id = public.get_user_account_id(auth.uid())
  AND public.has_any_role(auth.uid(), ARRAY['facility_officer','program_manager','system_admin']::app_role[])
)
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = anc_visits.client_id
      AND c.account_id = public.get_user_account_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Officers create immunization records" ON public.immunization_records;
CREATE POLICY "Officers create immunization records" ON public.immunization_records
FOR INSERT TO authenticated
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = immunization_records.client_id
      AND c.account_id = public.get_user_account_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Officers update immunization records" ON public.immunization_records;
CREATE POLICY "Officers update immunization records" ON public.immunization_records
FOR UPDATE TO authenticated
USING (
  account_id = public.get_user_account_id(auth.uid())
  AND public.has_any_role(auth.uid(), ARRAY['facility_officer','program_manager','system_admin']::app_role[])
)
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = immunization_records.client_id
      AND c.account_id = public.get_user_account_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Officers create reminders" ON public.patient_reminders;
CREATE POLICY "Officers create reminders" ON public.patient_reminders
FOR INSERT TO authenticated
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = patient_reminders.patient_id
      AND c.account_id = public.get_user_account_id(auth.uid())
  )
);

-- 4. Narrow reminder reads (and therefore realtime events) to facility scope
DROP POLICY IF EXISTS "Users view reminders" ON public.patient_reminders;
CREATE POLICY "Users view reminders" ON public.patient_reminders
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'system_admin'::app_role)
  OR (
    account_id = public.get_user_account_id(auth.uid())
    AND (
      -- Program managers: any client facility inside their LGA
      (
        public.has_role(auth.uid(), 'program_manager'::app_role)
        AND EXISTS (
          SELECT 1 FROM public.clients c
          JOIN public.facilities f ON f.id = c.facility_id
          WHERE c.id = patient_reminders.patient_id
            AND f.lga = public.get_user_lga(auth.uid())
        )
      )
      -- Facility-assigned staff: only their own facility's clients
      OR (
        public.get_user_facility_id(auth.uid()) IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id = patient_reminders.patient_id
            AND c.facility_id = public.get_user_facility_id(auth.uid())
        )
      )
      -- Staff without a facility assignment keep account-level visibility
      OR (
        public.get_user_facility_id(auth.uid()) IS NULL
        AND NOT public.has_role(auth.uid(), 'program_manager'::app_role)
      )
    )
  )
);

-- 5. Controlled profile creation
DROP POLICY IF EXISTS "Managers create team profiles" ON public.profiles;
CREATE POLICY "Managers create team profiles" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['program_manager','system_admin']::app_role[])
  AND (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR account_id = public.get_user_account_id(auth.uid())
  )
);

-- Restore intended grants after the blanket anon revoke
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_account_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_facility_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_lga(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_action_with_actor(text, text, text, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_user_audit_event(text, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reassign_program_manager(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resync_client_status(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_resync_clients() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_detect_defaulters() TO service_role;
GRANT EXECUTE ON FUNCTION public.audit_log_trigger() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_transfer_approval() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_transfer_event() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_auth_event() TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_one_pm_per_lga() TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_one_pm_per_lga_on_role() TO service_role;