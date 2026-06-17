
-- Add trimester and EDD fields to the patients table
ALTER TABLE public.patients 
ADD COLUMN trimester INTEGER CHECK (trimester IN (1, 2, 3)),
ADD COLUMN edd DATE;

-- Create a function to automatically update patient status to completed when EDD has passed
CREATE OR REPLACE FUNCTION update_anc_patient_status()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.patients 
  SET status = 'Completed'
  WHERE service = 'Ante Natal Care' 
    AND edd < CURRENT_DATE 
    AND status != 'Completed';
END;
$$;

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to patients table if it doesn't exist
DROP TRIGGER IF EXISTS set_timestamp ON public.patients;
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();
