
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System inserts notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify facility managers on transfer events
CREATE OR REPLACE FUNCTION public.notify_transfer_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _client_name text;
  _source_facility text;
  _target_facility text;
  _manager record;
  _title text;
  _message text;
  _notify_account_id uuid;
BEGIN
  -- Get client name
  SELECT name INTO _client_name FROM public.clients WHERE id = NEW.client_id;

  -- Get facility names
  SELECT name INTO _source_facility FROM public.facilities WHERE id = NEW.source_facility_id;
  SELECT name INTO _target_facility FROM public.facilities WHERE id = NEW.target_facility_id;

  IF TG_OP = 'INSERT' THEN
    -- New transfer request: notify source account managers
    _title := 'New Transfer Request';
    _message := format('Transfer requested for client %s from %s to %s.',
      COALESCE(_client_name, 'Unknown'), COALESCE(_source_facility, 'Unknown'), COALESCE(_target_facility, 'Unknown'));
    _notify_account_id := NEW.source_account_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    -- Transfer resolved: notify target account (requester)
    _title := format('Transfer %s', initcap(NEW.status));
    _message := format('Transfer for client %s has been %s.',
      COALESCE(_client_name, 'Unknown'), NEW.status);
    _notify_account_id := NEW.target_account_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Insert notification for all managers/admins/officers in the relevant account
  FOR _manager IN
    SELECT p.user_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE p.account_id = _notify_account_id
      AND ur.role IN ('program_manager', 'system_admin', 'facility_officer')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (_manager.user_id, _title, _message, 'transfer', '/transfers');
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transfer_notify
  AFTER INSERT OR UPDATE ON public.transfer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_transfer_event();
