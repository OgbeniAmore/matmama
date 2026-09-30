REVOKE EXECUTE ON FUNCTION public._can_act_on_client(text) FROM authenticated;
DROP POLICY "gm_select" ON public.growth_measurements;
DROP POLICY "gm_insert" ON public.growth_measurements;
DROP POLICY "gm_update" ON public.growth_measurements;
DROP POLICY "gm_delete" ON public.growth_measurements;
CREATE POLICY "gm_select" ON public.growth_measurements FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id));
CREATE POLICY "gm_insert" ON public.growth_measurements FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id) AND (weight_kg IS NOT NULL OR height_cm IS NOT NULL));
CREATE POLICY "gm_update" ON public.growth_measurements FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id));
CREATE POLICY "gm_delete" ON public.growth_measurements FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id));