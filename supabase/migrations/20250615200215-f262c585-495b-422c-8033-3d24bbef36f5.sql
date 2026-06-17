
-- This script renames the 'patients' table to 'clients' and updates related database objects.
BEGIN;

-- To avoid potential locking issues, first remove the table from the realtime publication.
ALTER PUBLICATION supabase_realtime DROP TABLE public.patients;

-- Drop the existing foreign key constraint from the immunization_records table.
ALTER TABLE public.immunization_records DROP CONSTRAINT IF EXISTS immunization_records_patient_id_fkey;

-- Rename the 'patient_id' column to 'client_id' in the immunization_records table.
ALTER TABLE public.immunization_records RENAME COLUMN patient_id TO client_id;

-- Rename the 'patients' table to 'clients'.
ALTER TABLE public.patients RENAME TO clients;

-- Re-add the foreign key constraint with the new column and table names, and add ON DELETE CASCADE for better data integrity.
ALTER TABLE public.immunization_records 
ADD CONSTRAINT immunization_records_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Rename the trigger on the 'clients' table for consistency.
ALTER TRIGGER update_patients_updated_at ON public.clients RENAME TO update_clients_updated_at;

-- Rename the custom ENUM types.
ALTER TYPE public.patient_service RENAME TO client_service;
ALTER TYPE public.patient_status RENAME TO client_status;

-- Add the renamed table back to the realtime publication.
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;

COMMIT;
