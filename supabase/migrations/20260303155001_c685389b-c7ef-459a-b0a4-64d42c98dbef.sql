
-- Rename the table
ALTER TABLE public.service_providers RENAME TO suppliers;

-- Drop old RLS policies on the now-renamed table
DROP POLICY IF EXISTS "Fleet managers can manage service providers" ON public.suppliers;
DROP POLICY IF EXISTS "Service providers can view own record" ON public.suppliers;

-- Create new RLS policies on suppliers
CREATE POLICY "Fleet managers can manage suppliers"
ON public.suppliers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'fleet-manager'::app_role));

CREATE POLICY "Suppliers can view own record"
ON public.suppliers FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- fleets
DROP POLICY IF EXISTS "Service providers can view all fleets" ON public.fleets;
CREATE POLICY "Suppliers can view all fleets"
ON public.fleets FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'supplier'::app_role));

-- jobs
DROP POLICY IF EXISTS "Providers can update assigned jobs" ON public.jobs;
DROP POLICY IF EXISTS "Providers can view assigned jobs" ON public.jobs;
CREATE POLICY "Suppliers can update assigned jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = jobs.provider_id AND sp.user_id = auth.uid()));
CREATE POLICY "Suppliers can view assigned jobs"
ON public.jobs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = jobs.provider_id AND sp.user_id = auth.uid()));

-- job_activity_log
DROP POLICY IF EXISTS "Providers can view job activity logs" ON public.job_activity_log;
CREATE POLICY "Suppliers can view job activity logs"
ON public.job_activity_log FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM jobs j JOIN suppliers sp ON sp.id = j.provider_id WHERE j.id = job_activity_log.job_id AND sp.user_id = auth.uid()));

-- job_comments
DROP POLICY IF EXISTS "Providers can insert job comments" ON public.job_comments;
DROP POLICY IF EXISTS "Providers can view job comments" ON public.job_comments;
CREATE POLICY "Suppliers can insert job comments"
ON public.job_comments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM jobs j JOIN suppliers sp ON sp.id = j.provider_id WHERE j.id = job_comments.job_id AND sp.user_id = auth.uid()));
CREATE POLICY "Suppliers can view job comments"
ON public.job_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM jobs j JOIN suppliers sp ON sp.id = j.provider_id WHERE j.id = job_comments.job_id AND sp.user_id = auth.uid()));

-- labour_rates
DROP POLICY IF EXISTS "Providers can manage own labour rates" ON public.labour_rates;
CREATE POLICY "Suppliers can manage own labour rates"
ON public.labour_rates FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = labour_rates.provider_id AND sp.user_id = auth.uid()));

-- menu_item_labour
DROP POLICY IF EXISTS "Providers can manage menu item labour" ON public.menu_item_labour;
CREATE POLICY "Suppliers can manage menu item labour"
ON public.menu_item_labour FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM provider_menu_items pmi JOIN suppliers sp ON sp.id = pmi.provider_id WHERE pmi.id = menu_item_labour.menu_item_id AND sp.user_id = auth.uid()));

-- menu_item_parts
DROP POLICY IF EXISTS "Providers can manage menu item parts" ON public.menu_item_parts;
CREATE POLICY "Suppliers can manage menu item parts"
ON public.menu_item_parts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM provider_menu_items pmi JOIN suppliers sp ON sp.id = pmi.provider_id WHERE pmi.id = menu_item_parts.menu_item_id AND sp.user_id = auth.uid()));

-- parts
DROP POLICY IF EXISTS "Providers can manage own parts" ON public.parts;
CREATE POLICY "Suppliers can manage own parts"
ON public.parts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = parts.provider_id AND sp.user_id = auth.uid()));

-- provider_menu_items
DROP POLICY IF EXISTS "Providers can manage own menu items" ON public.provider_menu_items;
CREATE POLICY "Suppliers can manage own menu items"
ON public.provider_menu_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = provider_menu_items.provider_id AND sp.user_id = auth.uid()));

-- commercial_terms
DROP POLICY IF EXISTS "Providers can manage own commercial terms" ON public.commercial_terms;
CREATE POLICY "Suppliers can manage own commercial terms"
ON public.commercial_terms FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = commercial_terms.provider_id AND sp.user_id = auth.uid()));

-- vat_bands
DROP POLICY IF EXISTS "Providers can manage own vat bands" ON public.vat_bands;
CREATE POLICY "Suppliers can manage own vat bands"
ON public.vat_bands FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = vat_bands.provider_id AND sp.user_id = auth.uid()));

-- vehicles
DROP POLICY IF EXISTS "Service providers can view assigned vehicles" ON public.vehicles;
CREATE POLICY "Suppliers can view assigned vehicles"
ON public.vehicles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM jobs j JOIN suppliers sp ON sp.id = j.provider_id WHERE j.vehicle_id = vehicles.id AND sp.user_id = auth.uid()));

-- work_categories
DROP POLICY IF EXISTS "Providers can manage own work categories" ON public.work_categories;
CREATE POLICY "Suppliers can manage own work categories"
ON public.work_categories FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = work_categories.provider_id AND sp.user_id = auth.uid()));

-- work_codes
DROP POLICY IF EXISTS "Providers can manage own work codes" ON public.work_codes;
CREATE POLICY "Suppliers can manage own work codes"
ON public.work_codes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM suppliers sp WHERE sp.id = work_codes.provider_id AND sp.user_id = auth.uid()));

-- work_item_labour
DROP POLICY IF EXISTS "Providers can manage work item labour" ON public.work_item_labour;
CREATE POLICY "Suppliers can manage work item labour"
ON public.work_item_labour FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM work_items wi JOIN jobs j ON j.id = wi.job_id JOIN suppliers sp ON sp.id = j.provider_id WHERE wi.id = work_item_labour.work_item_id AND sp.user_id = auth.uid()));

-- work_item_parts
DROP POLICY IF EXISTS "Providers can manage work item parts" ON public.work_item_parts;
CREATE POLICY "Suppliers can manage work item parts"
ON public.work_item_parts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM work_items wi JOIN jobs j ON j.id = wi.job_id JOIN suppliers sp ON sp.id = j.provider_id WHERE wi.id = work_item_parts.work_item_id AND sp.user_id = auth.uid()));

-- recharges
DROP POLICY IF EXISTS "Providers can view recharges for their jobs" ON public.recharges;
CREATE POLICY "Suppliers can view recharges for their jobs"
ON public.recharges FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = recharges.job_id AND jobs.provider_id = auth.uid()));

-- invoices
DROP POLICY IF EXISTS "Providers can manage own invoices" ON public.invoices;
CREATE POLICY "Suppliers can manage own invoices"
ON public.invoices FOR ALL TO authenticated
USING (provider_id = auth.uid());
