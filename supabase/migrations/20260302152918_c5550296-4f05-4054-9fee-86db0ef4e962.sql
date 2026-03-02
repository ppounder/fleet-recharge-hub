
CREATE TABLE public.menu_item_labour (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.provider_menu_items(id) ON DELETE CASCADE,
  labour_rate_id uuid NOT NULL REFERENCES public.labour_rates(id) ON DELETE CASCADE,
  units numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_item_labour ENABLE ROW LEVEL SECURITY;

-- Providers can manage menu item labour via their menu items
CREATE POLICY "Providers can manage menu item labour"
ON public.menu_item_labour
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.provider_menu_items pmi
    JOIN public.service_providers sp ON sp.id = pmi.provider_id
    WHERE pmi.id = menu_item_labour.menu_item_id
    AND sp.user_id = auth.uid()
  )
);

-- Fleet managers can view menu item labour for their fleet
CREATE POLICY "Fleet managers can view menu item labour"
ON public.menu_item_labour
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'fleet-manager'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.provider_menu_items pmi
    WHERE pmi.id = menu_item_labour.menu_item_id
    AND pmi.fleet_id IN (
      SELECT p.fleet_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL
    )
  )
);

-- Fleet managers can manage menu item labour for their fleet
CREATE POLICY "Fleet managers can manage menu item labour"
ON public.menu_item_labour
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'fleet-manager'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.provider_menu_items pmi
    WHERE pmi.id = menu_item_labour.menu_item_id
    AND pmi.fleet_id IN (
      SELECT p.fleet_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL
    )
  )
);
