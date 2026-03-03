
-- Work item parts table (mirrors work_item_labour pattern)
CREATE TABLE public.work_item_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  part_description text NOT NULL DEFAULT '',
  part_number text NOT NULL DEFAULT '',
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  vat_percent numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.work_item_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fleet managers can manage work item parts"
  ON public.work_item_parts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM work_items wi
    JOIN jobs j ON j.id = wi.job_id
    JOIN profiles p ON p.id = auth.uid()
    WHERE wi.id = work_item_parts.work_item_id
      AND p.fleet_id IS NOT NULL AND j.fleet_id = p.fleet_id
  ));

CREATE POLICY "Providers can manage work item parts"
  ON public.work_item_parts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM work_items wi
    JOIN jobs j ON j.id = wi.job_id
    JOIN service_providers sp ON sp.id = j.provider_id
    WHERE wi.id = work_item_parts.work_item_id AND sp.user_id = auth.uid()
  ));

CREATE POLICY "Users can view work item parts for accessible jobs"
  ON public.work_item_parts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM work_items wi
    JOIN jobs j ON j.id = wi.job_id
    WHERE wi.id = work_item_parts.work_item_id
      AND (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL AND p.fleet_id = j.fleet_id)
        OR j.customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
      )
  ));

CREATE INDEX idx_work_item_parts_work_item_id ON public.work_item_parts(work_item_id);
