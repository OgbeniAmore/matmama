UPDATE public.immunization_records r SET account_id = c.account_id FROM public.clients c WHERE c.id = r.client_id AND r.account_id IS DISTINCT FROM c.account_id;
UPDATE public.anc_visits r SET account_id = c.account_id FROM public.clients c WHERE c.id = r.client_id AND r.account_id IS DISTINCT FROM c.account_id;

CREATE OR REPLACE FUNCTION public.cascade_client_account() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.account_id IS DISTINCT FROM OLD.account_id THEN
    UPDATE public.immunization_records SET account_id = NEW.account_id WHERE client_id = NEW.id;
    UPDATE public.anc_visits SET account_id = NEW.account_id WHERE client_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.cascade_client_account() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS cascade_client_account ON public.clients;
CREATE TRIGGER cascade_client_account AFTER UPDATE OF account_id ON public.clients FOR EACH ROW EXECUTE FUNCTION public.cascade_client_account();

DROP POLICY IF EXISTS "Officers update immunization records" ON public.immunization_records;
CREATE POLICY "Officers update immunization records" ON public.immunization_records FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'system_admin'::app_role) OR ((account_id = get_user_account_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['facility_officer'::app_role,'program_manager'::app_role])))
WITH CHECK (has_role(auth.uid(),'system_admin'::app_role) OR ((account_id = get_user_account_id(auth.uid())) AND EXISTS (SELECT 1 FROM clients c WHERE c.id = immunization_records.client_id AND c.account_id = get_user_account_id(auth.uid()))));

DROP POLICY IF EXISTS "Officers update ANC visits" ON public.anc_visits;
CREATE POLICY "Officers update ANC visits" ON public.anc_visits FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'system_admin'::app_role) OR ((account_id = get_user_account_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['facility_officer'::app_role,'program_manager'::app_role])))
WITH CHECK (has_role(auth.uid(),'system_admin'::app_role) OR ((account_id = get_user_account_id(auth.uid())) AND EXISTS (SELECT 1 FROM clients c WHERE c.id = anc_visits.client_id AND c.account_id = get_user_account_id(auth.uid()))));