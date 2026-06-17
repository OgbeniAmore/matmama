
-- Drop the overly permissive insert policy and replace with a restricted one
DROP POLICY "System inserts notifications" ON public.notifications;

-- Only allow insert if the notification is for the inserting user (self-notifications won't happen,
-- but the SECURITY DEFINER trigger bypasses RLS anyway, so no INSERT policy needed for the trigger).
-- This effectively blocks direct client inserts while the trigger still works.
