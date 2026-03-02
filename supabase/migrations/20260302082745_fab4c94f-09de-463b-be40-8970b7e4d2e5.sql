
CREATE POLICY "Fleet managers can manage menu items for their fleet"
  ON public.provider_menu_items
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'fleet-manager'::app_role)
    AND fleet_id IN (
      SELECT p.fleet_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL
    )
  );
