
-- Table for pending invitations
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'data_entry_officer',
  facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE (account_id, email)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Managers can view invitations in their account
CREATE POLICY "Managers view invitations"
ON public.invitations FOR SELECT TO authenticated
USING (
  account_id = public.get_user_account_id(auth.uid())
  AND public.has_any_role(auth.uid(), ARRAY['program_manager'::public.app_role, 'system_admin'::public.app_role])
);

-- Managers can create invitations
CREATE POLICY "Managers create invitations"
ON public.invitations FOR INSERT TO authenticated
WITH CHECK (
  account_id = public.get_user_account_id(auth.uid())
  AND public.has_any_role(auth.uid(), ARRAY['program_manager'::public.app_role, 'system_admin'::public.app_role])
);

-- Managers can update invitations (e.g. revoke)
CREATE POLICY "Managers update invitations"
ON public.invitations FOR UPDATE TO authenticated
USING (
  account_id = public.get_user_account_id(auth.uid())
  AND public.has_any_role(auth.uid(), ARRAY['program_manager'::public.app_role, 'system_admin'::public.app_role])
);

-- Managers can delete invitations
CREATE POLICY "Managers delete invitations"
ON public.invitations FOR DELETE TO authenticated
USING (
  account_id = public.get_user_account_id(auth.uid())
  AND public.has_any_role(auth.uid(), ARRAY['program_manager'::public.app_role, 'system_admin'::public.app_role])
);

-- Allow managers to manage roles within their account
CREATE POLICY "Managers manage roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
    AND p.account_id = public.get_user_account_id(auth.uid())
  )
  AND public.has_any_role(auth.uid(), ARRAY['program_manager'::public.app_role, 'system_admin'::public.app_role])
);

CREATE POLICY "Managers update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
    AND p.account_id = public.get_user_account_id(auth.uid())
  )
  AND public.has_any_role(auth.uid(), ARRAY['program_manager'::public.app_role, 'system_admin'::public.app_role])
);

-- Allow managers to update facility assignments for profiles in their account
CREATE POLICY "Managers update team profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  account_id = public.get_user_account_id(auth.uid())
  AND public.has_any_role(auth.uid(), ARRAY['program_manager'::public.app_role, 'system_admin'::public.app_role])
);
