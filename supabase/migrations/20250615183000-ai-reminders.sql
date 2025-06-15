
-- Create a table to log AI reminder activities
CREATE TABLE public.patient_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('sms', 'whatsapp', 'email', 'call')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_patient_reminders_patient_id ON public.patient_reminders(patient_id);
CREATE INDEX idx_patient_reminders_sent_at ON public.patient_reminders(sent_at);

-- Enable RLS
ALTER TABLE public.patient_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for patient reminders
CREATE POLICY "Healthcare workers can view patient reminders" 
  ON public.patient_reminders 
  FOR SELECT 
  USING (true);

CREATE POLICY "Healthcare workers can create patient reminders" 
  ON public.patient_reminders 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Healthcare workers can update patient reminders" 
  ON public.patient_reminders 
  FOR UPDATE 
  USING (true);
