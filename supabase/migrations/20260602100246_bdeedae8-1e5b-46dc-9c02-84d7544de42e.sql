-- 1. Trigger-only / admin-only SECURITY DEFINER functions: lock down to service_role.
DO $$
DECLARE
  fn text;
  trigger_only text[] := ARRAY[
    'handle_new_user()',
    'log_auth_event()',
    'notify_transfer_event()',
    'handle_transfer_approval()',
    'update_updated_at_column()',
    'audit_log_trigger()',
    'enforce_one_pm_per_lga()',
    'enforce_one_pm_per_lga_on_role()',
    'auto_detect_defaulters()'
  ];
BEGIN
  FOREACH fn IN ARRAY trigger_only LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
  END LOOP;
END $$;

-- 2. RLS helpers: anon revoked, authenticated kept (RLS evaluation needs it).
DO $$
DECLARE
  fn text;
  rls_helpers text[] := ARRAY[
    'has_role(uuid, app_role)',
    'has_any_role(uuid, app_role[])',
    'get_user_account_id(uuid)',
    'get_user_facility_id(uuid)',
    'get_user_lga(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY rls_helpers LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- 3. Admin RPCs (self-check role inside the function).
DO $$
DECLARE
  fn text;
  admin_rpcs text[] := ARRAY[
    'log_user_audit_event(text, text, text, jsonb)',
    'reassign_program_manager(text, uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY admin_rpcs LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- 4. Move pg_net out of public. pg_net does not support ALTER ... SET SCHEMA,
--    so drop and recreate it in the extensions schema. pg_net always provisions
--    its own `net` schema for callable functions, so existing cron jobs and
--    edge-function callers using net.http_post() continue to work.
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;