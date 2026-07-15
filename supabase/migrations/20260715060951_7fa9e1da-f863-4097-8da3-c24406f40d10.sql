
-- customer_contacts: replace open policies with scoped ones
DROP POLICY IF EXISTS "Authenticated can delete customer contacts" ON public.customer_contacts;
DROP POLICY IF EXISTS "Authenticated can insert customer contacts" ON public.customer_contacts;
DROP POLICY IF EXISTS "Authenticated can update customer contacts" ON public.customer_contacts;
DROP POLICY IF EXISTS "Authenticated can view customer contacts" ON public.customer_contacts;

CREATE POLICY "Fleet managers can manage customer contacts"
  ON public.customer_contacts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'fleet-manager'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'fleet-manager'::app_role));

CREATE POLICY "Customer owners can manage own contacts"
  ON public.customer_contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_contacts.customer_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_contacts.customer_id AND c.user_id = auth.uid()));

-- supplier_contacts
DROP POLICY IF EXISTS "Authenticated can delete supplier contacts" ON public.supplier_contacts;
DROP POLICY IF EXISTS "Authenticated can insert supplier contacts" ON public.supplier_contacts;
DROP POLICY IF EXISTS "Authenticated can update supplier contacts" ON public.supplier_contacts;
DROP POLICY IF EXISTS "Authenticated can view supplier contacts" ON public.supplier_contacts;

CREATE POLICY "Fleet managers can manage supplier contacts"
  ON public.supplier_contacts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'fleet-manager'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'fleet-manager'::app_role));

CREATE POLICY "Supplier owners can manage own contacts"
  ON public.supplier_contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_contacts.supplier_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_contacts.supplier_id AND s.user_id = auth.uid()));

-- suppliers: remove broad customer-role CRUD, restrict view to related suppliers only
DROP POLICY IF EXISTS "Customers can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Customers can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Customers can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Customers can view suppliers" ON public.suppliers;

CREATE POLICY "Customers can view suppliers on their jobs"
  ON public.suppliers FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'customer'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.customers c ON c.id = j.customer_id
      WHERE j.provider_id = suppliers.id AND c.user_id = auth.uid()
    )
  );

-- recharges: fix supplier policy to join through suppliers.user_id
DROP POLICY IF EXISTS "Suppliers can view recharges for their jobs" ON public.recharges;

CREATE POLICY "Suppliers can view recharges for their jobs"
  ON public.recharges FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.suppliers s ON s.id = j.provider_id
    WHERE j.id = recharges.job_id AND s.user_id = auth.uid()
  ));
