ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS odometer_start_distance integer,
  ADD COLUMN IF NOT EXISTS last_known_distance integer,
  ADD COLUMN IF NOT EXISTS last_known_distance_unit text,
  ADD COLUMN IF NOT EXISTS last_known_distance_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS distance_source text,
  ADD COLUMN IF NOT EXISTS average_monthly_distance integer,
  ADD COLUMN IF NOT EXISTS life_distance integer,
  ADD COLUMN IF NOT EXISTS estimated_distance integer;