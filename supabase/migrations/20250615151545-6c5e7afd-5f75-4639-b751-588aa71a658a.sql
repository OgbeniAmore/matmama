
-- Create ENUM types for service and status to ensure data integrity
CREATE TYPE public.patient_service AS ENUM ('Routine Immunization', 'Family Planning', 'Ante Natal Care');
CREATE TYPE public.patient_status AS ENUM ('On Track', 'Defaulting', 'Completed');

-- Create the patients table to store patient data
CREATE TABLE public.patients (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  service public.patient_service NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status public.patient_status NOT NULL,
  contact TEXT NOT NULL,
  address TEXT NOT NULL,
  assigned_to TEXT NOT NULL,
  child_name TEXT,
  child_dob DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a function to automatically update the 'updated_at' timestamp on any change
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create a trigger to execute the function when a patient record is updated
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the initial patient data from the application into the new table
INSERT INTO public.patients (id, name, service, due_date, status, contact, address, assigned_to) VALUES
('PAT001', 'Amina Yusuf', 'Ante Natal Care', NOW() + INTERVAL '10 days', 'On Track', '08012345678', '123 Main St, Lagos', 'Nurse Funmi'),
('PAT002', 'Bolanle Adeboye', 'Routine Immunization', NOW() - INTERVAL '5 days', 'Defaulting', '08023456789', '456 Oak Ave, Ikeja', 'Dr. Kemi'),
('PAT003', 'Chidinma Okafor', 'Family Planning', NOW() + INTERVAL '30 days', 'On Track', '08034567890', '789 Pine Rd, Lekki', 'Nurse Funmi'),
('PAT004', 'Fatima Bello', 'Ante Natal Care', NOW() - INTERVAL '2 days', 'Defaulting', '08045678901', '101 Maple Dr, Surulere', 'Dr. Kemi'),
('PAT005', 'Grace Johnson', 'Routine Immunization', NOW() + INTERVAL '15 days', 'On Track', '08056789012', '212 Birch Ln, Victoria Island', 'Nurse Funmi'),
('PAT006', 'Hadiza Ibrahim', 'Family Planning', NOW() + INTERVAL '5 days', 'Completed', '08067890123', '333 Cedar Blvd, Yaba', 'Dr. Kemi');

-- Enable realtime updates for the patients table
ALTER TABLE public.patients REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
