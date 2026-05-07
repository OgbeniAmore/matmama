-- Replace the profiles SELECT policy so PMs can see team members whose facility belongs to their LGA
DROP POLICY IF EXISTS "Users view profiles in scope" ON public.profiles;

CREATE POLICY "Users view profiles in scope"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role)
  OR (user_id = auth.uid())
  OR (
    has_role(auth.uid(), 'program_manager'::app_role)
    AND (
      lga IS NULL
      OR lga = get_user_lga(auth.uid())
      OR facility_id IN (
        SELECT id FROM public.facilities WHERE lga = get_user_lga(auth.uid())
      )
    )
  )
  OR (
    account_id = get_user_account_id(auth.uid())
    AND has_role(auth.uid(), 'program_manager'::app_role) = false
  )
);