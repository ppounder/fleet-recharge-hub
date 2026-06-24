CREATE POLICY "Customers manage defects on own vehicles"
  ON public.vehicle_defects
  FOR ALL
  TO authenticated
  USING (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()))
  WITH CHECK (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()));