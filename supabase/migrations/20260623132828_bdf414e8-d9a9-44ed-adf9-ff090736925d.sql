
CREATE TABLE public.vehicle_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  fleet_id uuid,
  status text NOT NULL,
  reason text,
  location text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  odometer numeric,
  odometer_unit text DEFAULT 'Miles',
  changed_by text,
  maintenance_message text,
  sorn_returned boolean DEFAULT false,
  sorn_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_status_history TO authenticated;
GRANT ALL ON public.vehicle_status_history TO service_role;

ALTER TABLE public.vehicle_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fleet members can view vehicle status history"
ON public.vehicle_status_history FOR SELECT TO authenticated
USING (
  fleet_id IS NULL OR fleet_id IN (
    SELECT fleet_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Fleet members can insert vehicle status history"
ON public.vehicle_status_history FOR INSERT TO authenticated
WITH CHECK (
  fleet_id IS NULL OR fleet_id IN (
    SELECT fleet_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE INDEX idx_vehicle_status_history_vehicle ON public.vehicle_status_history(vehicle_id, changed_at DESC);
