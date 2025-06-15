
-- Create a table to store Nigeria's EPI schedule (fixed version)
CREATE TABLE public.epi_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vaccine_name TEXT NOT NULL,
  age_weeks INTEGER,
  age_months INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert Nigeria's EPI schedule data
INSERT INTO public.epi_schedule (vaccine_name, age_weeks, age_months, description) VALUES
('BCG', 0, 0, 'At birth or first contact'),
('OPV 0', 0, 0, 'At birth'),
('HepB 0', 0, 0, 'At birth'),
('OPV 1', 6, NULL, 'At 6 weeks'),
('Penta 1', 6, NULL, 'At 6 weeks (DPT-HepB-Hib)'),
('PCV 1', 6, NULL, 'At 6 weeks'),
('Rota 1', 6, NULL, 'At 6 weeks'),
('OPV 2', 10, NULL, 'At 10 weeks'),
('Penta 2', 10, NULL, 'At 10 weeks (DPT-HepB-Hib)'),
('PCV 2', 10, NULL, 'At 10 weeks'),
('Rota 2', 10, NULL, 'At 10 weeks'),
('OPV 3', 14, NULL, 'At 14 weeks'),
('Penta 3', 14, NULL, 'At 14 weeks (DPT-HepB-Hib)'),
('PCV 3', 14, NULL, 'At 14 weeks'),
('IPV', 14, NULL, 'At 14 weeks'),
('Measles 1', NULL, 9, 'At 9 months'),
('Yellow Fever', NULL, 9, 'At 9 months'),
('Measles 2', NULL, 15, 'At 15 months');

-- Create a table to track individual immunization records
CREATE TABLE public.immunization_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  administered_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'administered', 'missed', 'rescheduled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add trigger for updated_at
CREATE TRIGGER update_immunization_records_updated_at
BEFORE UPDATE ON public.immunization_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS for immunization records
ALTER TABLE public.immunization_records ENABLE ROW LEVEL SECURITY;

-- Create policies for immunization records (assuming public access for healthcare workers)
CREATE POLICY "Healthcare workers can view immunization records" 
  ON public.immunization_records 
  FOR SELECT 
  USING (true);

CREATE POLICY "Healthcare workers can create immunization records" 
  ON public.immunization_records 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Healthcare workers can update immunization records" 
  ON public.immunization_records 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Healthcare workers can delete immunization records" 
  ON public.immunization_records 
  FOR DELETE 
  USING (true);

-- Enable RLS for EPI schedule (read-only for all)
ALTER TABLE public.epi_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view EPI schedule" 
  ON public.epi_schedule 
  FOR SELECT 
  USING (true);
