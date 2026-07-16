ALTER TABLE public.suppliers ADD COLUMN reference_number TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

-- Re-ensure RLS is enabled
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;