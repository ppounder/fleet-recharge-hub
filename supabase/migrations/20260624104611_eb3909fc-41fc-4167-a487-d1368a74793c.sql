
CREATE TABLE public.tyre_position_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tyre_id uuid NOT NULL REFERENCES public.tyres(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  from_position text NOT NULL,
  to_position text NOT NULL,
  changed_at timestamptz NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tyre_position_changes TO authenticated;
GRANT ALL ON public.tyre_position_changes TO service_role;

ALTER TABLE public.tyre_position_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tyre position changes"
  ON public.tyre_position_changes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert tyre position changes"
  ON public.tyre_position_changes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update tyre position changes"
  ON public.tyre_position_changes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete tyre position changes"
  ON public.tyre_position_changes FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_tyre_position_changes_tyre ON public.tyre_position_changes(tyre_id);
CREATE INDEX idx_tyre_position_changes_vehicle ON public.tyre_position_changes(vehicle_id);
