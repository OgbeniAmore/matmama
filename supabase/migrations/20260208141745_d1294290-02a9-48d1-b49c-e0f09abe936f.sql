
-- ============================================
-- MULTI-TENANT ARCHITECTURE MIGRATION
-- ============================================

-- Clean existing data (fresh start)
DELETE FROM public.patient_reminders;
DELETE FROM public.immunization_records;
DELETE FROM public.anc_visits;
DELETE FROM public.clients;

-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('system_admin', 'program_manager', 'facility_officer', 'data_entry_officer');

-- 2. Accounts table (tenants)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 3. Facilities table
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  ward TEXT,
  local_government TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- 4. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES public.facilities(id),
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Audit logs table (non-editable - no UPDATE/DELETE policies)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  account_id UUID REFERENCES public.accounts(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  device_type TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Add multi-tenant columns to existing tables
ALTER TABLE public.clients
  ADD COLUMN account_id UUID REFERENCES public.accounts(id),
  ADD COLUMN facility_id UUID REFERENCES public.facilities(id);

ALTER TABLE public.immunization_records
  ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.anc_visits
  ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.patient_reminders
  ADD COLUMN account_id UUID REFERENCES public.accounts(id);

-- 8. Security definer functions
CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT account_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_facility_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT facility_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- 9. Drop old RLS policies
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

DROP POLICY IF EXISTS "Authenticated users can delete ANC visits" ON public.anc_visits;
DROP POLICY IF EXISTS "Authenticated users can insert ANC visits" ON public.anc_visits;
DROP POLICY IF EXISTS "Authenticated users can update ANC visits" ON public.anc_visits;
DROP POLICY IF EXISTS "Authenticated users can view ANC visits" ON public.anc_visits;

DROP POLICY IF EXISTS "Authenticated users can insert immunization records" ON public.immunization_records;
DROP POLICY IF EXISTS "Authenticated users can update immunization records" ON public.immunization_records;
DROP POLICY IF EXISTS "Authenticated users can view immunization records" ON public.immunization_records;

DROP POLICY IF EXISTS "Authenticated users can insert reminders" ON public.patient_reminders;
DROP POLICY IF EXISTS "Authenticated users can view reminders" ON public.patient_reminders;

-- 10. New RLS policies

-- ACCOUNTS
CREATE POLICY "Users view own account" ON public.accounts FOR SELECT TO authenticated
  USING (id = public.get_user_account_id(auth.uid()));

-- FACILITIES
CREATE POLICY "Users view facilities in account" ON public.facilities FOR SELECT TO authenticated
  USING (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Managers create facilities" ON public.facilities FOR INSERT TO authenticated
  WITH CHECK (
    account_id = public.get_user_account_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['program_manager', 'system_admin']::app_role[])
  );

CREATE POLICY "Managers update facilities" ON public.facilities FOR UPDATE TO authenticated
  USING (
    account_id = public.get_user_account_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['program_manager', 'system_admin']::app_role[])
  );

-- PROFILES
CREATE POLICY "Users view profiles in account" ON public.profiles FOR SELECT TO authenticated
  USING (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- USER ROLES
CREATE POLICY "View roles" ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.has_any_role(auth.uid(), ARRAY['program_manager', 'system_admin']::app_role[])
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = user_roles.user_id
        AND p.account_id = public.get_user_account_id(auth.uid())
      )
    )
  );

-- CLIENTS (account-scoped with facility filtering for officers)
CREATE POLICY "Users view clients in scope" ON public.clients FOR SELECT TO authenticated
  USING (
    account_id = public.get_user_account_id(auth.uid())
    AND (
      public.has_any_role(auth.uid(), ARRAY['program_manager', 'system_admin']::app_role[])
      OR facility_id = public.get_user_facility_id(auth.uid())
    )
  );

CREATE POLICY "Officers create clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    account_id = public.get_user_account_id(auth.uid())
    AND facility_id = public.get_user_facility_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['facility_officer', 'data_entry_officer', 'program_manager', 'system_admin']::app_role[])
  );

CREATE POLICY "Officers update clients" ON public.clients FOR UPDATE TO authenticated
  USING (
    account_id = public.get_user_account_id(auth.uid())
    AND (
      public.has_any_role(auth.uid(), ARRAY['program_manager', 'system_admin']::app_role[])
      OR facility_id = public.get_user_facility_id(auth.uid())
    )
    AND public.has_any_role(auth.uid(), ARRAY['facility_officer', 'program_manager', 'system_admin']::app_role[])
  );

CREATE POLICY "Officers delete clients" ON public.clients FOR DELETE TO authenticated
  USING (
    account_id = public.get_user_account_id(auth.uid())
    AND (
      public.has_any_role(auth.uid(), ARRAY['program_manager', 'system_admin']::app_role[])
      OR facility_id = public.get_user_facility_id(auth.uid())
    )
    AND public.has_any_role(auth.uid(), ARRAY['facility_officer', 'program_manager', 'system_admin']::app_role[])
  );

-- IMMUNIZATION RECORDS
CREATE POLICY "Users view immunization records" ON public.immunization_records FOR SELECT TO authenticated
  USING (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Officers create immunization records" ON public.immunization_records FOR INSERT TO authenticated
  WITH CHECK (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Officers update immunization records" ON public.immunization_records FOR UPDATE TO authenticated
  USING (
    account_id = public.get_user_account_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['facility_officer', 'program_manager', 'system_admin']::app_role[])
  );

-- ANC VISITS
CREATE POLICY "Users view ANC visits" ON public.anc_visits FOR SELECT TO authenticated
  USING (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Officers create ANC visits" ON public.anc_visits FOR INSERT TO authenticated
  WITH CHECK (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Officers update ANC visits" ON public.anc_visits FOR UPDATE TO authenticated
  USING (
    account_id = public.get_user_account_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['facility_officer', 'program_manager', 'system_admin']::app_role[])
  );

CREATE POLICY "Officers delete ANC visits" ON public.anc_visits FOR DELETE TO authenticated
  USING (
    account_id = public.get_user_account_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['facility_officer', 'program_manager', 'system_admin']::app_role[])
  );

-- PATIENT REMINDERS
CREATE POLICY "Users view reminders" ON public.patient_reminders FOR SELECT TO authenticated
  USING (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Officers create reminders" ON public.patient_reminders FOR INSERT TO authenticated
  WITH CHECK (account_id = public.get_user_account_id(auth.uid()));

-- AUDIT LOGS (read-only for managers - no INSERT/UPDATE/DELETE policies, only triggers can write)
CREATE POLICY "Managers view audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (
    account_id = public.get_user_account_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['program_manager', 'system_admin']::app_role[])
  );

-- 11. Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id::text;
  ELSE
    _record_id := NEW.id::text;
  END IF;

  INSERT INTO public.audit_logs (
    user_id, account_id, action, table_name, record_id, old_data, new_data
  ) VALUES (
    auth.uid(),
    public.get_user_account_id(auth.uid()),
    TG_OP,
    TG_TABLE_NAME,
    _record_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 12. Add audit triggers
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_immunization_records AFTER INSERT OR UPDATE OR DELETE ON public.immunization_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_anc_visits AFTER INSERT OR UPDATE OR DELETE ON public.anc_visits
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_patient_reminders AFTER INSERT OR UPDATE OR DELETE ON public.patient_reminders
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- 13. Timestamp triggers for new tables
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Performance indexes
CREATE INDEX idx_facilities_account_id ON public.facilities(account_id);
CREATE INDEX idx_profiles_account_id ON public.profiles(account_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_facility_id ON public.profiles(facility_id);
CREATE INDEX idx_clients_account_id ON public.clients(account_id);
CREATE INDEX idx_clients_facility_id ON public.clients(facility_id);
CREATE INDEX idx_immunization_records_account_id ON public.immunization_records(account_id);
CREATE INDEX idx_anc_visits_account_id ON public.anc_visits(account_id);
CREATE INDEX idx_patient_reminders_account_id ON public.patient_reminders(account_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_audit_logs_account_id ON public.audit_logs(account_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
