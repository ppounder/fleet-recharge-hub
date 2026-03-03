
CREATE TABLE public.job_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;

-- Fleet managers can view/insert comments on their fleet's jobs
CREATE POLICY "Fleet managers can view job comments"
ON public.job_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.id = auth.uid()
    WHERE j.id = job_comments.job_id
    AND p.fleet_id IS NOT NULL
    AND j.fleet_id = p.fleet_id
  )
);

CREATE POLICY "Fleet managers can insert job comments"
ON public.job_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND has_role(auth.uid(), 'fleet-manager')
  AND EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.id = auth.uid()
    WHERE j.id = job_comments.job_id
    AND p.fleet_id IS NOT NULL
    AND j.fleet_id = p.fleet_id
  )
);

-- Service providers can view/insert comments on their assigned jobs
CREATE POLICY "Providers can view job comments"
ON public.job_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN service_providers sp ON sp.id = j.provider_id
    WHERE j.id = job_comments.job_id
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can insert job comments"
ON public.job_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM jobs j
    JOIN service_providers sp ON sp.id = j.provider_id
    WHERE j.id = job_comments.job_id
    AND sp.user_id = auth.uid()
  )
);

-- Customers can view/insert comments on their own jobs
CREATE POLICY "Customers can view job comments"
ON public.job_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_comments.job_id
    AND j.customer_id = auth.uid()
  )
);

CREATE POLICY "Customers can insert job comments"
ON public.job_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_comments.job_id
    AND j.customer_id = auth.uid()
  )
);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_comments;
