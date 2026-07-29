ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS actor_designation text;

CREATE OR REPLACE FUNCTION public.log_action_with_actor(
  _action text,
  _table_name text,
  _record_id text,
  _actor_name text,
  _actor_designation text,
  _new_data jsonb DEFAULT NULL
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
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_logs (
    user_id, account_id, action, table_name, record_id, new_data, actor_name, actor_designation
  ) VALUES (
    auth.uid(),
    public.get_user_account_id(auth.uid()),
    _action,
    _table_name,
    _record_id,
    _new_data,
    NULLIF(trim(_actor_name), ''),
    NULLIF(trim(_actor_designation), '')
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_action_with_actor(text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_action_with_actor(text, text, text, text, text, jsonb) TO authenticated;