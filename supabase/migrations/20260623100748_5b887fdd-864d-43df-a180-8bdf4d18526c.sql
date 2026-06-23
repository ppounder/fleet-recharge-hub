
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.vehicle_defects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'minor',
  status TEXT NOT NULL DEFAULT 'open',
  reported_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_defects TO authenticated;
GRANT ALL ON public.vehicle_defects TO service_role;

ALTER TABLE public.vehicle_defects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View vehicle defects"
ON public.vehicle_defects FOR SELECT
TO authenticated
USING (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()) OR public.has_role(auth.uid(), 'fleet-manager') OR public.has_role(auth.uid(), 'supplier'));

CREATE POLICY "Fleet managers manage defects"
ON public.vehicle_defects FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'fleet-manager'))
WITH CHECK (public.has_role(auth.uid(), 'fleet-manager'));

CREATE INDEX idx_vehicle_defects_vehicle ON public.vehicle_defects(vehicle_id);
CREATE INDEX idx_vehicle_defects_job ON public.vehicle_defects(job_id);

CREATE TRIGGER update_vehicle_defects_updated_at
BEFORE UPDATE ON public.vehicle_defects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
