-- Step 1: Drop old FK to auth.users
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_fleet_manager_id_fkey;

-- Step 2: Backfill fleet_manager_id with actual fleet_id from profiles
UPDATE public.jobs j
SET fleet_manager_id = p.fleet_id
FROM public.profiles p
WHERE p.id = j.fleet_manager_id
  AND p.fleet_id IS NOT NULL;

-- Step 3: Fallback via vehicle
UPDATE public.jobs j
SET fleet_manager_id = v.fleet_id
FROM public.vehicles v
WHERE v.id = j.vehicle_id
  AND v.fleet_id IS NOT NULL
  AND (
    j.fleet_manager_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.fleets f WHERE f.id = j.fleet_manager_id)
  );

-- Step 4: Null out invalid values
UPDATE public.jobs j
SET fleet_manager_id = NULL
WHERE j.fleet_manager_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.fleets f WHERE f.id = j.fleet_manager_id);

-- Step 5: Rename column
ALTER TABLE public.jobs RENAME COLUMN fleet_manager_id TO fleet_id;

-- Step 6: Add FK to fleets + index
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_fleet_id_fkey
  FOREIGN KEY (fleet_id) REFERENCES public.fleets(id);

CREATE INDEX IF NOT EXISTS idx_jobs_fleet_id ON public.jobs(fleet_id);

-- Step 7: Update RLS policies
DROP POLICY IF EXISTS "Fleet managers can manage jobs" ON public.jobs;
CREATE POLICY "Fleet managers can manage jobs"
ON public.jobs FOR ALL USING (
  has_role(auth.uid(), 'fleet-manager'::app_role)
  AND (fleet_id IS NULL OR fleet_id IN (SELECT p.fleet_id FROM profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL))
);

DROP POLICY IF EXISTS "Fleet managers can manage estimate items" ON public.work_items;
CREATE POLICY "Fleet managers can manage estimate items"
ON public.work_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE j.id = work_items.job_id AND p.fleet_id IS NOT NULL AND j.fleet_id = p.fleet_id
  )
);

DROP POLICY IF EXISTS "Users can view estimate items for accessible jobs" ON public.work_items;
CREATE POLICY "Users can view estimate items for accessible jobs"
ON public.work_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = work_items.job_id AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL AND p.fleet_id = j.fleet_id)
      OR j.customer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Fleet managers can manage work item labour" ON public.work_item_labour;
CREATE POLICY "Fleet managers can manage work item labour"
ON public.work_item_labour FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.work_items wi
    JOIN public.jobs j ON j.id = wi.job_id
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE wi.id = work_item_labour.work_item_id AND p.fleet_id IS NOT NULL AND j.fleet_id = p.fleet_id
  )
);

DROP POLICY IF EXISTS "Users can view work item labour for accessible jobs" ON public.work_item_labour;
CREATE POLICY "Users can view work item labour for accessible jobs"
ON public.work_item_labour FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.work_items wi
    JOIN public.jobs j ON j.id = wi.job_id
    WHERE wi.id = work_item_labour.work_item_id AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL AND p.fleet_id = j.fleet_id)
      OR j.customer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
    )
  )
);