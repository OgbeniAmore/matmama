
-- Function to automatically detect and mark defaulters
CREATE OR REPLACE FUNCTION public.auto_detect_defaulters()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count integer;
BEGIN
  -- Mark clients as Defaulting if their due_date has passed and they're still On Track
  WITH updated AS (
    UPDATE public.clients
    SET status = 'Defaulting',
        updated_at = now()
    WHERE status = 'On Track'
      AND due_date < now()
    RETURNING id, name, facility_id, account_id
  )
  SELECT count(*) INTO affected_count FROM updated;

  -- Log each auto-detection in audit_logs
  INSERT INTO public.audit_logs (action, table_name, record_id, new_data, account_id)
  SELECT
    'AUTO_DEFAULTER_DETECTION',
    'clients',
    c.id,
    jsonb_build_object('name', c.name, 'previous_status', 'On Track', 'new_status', 'Defaulting', 'due_date', c.due_date),
    c.account_id
  FROM public.clients c
  WHERE c.status = 'Defaulting'
    AND c.updated_at >= now() - interval '1 minute';

  RETURN affected_count;
END;
$$;
