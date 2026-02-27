
-- 1. Create fleets table
CREATE TABLE public.fleets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;

-- 2. Add fleet_id columns first
ALTER TABLE public.profiles ADD COLUMN fleet_id uuid REFERENCES public.fleets(id);
ALTER TABLE public.vehicles ADD COLUMN fleet_id uuid REFERENCES public.fleets(id);

-- 3. Now create fleets policies (fleet_id column exists on profiles now)
CREATE POLICY "Fleet managers can view own fleet"
  ON public.fleets FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT fleet_id FROM public.profiles WHERE id = auth.uid() AND fleet_id IS NOT NULL)
  );

CREATE POLICY "Fleet managers can manage own fleet"
  ON public.fleets FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'fleet-manager'::app_role));

-- 4. Update vehicles RLS for fleet-scoped visibility
DROP POLICY IF EXISTS "Fleet managers can manage vehicles" ON public.vehicles;

CREATE POLICY "Fleet managers can manage fleet vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'fleet-manager'::app_role)
    AND (
      fleet_id IS NULL
      OR fleet_id IN (SELECT p.fleet_id FROM public.profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL)
    )
  );
