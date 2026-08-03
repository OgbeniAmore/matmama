ALTER TABLE public.anc_visits DROP CONSTRAINT IF EXISTS anc_visits_client_id_fkey;
ALTER TABLE public.anc_visits ADD CONSTRAINT anc_visits_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.immunization_records DROP CONSTRAINT IF EXISTS immunization_records_client_id_fkey;
ALTER TABLE public.immunization_records ADD CONSTRAINT immunization_records_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.patient_reminders DROP CONSTRAINT IF EXISTS patient_reminders_patient_id_fkey;
ALTER TABLE public.patient_reminders ADD CONSTRAINT patient_reminders_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.transfer_requests DROP CONSTRAINT IF EXISTS transfer_requests_client_id_fkey;
ALTER TABLE public.transfer_requests ADD CONSTRAINT transfer_requests_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE;