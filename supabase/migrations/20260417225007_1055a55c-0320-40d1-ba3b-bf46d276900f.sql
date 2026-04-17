CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Account setup is handled by the setup-account edge function.
  -- This trigger is intentionally a no-op to avoid stale schema references.
  RETURN NEW;
END;
$$;