ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS fleet_number text,
  ADD COLUMN IF NOT EXISTS asset_type text,
  ADD COLUMN IF NOT EXISTS derivative text;