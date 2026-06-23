DROP POLICY IF EXISTS "Fleet members can insert vehicle status history" ON public.vehicle_status_history;
DROP POLICY IF EXISTS "Fleet members can view vehicle status history" ON public.vehicle_status_history;
DROP POLICY IF EXISTS "Vehicle status history can be updated by permitted users" ON public.vehicle_status_history;

GRANT SELECT, INSERT, UPDATE ON public.vehicle_status_history TO authenticated;
GRANT ALL ON public.vehicle_status_history TO service_role;

CREATE POLICY "Permitted users can view vehicle status history"
ON public.vehicle_status_history
FOR SELECT
TO authenticated
USING (
  fleet_id IS NULL
  OR fleet_id IN (
    SELECT profiles.fleet_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
  OR public.vehicle_belongs_to_customer(vehicle_id, auth.uid())
);

CREATE POLICY "Permitted users can insert vehicle status history"
ON public.vehicle_status_history
FOR INSERT
TO authenticated
WITH CHECK (
  fleet_id IS NULL
  OR fleet_id IN (
    SELECT profiles.fleet_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
  OR public.vehicle_belongs_to_customer(vehicle_id, auth.uid())
);

CREATE POLICY "Permitted users can update vehicle status history messages"
ON public.vehicle_status_history
FOR UPDATE
TO authenticated
USING (
  fleet_id IS NULL
  OR fleet_id IN (
    SELECT profiles.fleet_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
  OR public.vehicle_belongs_to_customer(vehicle_id, auth.uid())
)
WITH CHECK (
  fleet_id IS NULL
  OR fleet_id IN (
    SELECT profiles.fleet_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
  OR public.vehicle_belongs_to_customer(vehicle_id, auth.uid())
);