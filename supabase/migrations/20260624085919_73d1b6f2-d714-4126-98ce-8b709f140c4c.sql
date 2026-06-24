CREATE TABLE public.tyre_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  tyre_code TEXT,
  tread_depth NUMERIC(5,2) NOT NULL,
  reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tyre_readings_vehicle ON public.tyre_readings(vehicle_id);
CREATE INDEX idx_tyre_readings_vehicle_position_date ON public.tyre_readings(vehicle_id, position, reading_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tyre_readings TO authenticated;
GRANT ALL ON public.tyre_readings TO service_role;

ALTER TABLE public.tyre_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fleet members can view tyre readings"
ON public.tyre_readings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicles v
    JOIN public.profiles p ON p.fleet_id = v.fleet_id
    WHERE v.id = tyre_readings.vehicle_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Fleet members can insert tyre readings"
ON public.tyre_readings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vehicles v
    JOIN public.profiles p ON p.fleet_id = v.fleet_id
    WHERE v.id = tyre_readings.vehicle_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Fleet members can update tyre readings"
ON public.tyre_readings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicles v
    JOIN public.profiles p ON p.fleet_id = v.fleet_id
    WHERE v.id = tyre_readings.vehicle_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Fleet members can delete tyre readings"
ON public.tyre_readings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicles v
    JOIN public.profiles p ON p.fleet_id = v.fleet_id
    WHERE v.id = tyre_readings.vehicle_id AND p.id = auth.uid()
  )
);

CREATE TRIGGER update_tyre_readings_updated_at
BEFORE UPDATE ON public.tyre_readings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();