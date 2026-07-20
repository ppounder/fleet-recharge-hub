
-- Allow Customer role users to manage suppliers, workshops (suppliers), parts, and related catalog data from the Customer Portal.

CREATE POLICY "Customer role can insert suppliers"
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customer role can update suppliers"
  ON public.suppliers FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customer role can delete suppliers"
  ON public.suppliers FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customer role can manage supplier contacts"
  ON public.supplier_contacts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customer role can manage parts"
  ON public.parts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customer role can view parts"
  ON public.parts FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customer role can manage stock items"
  ON public.parts_stock_items FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customer role can manage manufacturers"
  ON public.part_manufacturers FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customer role can manage posting definitions"
  ON public.posting_definitions FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customer role can manage customer contacts"
  ON public.customer_contacts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'customer'::app_role));
