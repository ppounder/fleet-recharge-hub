
-- Consolidate vehicles RLS: drop conflicting policies and create a simple permissive policy
DROP POLICY IF EXISTS "Authenticated can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated can delete vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Fleet managers can manage fleet vehicles" ON public.vehicles;

CREATE POLICY "Authenticated can manage vehicles"
ON public.vehicles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
