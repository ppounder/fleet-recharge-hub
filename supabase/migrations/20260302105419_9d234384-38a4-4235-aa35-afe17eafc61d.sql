
CREATE TABLE public.work_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  work_category_id uuid NOT NULL REFERENCES public.work_categories(id) ON DELETE CASCADE,
  vat_band_id uuid REFERENCES public.vat_bands(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own work codes"
  ON public.work_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_providers sp
      WHERE sp.id = work_codes.provider_id AND sp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_providers sp
      WHERE sp.id = work_codes.provider_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Fleet managers can view work codes via commercial terms"
  ON public.work_codes FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'fleet-manager'::app_role)
    AND EXISTS (
      SELECT 1 FROM commercial_terms ct
      WHERE ct.provider_id = work_codes.provider_id
        AND ct.fleet_id IN (
          SELECT p.fleet_id FROM profiles p
          WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL
        )
    )
  );
