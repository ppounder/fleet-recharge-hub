
-- Parts table for service providers
CREATE TABLE public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  description text NOT NULL,
  part_number text NOT NULL DEFAULT '',
  vat_band_id uuid REFERENCES public.vat_bands(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own parts"
  ON public.parts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM service_providers sp
    WHERE sp.id = parts.provider_id AND sp.user_id = auth.uid()
  ));

CREATE POLICY "Fleet managers can view parts via commercial terms"
  ON public.parts FOR SELECT
  USING (
    has_role(auth.uid(), 'fleet-manager'::app_role)
    AND EXISTS (
      SELECT 1 FROM commercial_terms ct
      WHERE ct.provider_id = parts.provider_id
        AND ct.fleet_id IN (
          SELECT p.fleet_id FROM profiles p
          WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL
        )
    )
  );

-- Menu item parts linking table
CREATE TABLE public.menu_item_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.provider_menu_items(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_item_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage menu item parts"
  ON public.menu_item_parts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM provider_menu_items pmi
    JOIN service_providers sp ON sp.id = pmi.provider_id
    WHERE pmi.id = menu_item_parts.menu_item_id AND sp.user_id = auth.uid()
  ));

CREATE POLICY "Fleet managers can manage menu item parts"
  ON public.menu_item_parts FOR ALL
  USING (
    has_role(auth.uid(), 'fleet-manager'::app_role)
    AND EXISTS (
      SELECT 1 FROM provider_menu_items pmi
      WHERE pmi.id = menu_item_parts.menu_item_id
        AND pmi.fleet_id IN (
          SELECT p.fleet_id FROM profiles p
          WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL
        )
    )
  );

-- Indexes
CREATE INDEX idx_parts_provider_id ON public.parts(provider_id);
CREATE INDEX idx_menu_item_parts_menu_item_id ON public.menu_item_parts(menu_item_id);
CREATE INDEX idx_menu_item_parts_part_id ON public.menu_item_parts(part_id);
