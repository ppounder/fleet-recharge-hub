ALTER TABLE public.tyre_readings DROP CONSTRAINT IF EXISTS tyre_readings_pressure_unit_check;
UPDATE public.tyre_readings SET pressure_unit = lower(pressure_unit) WHERE pressure_unit IS NOT NULL;
ALTER TABLE public.tyre_readings ADD CONSTRAINT tyre_readings_pressure_unit_check CHECK (pressure_unit IN ('psi','bar'));