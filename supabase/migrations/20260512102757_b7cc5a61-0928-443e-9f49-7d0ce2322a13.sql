ALTER TABLE public.patient_reminders
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS patient_reminders_idem_uniq
  ON public.patient_reminders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS patient_reminders_retry_idx
  ON public.patient_reminders (delivery_status, next_retry_at)
  WHERE delivery_status = 'failed';

CREATE INDEX IF NOT EXISTS patient_reminders_account_sent_idx
  ON public.patient_reminders (account_id, sent_at DESC);
