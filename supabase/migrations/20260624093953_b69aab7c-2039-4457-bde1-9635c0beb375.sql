ALTER TABLE public.tyre_readings
  ADD COLUMN IF NOT EXISTS tread_outer NUMERIC,
  ADD COLUMN IF NOT EXISTS tread_centre NUMERIC,
  ADD COLUMN IF NOT EXISTS tread_inner NUMERIC;
UPDATE public.tyre_readings SET tread_centre = tread_depth WHERE tread_centre IS NULL;