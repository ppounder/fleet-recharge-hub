CREATE POLICY "Customers can update own vehicles"
ON public.vehicles
FOR UPDATE
TO authenticated
USING (public.vehicle_customer_is_user(customer_id, auth.uid()))
WITH CHECK (public.vehicle_customer_is_user(customer_id, auth.uid()));