-- Fix vehicles RLS policy for service providers: join through service_providers table
DROP POLICY IF EXISTS "Service providers can view assigned vehicles" ON public.vehicles;

CREATE POLICY "Service providers can view assigned vehicles"
  ON public.vehicles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN service_providers sp ON sp.id = j.provider_id
      WHERE j.vehicle_id = vehicles.id
        AND sp.user_id = auth.uid()
    )
  );