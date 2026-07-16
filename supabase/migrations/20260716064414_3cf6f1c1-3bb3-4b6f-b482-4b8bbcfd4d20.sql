DROP POLICY IF EXISTS "Customers can view suppliers on their jobs" ON public.suppliers;
CREATE POLICY "Customers can view all suppliers"
  ON public.suppliers FOR SELECT
  USING (private.has_role(auth.uid(), 'customer'::app_role));