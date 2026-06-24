
CREATE TABLE public.tyres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  tyre_size TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  manufacture_date TEXT,
  fitted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  disposed_at TIMESTAMPTZ,
  disposed_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tyres TO authenticated;
GRANT ALL ON public.tyres TO service_role;

ALTER TABLE public.tyres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tyres" ON public.tyres FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tyres" ON public.tyres FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update tyres" ON public.tyres FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete tyres" ON public.tyres FOR DELETE TO authenticated USING (true);

CREATE UNIQUE INDEX tyres_active_position_unique
  ON public.tyres (vehicle_id, position)
  WHERE disposed_at IS NULL;

CREATE INDEX tyres_vehicle_idx ON public.tyres (vehicle_id);

CREATE TRIGGER update_tyres_updated_at
BEFORE UPDATE ON public.tyres
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
