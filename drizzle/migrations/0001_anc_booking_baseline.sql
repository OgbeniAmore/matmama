ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS gravida integer,
  ADD COLUMN IF NOT EXISTS para integer,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS genotype text,
  ADD COLUMN IF NOT EXISTS hiv_status text,
  ADD COLUMN IF NOT EXISTS hepatitis_b_status text,
  ADD COLUMN IF NOT EXISTS vdrl_status text;
ALTER TABLE public.clients ADD CONSTRAINT clients_gravida_para_chk CHECK (
  (gravida IS NULL OR gravida BETWEEN 1 AND 30) AND (para IS NULL OR para BETWEEN 0 AND 30));