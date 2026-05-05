CREATE OR REPLACE FUNCTION public.log_user_audit_event(
  _action text,
  _table_name text,
  _record_id text,
  _new_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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
$$;