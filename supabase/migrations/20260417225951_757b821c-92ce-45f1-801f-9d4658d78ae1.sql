-- 1. Tighten transfer_requests INSERT to validate source belongs to caller
DROP POLICY IF EXISTS "Officers create transfers" ON public.transfer_requests;
CREATE POLICY "Officers create transfers"
ON public.transfer_requests
FOR INSERT
TO authenticated
WITH CHECK (
  target_account_id = public.get_user_account_id(auth.uid())
  AND target_facility_id = public.get_user_facility_id(auth.uid())
  AND requested_by = auth.uid()
);

-- 2. Prevent privilege escalation: managers cannot assign roles to themselves
DROP POLICY IF EXISTS "Managers manage roles" ON public.user_roles;
CREATE POLICY "Managers manage roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.account_id = public.get_user_account_id(auth.uid())
  )
  AND public.has_any_role(auth.uid(), ARRAY['program_manager'::app_role, 'system_admin'::app_role])
);

DROP POLICY IF EXISTS "Managers update roles" ON public.user_roles;
CREATE POLICY "Managers update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  user_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.account_id = public.get_user_account_id(auth.uid())
  )
  AND public.has_any_role(auth.uid(), ARRAY['program_manager'::app_role, 'system_admin'::app_role])
);

-- 3. Restrict Realtime subscriptions: only authenticated users tied to the topic owner
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive own broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated users can receive own broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Only allow subscribing to topics scoped to the caller's user id or account id
  (realtime.topic() LIKE 'user:' || auth.uid()::text || '%')
  OR (realtime.topic() LIKE 'account:' || public.get_user_account_id(auth.uid())::text || '%')
);