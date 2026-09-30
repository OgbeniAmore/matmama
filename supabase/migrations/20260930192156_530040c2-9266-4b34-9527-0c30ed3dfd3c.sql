CREATE TABLE public.growth_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id),
  measured_on date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric(5,2),
  height_cm numeric(5,1),
  notes text,
  recorded_by uuid,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_measurements TO authenticated;
GRANT ALL ON public.growth_measurements TO service_role;
ALTER TABLE public.growth_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm_select" ON public.growth_measurements FOR SELECT TO authenticated USING (public._can_act_on_client(client_id));
CREATE POLICY "gm_insert" ON public.growth_measurements FOR INSERT TO authenticated WITH CHECK (public._can_act_on_client(client_id) AND (weight_kg IS NOT NULL OR height_cm IS NOT NULL));
CREATE POLICY "gm_update" ON public.growth_measurements FOR UPDATE TO authenticated USING (public._can_act_on_client(client_id));
CREATE POLICY "gm_delete" ON public.growth_measurements FOR DELETE TO authenticated USING (public._can_act_on_client(client_id));
CREATE INDEX ON public.growth_measurements(client_id, measured_on);
CREATE TRIGGER gm_updated BEFORE UPDATE ON public.growth_measurements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
GRANT EXECUTE ON FUNCTION public._can_act_on_client(text) TO authenticated;