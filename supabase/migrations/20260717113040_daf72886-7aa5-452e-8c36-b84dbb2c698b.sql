CREATE POLICY "Authenticated users can view vat bands"
ON public.vat_bands
FOR SELECT
TO authenticated
USING (true);