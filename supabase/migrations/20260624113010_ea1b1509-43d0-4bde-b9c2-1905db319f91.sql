ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS last_service_date date,
  ADD COLUMN IF NOT EXISTS next_service_date date,
  ADD COLUMN IF NOT EXISTS last_inspection_date date,
  ADD COLUMN IF NOT EXISTS next_inspection_date date,
  ADD COLUMN IF NOT EXISTS mot_issued_date date,
  ADD COLUMN IF NOT EXISTS mot_expiry_date date,
  ADD COLUMN IF NOT EXISTS loler_expiry_date date,
  ADD COLUMN IF NOT EXISTS tacho_2yr_expiry_date date,
  ADD COLUMN IF NOT EXISTS tacho_6yr_expiry_date date;