
CREATE POLICY "Service providers can view all fleets"
ON public.fleets
FOR SELECT
USING (has_role(auth.uid(), 'service-provider'::app_role));
