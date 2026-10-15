DROP POLICY IF EXISTS "Officers update ANC visits" ON public.anc_visits;
CREATE POLICY "Officers update ANC visits" ON public.anc_visits FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'facility_officer')
  AND (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = anc_visits.client_id
        AND c.account_id = public.get_user_account_id(auth.uid())
        AND c.facility_id = public.get_user_facility_id(auth.uid()))
       OR public.is_client_shared_with_user(client_id, auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'facility_officer')
  AND (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = anc_visits.client_id
        AND c.account_id = public.get_user_account_id(auth.uid())
        AND c.facility_id = public.get_user_facility_id(auth.uid()))
       OR public.is_client_shared_with_user(client_id, auth.uid()))
);

DROP POLICY IF EXISTS "Officers update immunization records" ON public.immunization_records;
CREATE POLICY "Officers update immunization records" ON public.immunization_records FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'facility_officer')
  AND (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = immunization_records.client_id
        AND c.account_id = public.get_user_account_id(auth.uid())
        AND c.facility_id = public.get_user_facility_id(auth.uid()))
       OR public.is_client_shared_with_user(client_id, auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'facility_officer')
  AND (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = immunization_records.client_id
        AND c.account_id = public.get_user_account_id(auth.uid())
        AND c.facility_id = public.get_user_facility_id(auth.uid()))
       OR public.is_client_shared_with_user(client_id, auth.uid()))
);

DROP POLICY IF EXISTS "View vitals for accessible clients" ON public.anc_vitals;
CREATE POLICY "View vitals for accessible clients" ON public.anc_vitals FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'system_admin')
  OR (public.has_role(auth.uid(), 'program_manager') AND EXISTS (
        SELECT 1 FROM public.facilities f WHERE f.id = anc_vitals.facility_id
        AND f.lga = public.get_user_lga(auth.uid())))
  OR (account_id = public.get_user_account_id(auth.uid())
      AND facility_id = public.get_user_facility_id(auth.uid()))
  OR public.is_client_shared_with_user(client_id, auth.uid())
);

DROP POLICY IF EXISTS "Record vitals for accessible clients" ON public.anc_vitals;
CREATE POLICY "Record vitals for accessible clients" ON public.anc_vitals FOR INSERT TO authenticated
WITH CHECK (
  recorded_by = auth.uid()
  AND public.has_any_role(auth.uid(), ARRAY['facility_officer','data_entry_officer']::app_role[])
  AND (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = anc_vitals.client_id
        AND c.account_id = public.get_user_account_id(auth.uid())
        AND c.facility_id = public.get_user_facility_id(auth.uid()))
       OR public.is_client_shared_with_user(client_id, auth.uid()))
);

DROP POLICY IF EXISTS "Update vitals for accessible clients" ON public.anc_vitals;
CREATE POLICY "Update vitals for accessible clients" ON public.anc_vitals FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'facility_officer')
  AND facility_id = public.get_user_facility_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'facility_officer')
  AND facility_id = public.get_user_facility_id(auth.uid())
);

DROP POLICY IF EXISTS "Managers delete vitals" ON public.anc_vitals;
CREATE POLICY "Managers delete vitals" ON public.anc_vitals FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'facility_officer')
  AND facility_id = public.get_user_facility_id(auth.uid())
);