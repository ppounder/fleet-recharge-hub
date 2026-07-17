
-- Extend parts
ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS part_type TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer_id UUID,
  ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS superseded_by_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS alternative_part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warranty_value INTEGER,
  ADD COLUMN IF NOT EXISTS warranty_unit TEXT,
  ADD COLUMN IF NOT EXISTS applicable_asset_types TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_makes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_models TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_derivatives TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_weight_bands TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_axles INTEGER[] NOT NULL DEFAULT '{}';

-- Manufacturers
CREATE TABLE IF NOT EXISTS public.part_manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.part_manufacturers TO authenticated;
GRANT ALL ON public.part_manufacturers TO service_role;
ALTER TABLE public.part_manufacturers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers manage own manufacturers" ON public.part_manufacturers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = part_manufacturers.provider_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = part_manufacturers.provider_id AND s.user_id = auth.uid()));
CREATE POLICY "Fleet managers view manufacturers via commercial terms" ON public.part_manufacturers
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'fleet-manager'::app_role) AND EXISTS (
    SELECT 1 FROM public.commercial_terms ct
    WHERE ct.provider_id = part_manufacturers.provider_id
      AND ct.fleet_id IN (SELECT p.fleet_id FROM public.profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL)
  ));

-- Posting definitions
CREATE TABLE IF NOT EXISTS public.posting_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posting_definitions TO authenticated;
GRANT ALL ON public.posting_definitions TO service_role;
ALTER TABLE public.posting_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers manage own posting defs" ON public.posting_definitions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = posting_definitions.provider_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = posting_definitions.provider_id AND s.user_id = auth.uid()));
CREATE POLICY "Fleet managers view posting defs via commercial terms" ON public.posting_definitions
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'fleet-manager'::app_role) AND EXISTS (
    SELECT 1 FROM public.commercial_terms ct
    WHERE ct.provider_id = posting_definitions.provider_id
      AND ct.fleet_id IN (SELECT p.fleet_id FROM public.profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL)
  ));

-- Stock items
CREATE TABLE IF NOT EXISTS public.parts_stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  parts_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Each',
  pack_size INTEGER,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  rrp NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_category TEXT NOT NULL DEFAULT 'Own stock',
  vat_band_id UUID REFERENCES public.vat_bands(id) ON DELETE SET NULL,
  bin_number TEXT,
  bin_location TEXT,
  posting_definition_id UUID REFERENCES public.posting_definitions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parts_stock_items_part_id_idx ON public.parts_stock_items(part_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_stock_items TO authenticated;
GRANT ALL ON public.parts_stock_items TO service_role;
ALTER TABLE public.parts_stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers manage own stock items" ON public.parts_stock_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.parts p
    JOIN public.suppliers s ON s.id = p.provider_id
    WHERE p.id = parts_stock_items.part_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.parts p
    JOIN public.suppliers s ON s.id = p.provider_id
    WHERE p.id = parts_stock_items.part_id AND s.user_id = auth.uid()
  ));
CREATE POLICY "Fleet managers view stock items via commercial terms" ON public.parts_stock_items
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'fleet-manager'::app_role) AND EXISTS (
    SELECT 1 FROM public.parts p
    JOIN public.commercial_terms ct ON ct.provider_id = p.provider_id
    WHERE p.id = parts_stock_items.part_id
      AND ct.fleet_id IN (SELECT pr.fleet_id FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.fleet_id IS NOT NULL)
  ));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at_parts_related()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_part_manufacturers_updated_at ON public.part_manufacturers;
CREATE TRIGGER trg_part_manufacturers_updated_at BEFORE UPDATE ON public.part_manufacturers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_parts_related();

DROP TRIGGER IF EXISTS trg_posting_definitions_updated_at ON public.posting_definitions;
CREATE TRIGGER trg_posting_definitions_updated_at BEFORE UPDATE ON public.posting_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_parts_related();

DROP TRIGGER IF EXISTS trg_parts_stock_items_updated_at ON public.parts_stock_items;
CREATE TRIGGER trg_parts_stock_items_updated_at BEFORE UPDATE ON public.parts_stock_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_parts_related();
