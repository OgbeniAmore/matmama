-- 1. Add lga column to facilities and profiles
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS lga text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lga text;

-- 2. Helper: get user's LGA
CREATE OR REPLACE FUNCTION public.get_user_lga(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lga FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 3. Trigger to enforce one program_manager per LGA
CREATE OR REPLACE FUNCTION public.enforce_one_pm_per_lga()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_pm boolean;
  conflict_count integer;
BEGIN
  IF NEW.lga IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'program_manager'
  ) INTO is_pm;

  IF NOT is_pm THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO conflict_count
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.lga = NEW.lga
    AND p.user_id <> NEW.user_id
    AND ur.role = 'program_manager';

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'A Program Manager is already assigned to LGA %', NEW.lga
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_one_pm_per_lga_trg ON public.profiles;
CREATE TRIGGER enforce_one_pm_per_lga_trg
BEFORE INSERT OR UPDATE OF lga ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_one_pm_per_lga();

-- Also enforce when a user_role is changed to program_manager
CREATE OR REPLACE FUNCTION public.enforce_one_pm_per_lga_on_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_lga text;
  conflict_count integer;
BEGIN
  IF NEW.role <> 'program_manager' THEN
    RETURN NEW;
  END IF;

  SELECT lga INTO user_lga FROM public.profiles WHERE user_id = NEW.user_id;
  IF user_lga IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO conflict_count
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.lga = user_lga
    AND p.user_id <> NEW.user_id
    AND ur.role = 'program_manager';

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'A Program Manager is already assigned to LGA %', user_lga
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_one_pm_per_lga_role_trg ON public.user_roles;
CREATE TRIGGER enforce_one_pm_per_lga_role_trg
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_one_pm_per_lga_on_role();

-- 4. RLS: clients
DROP POLICY IF EXISTS "Users view clients in scope" ON public.clients;
CREATE POLICY "Users view clients in scope" ON public.clients
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR (
    account_id = get_user_account_id(auth.uid())
    AND (
      (has_role(auth.uid(), 'program_manager') AND facility_id IN (
        SELECT id FROM public.facilities WHERE lga = get_user_lga(auth.uid())
      ))
      OR facility_id = get_user_facility_id(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Officers update clients" ON public.clients;
CREATE POLICY "Officers update clients" ON public.clients
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR (
    account_id = get_user_account_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['facility_officer'::app_role, 'program_manager'::app_role])
    AND (
      (has_role(auth.uid(), 'program_manager') AND facility_id IN (
        SELECT id FROM public.facilities WHERE lga = get_user_lga(auth.uid())
      ))
      OR facility_id = get_user_facility_id(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Officers delete clients" ON public.clients;
CREATE POLICY "Officers delete clients" ON public.clients
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR (
    account_id = get_user_account_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['facility_officer'::app_role, 'program_manager'::app_role])
    AND (
      (has_role(auth.uid(), 'program_manager') AND facility_id IN (
        SELECT id FROM public.facilities WHERE lga = get_user_lga(auth.uid())
      ))
      OR facility_id = get_user_facility_id(auth.uid())
    )
  )
);

-- 5. RLS: facilities
DROP POLICY IF EXISTS "Users view facilities in account" ON public.facilities;
DROP POLICY IF EXISTS "Users view facilities in scope" ON public.facilities;
CREATE POLICY "Users view facilities in scope" ON public.facilities
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR (
    account_id = get_user_account_id(auth.uid())
    AND (
      has_role(auth.uid(), 'program_manager') = false
      OR lga IS NULL
      OR lga = get_user_lga(auth.uid())
    )
  )
);

-- 6. RLS: profiles
DROP POLICY IF EXISTS "Users view profiles in account" ON public.profiles;
DROP POLICY IF EXISTS "Users view profiles in scope" ON public.profiles;
CREATE POLICY "Users view profiles in scope" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR user_id = auth.uid()
  OR (
    account_id = get_user_account_id(auth.uid())
    AND (
      has_role(auth.uid(), 'program_manager') = false
      OR lga IS NULL
      OR lga = get_user_lga(auth.uid())
    )
  )
);

-- 7. RLS: user_roles
DROP POLICY IF EXISTS "View roles" ON public.user_roles;
CREATE POLICY "View roles" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'system_admin')
  OR (
    has_role(auth.uid(), 'program_manager')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.account_id = get_user_account_id(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Managers manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  user_id <> auth.uid()
  AND (
    has_role(auth.uid(), 'system_admin')
    OR (
      has_role(auth.uid(), 'program_manager')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = user_roles.user_id
          AND p.account_id = get_user_account_id(auth.uid())
      )
    )
  )
);

DROP POLICY IF EXISTS "Managers update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins update roles" ON public.user_roles;
CREATE POLICY "Admins update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (
  user_id <> auth.uid()
  AND (
    has_role(auth.uid(), 'system_admin')
    OR (
      has_role(auth.uid(), 'program_manager')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = user_roles.user_id
          AND p.account_id = get_user_account_id(auth.uid())
      )
    )
  )
);

-- 8. audit_logs
DROP POLICY IF EXISTS "Managers view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins and managers view audit logs" ON public.audit_logs;
CREATE POLICY "Admins and managers view audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR (
    account_id = get_user_account_id(auth.uid())
    AND has_role(auth.uid(), 'program_manager')
  )
);

-- 9. patient_reminders
DROP POLICY IF EXISTS "Users view reminders" ON public.patient_reminders;
CREATE POLICY "Users view reminders" ON public.patient_reminders
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR account_id = get_user_account_id(auth.uid())
);

-- 10. anc_visits
DROP POLICY IF EXISTS "Users view ANC visits" ON public.anc_visits;
CREATE POLICY "Users view ANC visits" ON public.anc_visits
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR account_id = get_user_account_id(auth.uid())
);

-- 11. immunization_records
DROP POLICY IF EXISTS "Users view immunization records" ON public.immunization_records;
CREATE POLICY "Users view immunization records" ON public.immunization_records
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR account_id = get_user_account_id(auth.uid())
);

-- 12. invitations
DROP POLICY IF EXISTS "Managers view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins and managers view invitations" ON public.invitations;
CREATE POLICY "Admins and managers view invitations" ON public.invitations
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR (
    account_id = get_user_account_id(auth.uid())
    AND has_role(auth.uid(), 'program_manager')
  )
);

DROP POLICY IF EXISTS "Managers create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins and managers create invitations" ON public.invitations;
CREATE POLICY "Admins and managers create invitations" ON public.invitations
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'system_admin')
  OR (
    account_id = get_user_account_id(auth.uid())
    AND has_role(auth.uid(), 'program_manager')
  )
);

DROP POLICY IF EXISTS "Managers update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins and managers update invitations" ON public.invitations;
CREATE POLICY "Admins and managers update invitations" ON public.invitations
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR (
    account_id = get_user_account_id(auth.uid())
    AND has_role(auth.uid(), 'program_manager')
  )
);

DROP POLICY IF EXISTS "Managers delete invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins and managers delete invitations" ON public.invitations;
CREATE POLICY "Admins and managers delete invitations" ON public.invitations
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR (
    account_id = get_user_account_id(auth.uid())
    AND has_role(auth.uid(), 'program_manager')
  )
);

-- 13. accounts
DROP POLICY IF EXISTS "Users view own account" ON public.accounts;
CREATE POLICY "Users view own account" ON public.accounts
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'system_admin')
  OR id = get_user_account_id(auth.uid())
);