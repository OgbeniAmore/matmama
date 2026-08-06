select cron.schedule(
  'sms-failure-rate-alerts',
  '15 * * * *',
  $$
  select net.http_post(
    url := 'https://wwhkfahlmivbqbtyidfr.supabase.co/functions/v1/send-ai-reminder',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"checkFailureAlerts": true, "threshold": 0.2, "minVolume": 10}'::jsonb
  ) as request_id;
  $$
);