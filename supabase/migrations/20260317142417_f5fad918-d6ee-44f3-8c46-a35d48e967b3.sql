
-- Add preferred reminder channel to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_channel text NOT NULL DEFAULT 'sms';

-- Add scheduled_for column to patient_reminders to track scheduled delivery time
ALTER TABLE public.patient_reminders ADD COLUMN IF NOT EXISTS scheduled_for timestamp with time zone;

-- Add channel column to patient_reminders (different from reminder_type which is the actual channel used)
ALTER TABLE public.patient_reminders ADD COLUMN IF NOT EXISTS reminder_category text NOT NULL DEFAULT 'manual';

-- Create index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_clients_due_date_status ON public.clients (due_date, status);
CREATE INDEX IF NOT EXISTS idx_patient_reminders_scheduled ON public.patient_reminders (scheduled_for, status);
