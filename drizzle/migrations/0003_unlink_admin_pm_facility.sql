CREATE OR REPLACE FUNCTION public.enforce_oversight_no_facility()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_any_role(NEW.user_id, ARRAY['system_admin','program_manager']::app_role[]) THEN
    NEW.facility_id := NULL;
    IF public.has_role(NEW.user_id, 'system_admin') THEN NEW.lga := NULL; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_oversight_no_facility() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_oversight_no_facility ON public.profiles;
CREATE TRIGGER trg_oversight_no_facility BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_oversight_no_facility();
UPDATE public.profiles p SET facility_id = NULL,
  lga = CASE WHEN r.role = 'system_admin' THEN NULL ELSE p.lga END
FROM public.user_roles r
WHERE r.user_id = p.user_id AND r.role IN ('system_admin','program_manager') AND (p.facility_id IS NOT NULL OR r.role='system_admin');