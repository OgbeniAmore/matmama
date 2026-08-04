ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS send_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_send_ok boolean,
  ADD COLUMN IF NOT EXISTS last_send_error text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

UPDATE public.invitations SET last_sent_at = created_at, send_count = 1 WHERE last_sent_at IS NULL;