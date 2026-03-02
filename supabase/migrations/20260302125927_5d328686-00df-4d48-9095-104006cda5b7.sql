-- Fix estimate_items RLS: allow fleet managers to insert, and fix provider policy

DROP POLICY IF EXISTS "Providers can manage estimate items" ON public.estimate_items;
CREATE POLICY "Providers can manage estimate items" ON public.estimate_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs j
    JOIN service_providers sp ON sp.id = j.provider_id
    WHERE j.id = estimate_items.job_id AND sp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can view estimate items for accessible jobs" ON public.estimate_items;
CREATE POLICY "Users can view estimate items for accessible jobs" ON public.estimate_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = estimate_items.job_id
    AND (
      j.fleet_manager_id = auth.uid()
      OR j.customer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
    )
  ));

-- Fleet managers need full CRUD on estimate items for their jobs
CREATE POLICY "Fleet managers can manage estimate items" ON public.estimate_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = estimate_items.job_id AND j.fleet_manager_id = auth.uid()
  ));
