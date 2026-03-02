
-- Create work_item_labour table to store labour charges per work item
CREATE TABLE public.work_item_labour (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_id uuid NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  labour_rate_id uuid NOT NULL REFERENCES public.labour_rates(id),
  labour_rate_name text NOT NULL DEFAULT '',
  cost_per_unit numeric NOT NULL DEFAULT 0,
  units numeric NOT NULL DEFAULT 1,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_item_labour ENABLE ROW LEVEL SECURITY;

-- Providers can manage labour charges on their jobs
CREATE POLICY "Providers can manage work item labour"
  ON public.work_item_labour
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_items wi
      JOIN jobs j ON j.id = wi.job_id
      JOIN service_providers sp ON sp.id = j.provider_id
      WHERE wi.id = work_item_labour.work_item_id AND sp.user_id = auth.uid()
    )
  );

-- Fleet managers can manage work item labour
CREATE POLICY "Fleet managers can manage work item labour"
  ON public.work_item_labour
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_items wi
      JOIN jobs j ON j.id = wi.job_id
      WHERE wi.id = work_item_labour.work_item_id AND j.fleet_manager_id = auth.uid()
    )
  );

-- View policy for all relevant roles
CREATE POLICY "Users can view work item labour for accessible jobs"
  ON public.work_item_labour
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_items wi
      JOIN jobs j ON j.id = wi.job_id
      WHERE wi.id = work_item_labour.work_item_id
        AND (
          j.fleet_manager_id = auth.uid()
          OR j.customer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
        )
    )
  );
