-- Automated reminder cron jobs via pg_cron + pg_net
-- Fires daily at 08:00 WAT (07:00 UTC) for the 4 reminder windows,
-- and at :30 past every hour to drain the failed-message retry queue.

-- pg_cron is pre-enabled in Supabase; just make sure pg_net is available.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
DECLARE
  _url text := 'https://wwhkfahlmivbqbtyidfr.supabase.co/functions/v1/send-ai-reminder';
  _headers jsonb := '{"Content-Type": "application/json"}'::jsonb;
BEGIN
  -- Remove existing jobs so this migration is idempotent
  DELETE FROM cron.job WHERE jobname IN ('matmama-daily-reminders', 'matmama-retry-queue');

  -- Daily reminder windows: upcoming (T-3), day-of, follow-up (T+1), defaulter (T+3)
  -- 07:00 UTC = 08:00 WAT (Africa/Lagos, UTC+1)
  PERFORM cron.schedule(
    'matmama-daily-reminders',
    '0 7 * * *',
    format(
      $sql$SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{"automated":true}'::jsonb) AS request_id$sql$,
      _url, _headers::text
    )
  );

  -- Retry queue: drain failed reminders with elapsed next_retry_at
  -- Runs at :30 past every hour to avoid clashing with the daily cron at :00
  PERFORM cron.schedule(
    'matmama-retry-queue',
    '30 * * * *',
    format(
      $sql$SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{"processRetries":true}'::jsonb) AS request_id$sql$,
      _url, _headers::text
    )
  );
END;
$$;

-- Grant cron schema access to postgres role (Supabase default)
GRANT USAGE ON SCHEMA cron TO postgres;
