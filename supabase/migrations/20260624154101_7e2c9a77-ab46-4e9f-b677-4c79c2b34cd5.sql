ALTER TABLE public.vehicle_defects
  ADD COLUMN IF NOT EXISTS rectified_by text,
  ADD COLUMN IF NOT EXISTS rectified_at timestamptz;