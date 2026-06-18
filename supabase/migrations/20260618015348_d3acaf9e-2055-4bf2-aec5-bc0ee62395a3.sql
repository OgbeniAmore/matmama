
-- 1) Facility roster: health workers per facility (name + designation)
CREATE TABLE IF NOT EXISTS public.facility_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  designation text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS facility_roster_facility_idx ON public.facility_roster(facility_id);
CREATE INDEX IF NOT EXISTS facility_roster_account_idx ON public.facility_roster(account_id);
CREATE INDEX IF NOT EXISTS facility_roster_user_idx ON public.facility_roster(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_roster TO authenticated;
GRANT ALL ON public.facility_roster TO service_role;

ALTER TABLE public.facility_roster ENABLE ROW LEVEL SECURITY;

-- View: anyone within the same account can read (so audit logs can resolve actor designation)
CREATE POLICY "Account members view roster"
  ON public.facility_roster FOR SELECT
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR account_id = public.get_user_account_id(auth.uid())
  );

-- Manage: facility officers (their own facility), PMs (scoped to their LGA), and admins (all)
CREATE POLICY "Facility staff and managers insert roster"
  ON public.facility_roster FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR (
      account_id = public.get_user_account_id(auth.uid())
      AND (
        public.has_role(auth.uid(), 'program_manager'::app_role)
        OR (
          public.has_role(auth.uid(), 'facility_officer'::app_role)
          AND facility_id = public.get_user_facility_id(auth.uid())
        )
      )
    )
  );

CREATE POLICY "Facility staff and managers update roster"
  ON public.facility_roster FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR (
      account_id = public.get_user_account_id(auth.uid())
      AND (
        public.has_role(auth.uid(), 'program_manager'::app_role)
        OR (
          public.has_role(auth.uid(), 'facility_officer'::app_role)
          AND facility_id = public.get_user_facility_id(auth.uid())
        )
      )
    )
  );

CREATE POLICY "Facility staff and managers delete roster"
  ON public.facility_roster FOR DELETE
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR (
      account_id = public.get_user_account_id(auth.uid())
      AND (
        public.has_role(auth.uid(), 'program_manager'::app_role)
        OR (
          public.has_role(auth.uid(), 'facility_officer'::app_role)
          AND facility_id = public.get_user_facility_id(auth.uid())
        )
      )
    )
  );

DROP TRIGGER IF EXISTS update_facility_roster_updated_at ON public.facility_roster;
CREATE TRIGGER update_facility_roster_updated_at
  BEFORE UPDATE ON public.facility_roster
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trail on roster changes
DROP TRIGGER IF EXISTS audit_facility_roster ON public.facility_roster;
CREATE TRIGGER audit_facility_roster
  AFTER INSERT OR UPDATE OR DELETE ON public.facility_roster
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- 2) Broaden audit_logs visibility to every authenticated role (scoped to account)
DROP POLICY IF EXISTS "Admins and managers view audit logs" ON public.audit_logs;

CREATE POLICY "Members view account audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR account_id = public.get_user_account_id(auth.uid())
    OR user_id = auth.uid()
  );
