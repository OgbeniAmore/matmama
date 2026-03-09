
-- Add unique identifier columns to clients table
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS lasraa_id TEXT,
  ADD COLUMN IF NOT EXISTS nin_id TEXT,
  ADD COLUMN IF NOT EXISTS system_id TEXT;

-- Create unique indexes for the identifiers (partial - only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_lasraa_id ON public.clients(lasraa_id) WHERE lasraa_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_nin_id ON public.clients(nin_id) WHERE nin_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_system_id ON public.clients(system_id) WHERE system_id IS NOT NULL;

-- Create transfer_requests table
CREATE TABLE public.transfer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  source_facility_id UUID NOT NULL REFERENCES public.facilities(id),
  source_account_id UUID NOT NULL REFERENCES public.accounts(id),
  target_facility_id UUID NOT NULL REFERENCES public.facilities(id),
  target_account_id UUID NOT NULL REFERENCES public.accounts(id),
  requested_by UUID NOT NULL,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;

-- Users can view transfer requests involving their facility
CREATE POLICY "Users view relevant transfers" ON public.transfer_requests
  FOR SELECT TO authenticated
  USING (
    target_account_id = get_user_account_id(auth.uid()) OR 
    source_account_id = get_user_account_id(auth.uid())
  );

-- Officers can create transfer requests
CREATE POLICY "Officers create transfers" ON public.transfer_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    target_account_id = get_user_account_id(auth.uid()) AND
    target_facility_id = get_user_facility_id(auth.uid())
  );

-- Managers at source facility can approve/reject
CREATE POLICY "Managers update transfers" ON public.transfer_requests
  FOR UPDATE TO authenticated
  USING (
    source_account_id = get_user_account_id(auth.uid()) AND
    has_any_role(auth.uid(), ARRAY['program_manager'::app_role, 'system_admin'::app_role, 'facility_officer'::app_role])
  );
