
-- Restrict log_user_audit_event to system_admin only and fail safely
CREATE OR REPLACE FUNCTION public.log_user_audit_event(_action text, _table_name text, _record_id text, _new_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(auth.uid(), 'system_admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: system_admin role required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_logs (user_id, account_id, action, table_name, record_id, new_data)
  VALUES (
    auth.uid(),
    public.get_user_account_id(auth.uid()),
    _action,
    _table_name,
    _record_id,
    _new_data
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;

REVOKE ALL ON FUNCTION public.log_user_audit_event(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_audit_event(text, text, text, jsonb) TO authenticated;

-- Atomic, validated PM reassignment with audit logging
CREATE OR REPLACE FUNCTION public.reassign_program_manager(_lga text, _new_pm_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _previous_pm_ids uuid[];
  _new_is_pm boolean;
  _conflict_count integer;
  _audit_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(auth.uid(), 'system_admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: system_admin role required' USING ERRCODE = '42501';
  END IF;

  IF _lga IS NULL OR length(trim(_lga)) = 0 THEN
    RAISE EXCEPTION 'LGA is required' USING ERRCODE = '22023';
  END IF;

  -- Verify target user is a program_manager
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _new_pm_id AND role = 'program_manager'
  ) INTO _new_is_pm;

  IF NOT _new_is_pm THEN
    RAISE EXCEPTION 'Target user is not a Program Manager' USING ERRCODE = '22023';
  END IF;

  -- Capture existing PM(s) for this LGA (excluding the new one)
  SELECT COALESCE(array_agg(p.user_id), ARRAY[]::uuid[]) INTO _previous_pm_ids
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.lga = _lga
    AND ur.role = 'program_manager'
    AND p.user_id <> _new_pm_id;

  -- Clear existing PM(s) for this LGA
  IF array_length(_previous_pm_ids, 1) > 0 THEN
    UPDATE public.profiles SET lga = NULL WHERE user_id = ANY(_previous_pm_ids);
  END IF;

  -- Re-validate (defence-in-depth) the one-PM-per-LGA invariant
  SELECT count(*) INTO _conflict_count
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.lga = _lga
    AND ur.role = 'program_manager'
    AND p.user_id <> _new_pm_id;

  IF _conflict_count > 0 THEN
    RAISE EXCEPTION 'A Program Manager is already assigned to LGA %', _lga
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Assign the new PM
  UPDATE public.profiles SET lga = _lga WHERE user_id = _new_pm_id;

  -- Audit event (only after successful update)
  INSERT INTO public.audit_logs (user_id, account_id, action, table_name, record_id, new_data)
  VALUES (
    auth.uid(),
    public.get_user_account_id(auth.uid()),
    'REASSIGN_PROGRAM_MANAGER',
    'profiles',
    _new_pm_id::text,
    jsonb_build_object(
      'lga', _lga,
      'previous_pm_ids', _previous_pm_ids,
      'new_pm_id', _new_pm_id
    )
  ) RETURNING id INTO _audit_id;

  RETURN jsonb_build_object(
    'success', true,
    'lga', _lga,
    'new_pm_id', _new_pm_id,
    'previous_pm_ids', _previous_pm_ids,
    'audit_id', _audit_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reassign_program_manager(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reassign_program_manager(text, uuid) TO authenticated;
