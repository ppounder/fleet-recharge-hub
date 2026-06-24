CREATE POLICY "Customers can view tyre readings for own vehicles"
ON public.tyre_readings FOR SELECT
TO authenticated
USING (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()));

CREATE POLICY "Customers can insert tyre readings for own vehicles"
ON public.tyre_readings FOR INSERT
TO authenticated
WITH CHECK (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()));

CREATE POLICY "Customers can update tyre readings for own vehicles"
ON public.tyre_readings FOR UPDATE
TO authenticated
USING (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()))
WITH CHECK (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()));

CREATE POLICY "Customers can delete tyre readings for own vehicles"
ON public.tyre_readings FOR DELETE
TO authenticated
USING (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()));