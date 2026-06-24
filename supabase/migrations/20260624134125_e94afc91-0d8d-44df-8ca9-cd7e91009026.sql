CREATE TABLE public.odometer_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  source text,
  reading integer NOT NULL,
  unit text NOT NULL DEFAULT 'Miles',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  fleet_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX odometer_readings_vehicle_id_idx ON public.odometer_readings(vehicle_id, recorded_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.odometer_readings TO authenticated;
GRANT ALL ON public.odometer_readings TO service_role;

ALTER TABLE public.odometer_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view odometer readings"
ON public.odometer_readings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert odometer readings"
ON public.odometer_readings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update odometer readings"
ON public.odometer_readings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete odometer readings"
ON public.odometer_readings FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_odometer_readings_updated_at
BEFORE UPDATE ON public.odometer_readings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();