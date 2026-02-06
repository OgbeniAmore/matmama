
-- Create ANC visits table for tracking antenatal care visit schedules
CREATE TABLE public.anc_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  visit_number INTEGER NOT NULL,
  visit_name TEXT NOT NULL,
  gestational_weeks INTEGER NOT NULL,
  scheduled_date DATE NOT NULL,
  actual_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.anc_visits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view ANC visits"
  ON public.anc_visits FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert ANC visits"
  ON public.anc_visits FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update ANC visits"
  ON public.anc_visits FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete ANC visits"
  ON public.anc_visits FOR DELETE USING (true);
