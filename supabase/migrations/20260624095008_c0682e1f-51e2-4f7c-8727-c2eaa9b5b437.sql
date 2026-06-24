CREATE TABLE public.tyre_disposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  disposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tyre_disposals TO authenticated;
GRANT ALL ON public.tyre_disposals TO service_role;

ALTER TABLE public.tyre_disposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view disposals for their vehicles"
  ON public.tyre_disposals FOR SELECT TO authenticated
  USING (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()));

CREATE POLICY "Customers can insert disposals for their vehicles"
  ON public.tyre_disposals FOR INSERT TO authenticated
  WITH CHECK (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()));

CREATE POLICY "Customers can update disposals for their vehicles"
  ON public.tyre_disposals FOR UPDATE TO authenticated
  USING (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()))
  WITH CHECK (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()));

CREATE POLICY "Customers can delete disposals for their vehicles"
  ON public.tyre_disposals FOR DELETE TO authenticated
  USING (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()));

CREATE TRIGGER update_tyre_disposals_updated_at
  BEFORE UPDATE ON public.tyre_disposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tyre_disposals_vehicle ON public.tyre_disposals(vehicle_id, disposed_at DESC);