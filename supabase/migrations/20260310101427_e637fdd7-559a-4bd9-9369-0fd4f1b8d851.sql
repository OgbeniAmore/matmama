
CREATE OR REPLACE FUNCTION public.handle_transfer_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE public.clients
    SET facility_id = NEW.target_facility_id,
        account_id = NEW.target_account_id,
        updated_at = now()
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transfer_approved
  AFTER UPDATE ON public.transfer_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
  EXECUTE FUNCTION public.handle_transfer_approval();
