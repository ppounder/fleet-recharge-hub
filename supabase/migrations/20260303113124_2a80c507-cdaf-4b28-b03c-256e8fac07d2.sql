
-- Create the job activity log table
CREATE TABLE public.job_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS: Fleet managers can view logs for their fleet's jobs
CREATE POLICY "Fleet managers can view job activity logs"
ON public.job_activity_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.id = auth.uid()
    WHERE j.id = job_activity_log.job_id
    AND p.fleet_id IS NOT NULL
    AND j.fleet_id = p.fleet_id
  )
);

-- RLS: Service providers can view logs for their assigned jobs
CREATE POLICY "Providers can view job activity logs"
ON public.job_activity_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN service_providers sp ON sp.id = j.provider_id
    WHERE j.id = job_activity_log.job_id
    AND sp.user_id = auth.uid()
  )
);

-- RLS: Authenticated users can insert logs (for their own actions)
CREATE POLICY "Authenticated users can insert activity logs"
ON public.job_activity_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Index for fast lookups by job
CREATE INDEX idx_job_activity_log_job_id ON public.job_activity_log(job_id);
CREATE INDEX idx_job_activity_log_created_at ON public.job_activity_log(created_at);
