ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS rfl_type text,
  ADD COLUMN IF NOT EXISTS rfl_expiry_date date,
  ADD COLUMN IF NOT EXISTS rfl_renewal_method text,
  ADD COLUMN IF NOT EXISTS rfl_renewal_term_months integer,
  ADD COLUMN IF NOT EXISTS rfl_supplier text;