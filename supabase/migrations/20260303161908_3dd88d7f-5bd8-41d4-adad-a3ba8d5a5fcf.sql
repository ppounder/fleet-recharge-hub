-- Security definer function: get customer_id for a vehicle
CREATE OR REPLACE FUNCTION public.vehicle_belongs_to_customer(_vehicle_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vehicles v
    JOIN public.customers c ON c.id = v.customer_id
    WHERE v.id = _vehicle_id AND c.user_id = _user_id
  )
$$;

-- Security definer function: check if a customer owns a vehicle by customer_id column
CREATE OR REPLACE FUNCTION public.vehicle_customer_is_user(_customer_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = _customer_id AND c.user_id = _user_id
  )
$$;

-- Fix vehicles: customer policy uses security definer
DROP POLICY "Customers can view own vehicles" ON public.vehicles;
CREATE POLICY "Customers can view own vehicles"
  ON public.vehicles FOR SELECT TO authenticated
  USING (public.vehicle_customer_is_user(customer_id, auth.uid()));

-- Fix jobs: customer policy uses security definer (no cross-table RLS)
DROP POLICY "Customers can view own jobs" ON public.jobs;
CREATE POLICY "Customers can view own jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (public.vehicle_belongs_to_customer(vehicle_id, auth.uid()));

-- Fix recharges: customer policy uses security definer
DROP POLICY "Customers can view own recharges" ON public.recharges;
CREATE POLICY "Customers can view own recharges"
  ON public.recharges FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = recharges.job_id
    AND public.vehicle_belongs_to_customer(j.vehicle_id, auth.uid())
  ));

-- Fix job_comments: customer policies use security definer
DROP POLICY "Customers can view job comments" ON public.job_comments;
CREATE POLICY "Customers can view job comments"
  ON public.job_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_comments.job_id
    AND public.vehicle_belongs_to_customer(j.vehicle_id, auth.uid())
  ));

DROP POLICY "Customers can insert job comments" ON public.job_comments;
CREATE POLICY "Customers can insert job comments"
  ON public.job_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_comments.job_id
    AND public.vehicle_belongs_to_customer(j.vehicle_id, auth.uid())
  ));

-- Fix work_items: customer check uses security definer
DROP POLICY "Users can view estimate items for accessible jobs" ON public.work_items;
CREATE POLICY "Users can view estimate items for accessible jobs"
  ON public.work_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = work_items.job_id AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL AND p.fleet_id = j.fleet_id)
      OR public.vehicle_belongs_to_customer(j.vehicle_id, auth.uid())
      OR EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
    )
  ));

-- Fix work_item_labour
DROP POLICY "Users can view work item labour for accessible jobs" ON public.work_item_labour;
CREATE POLICY "Users can view work item labour for accessible jobs"
  ON public.work_item_labour FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_items wi JOIN jobs j ON j.id = wi.job_id WHERE wi.id = work_item_labour.work_item_id AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL AND p.fleet_id = j.fleet_id)
      OR public.vehicle_belongs_to_customer(j.vehicle_id, auth.uid())
      OR EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
    )
  ));

-- Fix work_item_parts
DROP POLICY "Users can view work item parts for accessible jobs" ON public.work_item_parts;
CREATE POLICY "Users can view work item parts for accessible jobs"
  ON public.work_item_parts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_items wi JOIN jobs j ON j.id = wi.job_id WHERE wi.id = work_item_parts.work_item_id AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL AND p.fleet_id = j.fleet_id)
      OR public.vehicle_belongs_to_customer(j.vehicle_id, auth.uid())
      OR EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
    )
  ));