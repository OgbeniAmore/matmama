CREATE TABLE public.anc_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  anc_visit_id uuid REFERENCES public.anc_visits(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id),
  facility_id uuid REFERENCES public.facilities(id),
  measured_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'Africa/Lagos')::date),
  gestational_weeks integer,
  systolic_bp integer,
  diastolic_bp integer,
  fundal_height_cm numeric,
  fetal_heart_rate_bpm integer,
  urine_protein text,
  urine_glucose text,
  weight_kg numeric,
  hemoglobin_g_dl numeric,
  risk_level text NOT NULL DEFAULT 'normal',
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  recorded_by uuid,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT anc_vitals_risk_level_chk CHECK (risk_level IN ('normal','moderate','high','critical')),
  CONSTRAINT anc_vitals_urine_chk CHECK (
    (urine_protein IS NULL OR urine_protein IN ('negative','trace','1+','2+','3+','4+')) AND
    (urine_glucose IS NULL OR urine_glucose IN ('negative','trace','1+','2+','3+','4+'))),
  CONSTRAINT anc_vitals_ranges_chk CHECK (
    (systolic_bp IS NULL OR systolic_bp BETWEEN 50 AND 260) AND
    (diastolic_bp IS NULL OR diastolic_bp BETWEEN 30 AND 180) AND
    (fetal_heart_rate_bpm IS NULL OR fetal_heart_rate_bpm BETWEEN 50 AND 240) AND
    (fundal_height_cm IS NULL OR fundal_height_cm BETWEEN 5 AND 60) AND
    (weight_kg IS NULL OR weight_kg BETWEEN 25 AND 250) AND
    (hemoglobin_g_dl IS NULL OR hemoglobin_g_dl BETWEEN 2 AND 22))
);
CREATE INDEX anc_vitals_client_idx ON public.anc_vitals(client_id, measured_on DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anc_vitals TO authenticated;
GRANT ALL ON public.anc_vitals TO service_role;
ALTER TABLE public.anc_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View vitals for accessible clients" ON public.anc_vitals FOR SELECT TO authenticated
  USING (public._can_act_on_client(client_id));
CREATE POLICY "Record vitals for accessible clients" ON public.anc_vitals FOR INSERT TO authenticated
  WITH CHECK (public._can_act_on_client(client_id) AND recorded_by = auth.uid());
CREATE POLICY "Update vitals for accessible clients" ON public.anc_vitals FOR UPDATE TO authenticated
  USING (public._can_act_on_client(client_id)) WITH CHECK (public._can_act_on_client(client_id));
CREATE POLICY "Managers delete vitals" ON public.anc_vitals FOR DELETE TO authenticated
  USING (public._can_act_on_client(client_id) AND public.has_any_role(auth.uid(), ARRAY['facility_officer','program_manager','system_admin']::app_role[]));

CREATE OR REPLACE FUNCTION public.anc_vitals_fill_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  SELECT account_id, facility_id INTO NEW.account_id, NEW.facility_id FROM public.clients WHERE id = NEW.client_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.anc_vitals_fill_tenant() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER anc_vitals_tenant BEFORE INSERT OR UPDATE ON public.anc_vitals FOR EACH ROW EXECUTE FUNCTION public.anc_vitals_fill_tenant();
CREATE TRIGGER anc_vitals_updated BEFORE UPDATE ON public.anc_vitals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_anc_vitals AFTER INSERT OR UPDATE OR DELETE ON public.anc_vitals FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();