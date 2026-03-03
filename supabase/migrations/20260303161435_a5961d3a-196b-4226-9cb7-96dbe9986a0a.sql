-- Fix vehicles RLS for customers
DROP POLICY "Customers can view own vehicles" ON public.vehicles;
CREATE POLICY "Customers can view own vehicles"
  ON public.vehicles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = vehicles.customer_id AND c.user_id = auth.uid()
  ));

-- Fix jobs RLS for customers
DROP POLICY "Customers can view own jobs" ON public.jobs;
CREATE POLICY "Customers can view own jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vehicles v
    JOIN public.customers c ON c.id = v.customer_id
    WHERE v.id = jobs.vehicle_id AND c.user_id = auth.uid()
  ));

-- Fix recharges RLS for customers
DROP POLICY "Customers can view own recharges" ON public.recharges;
CREATE POLICY "Customers can view own recharges"
  ON public.recharges FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.vehicles v ON v.id = j.vehicle_id
    JOIN public.customers c ON c.id = v.customer_id
    WHERE j.id = recharges.job_id AND c.user_id = auth.uid()
  ));

-- Fix job_comments RLS for customers
DROP POLICY "Customers can view job comments" ON public.job_comments;
CREATE POLICY "Customers can view job comments"
  ON public.job_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.vehicles v ON v.id = j.vehicle_id
    JOIN public.customers c ON c.id = v.customer_id
    WHERE j.id = job_comments.job_id AND c.user_id = auth.uid()
  ));

DROP POLICY "Customers can insert job comments" ON public.job_comments;
CREATE POLICY "Customers can insert job comments"
  ON public.job_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.vehicles v ON v.id = j.vehicle_id
    JOIN public.customers c ON c.id = v.customer_id
    WHERE j.id = job_comments.job_id AND c.user_id = auth.uid()
  ));

-- Fix work_items RLS for customers
DROP POLICY "Users can view estimate items for accessible jobs" ON public.work_items;
CREATE POLICY "Users can view estimate items for accessible jobs"
  ON public.work_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = work_items.job_id AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL AND p.fleet_id = j.fleet_id)
      OR EXISTS (SELECT 1 FROM vehicles v JOIN customers c ON c.id = v.customer_id WHERE v.id = j.vehicle_id AND c.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
    )
  ));

-- Fix work_item_labour RLS for customers
DROP POLICY "Users can view work item labour for accessible jobs" ON public.work_item_labour;
CREATE POLICY "Users can view work item labour for accessible jobs"
  ON public.work_item_labour FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_items wi JOIN jobs j ON j.id = wi.job_id WHERE wi.id = work_item_labour.work_item_id AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL AND p.fleet_id = j.fleet_id)
      OR EXISTS (SELECT 1 FROM vehicles v JOIN customers c ON c.id = v.customer_id WHERE v.id = j.vehicle_id AND c.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
    )
  ));

-- Fix work_item_parts RLS for customers
DROP POLICY "Users can view work item parts for accessible jobs" ON public.work_item_parts;
CREATE POLICY "Users can view work item parts for accessible jobs"
  ON public.work_item_parts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_items wi JOIN jobs j ON j.id = wi.job_id WHERE wi.id = work_item_parts.work_item_id AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL AND p.fleet_id = j.fleet_id)
      OR EXISTS (SELECT 1 FROM vehicles v JOIN customers c ON c.id = v.customer_id WHERE v.id = j.vehicle_id AND c.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
    )
  ));