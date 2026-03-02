
-- Rename the job_types table to work_categories
ALTER TABLE public.job_types RENAME TO work_categories;

-- Update foreign key constraint name on vat_band_id if it references vat_bands
-- (the constraint itself doesn't need changing, just the table name is renamed)

-- Update RLS policies to reference the new table name
-- Drop old policies
DROP POLICY IF EXISTS "Fleet managers can view job types via commercial terms" ON public.work_categories;
DROP POLICY IF EXISTS "Providers can manage own job types" ON public.work_categories;

-- Re-create policies with updated names
CREATE POLICY "Fleet managers can view work categories via commercial terms"
  ON public.work_categories
  FOR SELECT
  USING (
    has_role(auth.uid(), 'fleet-manager'::app_role)
    AND EXISTS (
      SELECT 1 FROM commercial_terms ct
      WHERE ct.provider_id = work_categories.provider_id
      AND ct.fleet_id IN (
        SELECT p.fleet_id FROM profiles p
        WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Providers can manage own work categories"
  ON public.work_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM service_providers sp
      WHERE sp.id = work_categories.provider_id AND sp.user_id = auth.uid()
    )
  );
