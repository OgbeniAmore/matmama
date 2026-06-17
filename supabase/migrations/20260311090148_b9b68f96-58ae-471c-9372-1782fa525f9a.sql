
CREATE OR REPLACE FUNCTION public.log_auth_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN 'LOGIN'
      ELSE 'AUTH_UPDATE'
    END,
    'auth.users',
    NEW.id::text,
    jsonb_build_object('email', NEW.email, 'last_sign_in_at', NEW.last_sign_in_at)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block auth operations if logging fails
  RETURN NEW;
END;
$$;
