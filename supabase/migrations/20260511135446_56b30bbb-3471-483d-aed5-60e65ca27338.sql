
CREATE TABLE public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  service text NOT NULL CHECK (service IN ('Routine Immunization','Family Planning','Ante Natal Care')),
  category text NOT NULL CHECK (category IN ('upcoming','defaulter','manual')),
  body text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, service, category)
);

CREATE INDEX idx_sms_templates_account ON public.sms_templates(account_id);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view templates in scope"
ON public.sms_templates FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'system_admin'::app_role)
  OR account_id = public.get_user_account_id(auth.uid())
);

CREATE POLICY "Managers insert templates"
ON public.sms_templates FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'system_admin'::app_role)
  OR (
    account_id = public.get_user_account_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['program_manager'::app_role,'system_admin'::app_role])
  )
);

CREATE POLICY "Managers update templates"
ON public.sms_templates FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'system_admin'::app_role)
  OR (
    account_id = public.get_user_account_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['program_manager'::app_role,'system_admin'::app_role])
  )
);

CREATE POLICY "Managers delete templates"
ON public.sms_templates FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'system_admin'::app_role)
  OR (
    account_id = public.get_user_account_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['program_manager'::app_role,'system_admin'::app_role])
  )
);

CREATE TRIGGER sms_templates_updated_at
BEFORE UPDATE ON public.sms_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
