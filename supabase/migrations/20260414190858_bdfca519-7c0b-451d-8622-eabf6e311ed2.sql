ALTER TABLE public.patient_reminders
  ADD COLUMN IF NOT EXISTS external_message_id text,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS delivery_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS error_detail text;

CREATE INDEX IF NOT EXISTS idx_patient_reminders_external_id ON public.patient_reminders(external_message_id) WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patient_reminders_retry ON public.patient_reminders(status, retry_count) WHERE status = 'failed' AND retry_count < 3;

ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_reminders;