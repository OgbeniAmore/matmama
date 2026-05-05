REVOKE EXECUTE ON FUNCTION public.log_user_audit_event(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_user_audit_event(text, text, text, jsonb) TO authenticated;