
CREATE TABLE public.technician_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL,
  technician_id uuid NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES public.suppliers(id),
  allocation_start_date timestamptz NOT NULL DEFAULT now(),
  allocation_end_date timestamptz,
  allocation_type text NOT NULL CHECK (allocation_type IN ('permanent','temporary_transfer')),
  revert_after_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.technician_allocations TO authenticated;
GRANT ALL ON public.technician_allocations TO service_role;

ALTER TABLE public.technician_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY fleet_tech_alloc_all ON public.technician_allocations
  FOR ALL
  USING (fleet_id = private.current_user_fleet_id())
  WITH CHECK (fleet_id = private.current_user_fleet_id());

CREATE INDEX idx_tech_alloc_tech ON public.technician_allocations(technician_id);

CREATE OR REPLACE FUNCTION public.set_updated_at_technician_allocations()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_tech_alloc_updated
  BEFORE UPDATE ON public.technician_allocations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_technician_allocations();
