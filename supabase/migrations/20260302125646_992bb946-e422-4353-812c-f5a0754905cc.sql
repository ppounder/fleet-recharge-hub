-- Drop the incorrect FK that points to auth.users
ALTER TABLE public.jobs DROP CONSTRAINT jobs_provider_id_fkey;

-- Add correct FK pointing to service_providers
ALTER TABLE public.jobs ADD CONSTRAINT jobs_provider_id_fkey 
  FOREIGN KEY (provider_id) REFERENCES public.service_providers(id);

-- Fix RLS policies that incorrectly compare provider_id to auth.uid()
-- provider_id now stores service_providers.id, not auth user id

DROP POLICY IF EXISTS "Providers can update assigned jobs" ON public.jobs;
CREATE POLICY "Providers can update assigned jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_providers sp 
    WHERE sp.id = jobs.provider_id AND sp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Providers can view/update assigned jobs" ON public.jobs;
CREATE POLICY "Providers can view assigned jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_providers sp 
    WHERE sp.id = jobs.provider_id AND sp.user_id = auth.uid()
  ));
