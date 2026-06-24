ALTER TABLE public.tyre_readings
  ADD COLUMN IF NOT EXISTS pressure NUMERIC,
  ADD COLUMN IF NOT EXISTS pressure_unit TEXT CHECK (pressure_unit IN ('PSI','Bar'));