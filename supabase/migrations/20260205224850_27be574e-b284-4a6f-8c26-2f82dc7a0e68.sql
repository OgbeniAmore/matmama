
-- Create clients table
CREATE TABLE public.clients (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'On Track',
  contact TEXT NOT NULL,
  address TEXT NOT NULL,
  assigned_to TEXT NOT NULL DEFAULT 'System',
  child_name TEXT,
  child_dob DATE,
  trimester INTEGER,
  edd DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients (authenticated users can manage clients)
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
ON public.clients FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete clients"
ON public.clients FOR DELETE
TO authenticated
USING (true);

-- Create patient_reminders table for logging sent reminders
CREATE TABLE public.patient_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on patient_reminders
ALTER TABLE public.patient_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reminders"
ON public.patient_reminders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert reminders"
ON public.patient_reminders FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create immunization_records table
CREATE TABLE public.immunization_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  due_date DATE NOT NULL,
  administered_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending',
  age_weeks INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.immunization_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view immunization records"
ON public.immunization_records FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert immunization records"
ON public.immunization_records FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update immunization records"
ON public.immunization_records FOR UPDATE
TO authenticated
USING (true);

-- Create EPI schedule reference table
CREATE TABLE public.epi_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vaccine_name TEXT NOT NULL,
  age_weeks INTEGER NOT NULL,
  description TEXT
);

ALTER TABLE public.epi_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view EPI schedule"
ON public.epi_schedule FOR SELECT
TO authenticated
USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
