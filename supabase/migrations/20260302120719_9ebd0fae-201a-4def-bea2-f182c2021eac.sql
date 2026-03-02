
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS fleet_reference text,
  ADD COLUMN IF NOT EXISTS depot text,
  ADD COLUMN IF NOT EXISTS booking_reference text,
  ADD COLUMN IF NOT EXISTS booking_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;
