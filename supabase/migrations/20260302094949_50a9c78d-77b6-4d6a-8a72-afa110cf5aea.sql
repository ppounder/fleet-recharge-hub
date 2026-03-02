
-- VAT Bands table
CREATE TABLE public.vat_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  percentage numeric NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vat_bands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own vat bands"
ON public.vat_bands FOR ALL
USING (EXISTS (
  SELECT 1 FROM service_providers sp WHERE sp.id = vat_bands.provider_id AND sp.user_id = auth.uid()
));

-- Job Types table
CREATE TABLE public.job_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  vat_band_id uuid REFERENCES public.vat_bands(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own job types"
ON public.job_types FOR ALL
USING (EXISTS (
  SELECT 1 FROM service_providers sp WHERE sp.id = job_types.provider_id AND sp.user_id = auth.uid()
));

-- Fleet managers should also be able to see job types and vat bands for providers they have agreements with
CREATE POLICY "Fleet managers can view job types via commercial terms"
ON public.job_types FOR SELECT
USING (has_role(auth.uid(), 'fleet-manager'::app_role) AND EXISTS (
  SELECT 1 FROM commercial_terms ct
  WHERE ct.provider_id = job_types.provider_id
  AND ct.fleet_id IN (SELECT p.fleet_id FROM profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL)
));

CREATE POLICY "Fleet managers can view vat bands via commercial terms"
ON public.vat_bands FOR SELECT
USING (has_role(auth.uid(), 'fleet-manager'::app_role) AND EXISTS (
  SELECT 1 FROM commercial_terms ct
  WHERE ct.provider_id = vat_bands.provider_id
  AND ct.fleet_id IN (SELECT p.fleet_id FROM profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL)
));
