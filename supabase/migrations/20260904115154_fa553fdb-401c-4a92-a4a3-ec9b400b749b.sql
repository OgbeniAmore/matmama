DROP POLICY IF EXISTS "Account members view roster" ON public.facility_roster;
DROP POLICY IF EXISTS "Facility staff and managers insert roster" ON public.facility_roster;
DROP POLICY IF EXISTS "Facility staff and managers update roster" ON public.facility_roster;
DROP POLICY IF EXISTS "Facility staff and managers delete roster" ON public.facility_roster;

CREATE POLICY "Account members view roster"
ON public.facility_roster FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'system_admin'::app_role)
  OR account_id = public.get_user_account_id(auth.uid())
);

CREATE POLICY "Facility staff and managers insert roster"
ON public.facility_roster FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'system_admin'::app_role)
  OR (
    account_id = public.get_user_account_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'program_manager'::app_role)
      OR (public.has_role(auth.uid(), 'facility_officer'::app_role)
          AND facility_id = public.get_user_facility_id(auth.uid()))
    )
  )
);

CREATE POLICY "Facility staff and managers update roster"
ON public.facility_roster FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'system_admin'::app_role)
  OR (
    account_id = public.get_user_account_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'program_manager'::app_role)
      OR (public.has_role(auth.uid(), 'facility_officer'::app_role)
          AND facility_id = public.get_user_facility_id(auth.uid()))
    )
  )
);

CREATE POLICY "Facility staff and managers delete roster"
ON public.facility_roster FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'system_admin'::app_role)
  OR (
    account_id = public.get_user_account_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'program_manager'::app_role)
      OR (public.has_role(auth.uid(), 'facility_officer'::app_role)
          AND facility_id = public.get_user_facility_id(auth.uid()))
    )
  )
);

REVOKE EXECUTE ON FUNCTION public.log_user_audit_event(text, text, text, jsonb) FROM authenticated;