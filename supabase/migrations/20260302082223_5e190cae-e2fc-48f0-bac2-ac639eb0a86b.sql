
CREATE TABLE public.provider_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  fleet_id uuid REFERENCES public.fleets(id) ON DELETE CASCADE NOT NULL,
  job_type text NOT NULL DEFAULT 'mot',
  description text NOT NULL DEFAULT '',
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_menu_items ENABLE ROW LEVEL SECURITY;

-- Service providers can manage their own menu items
CREATE POLICY "Providers can manage own menu items"
  ON public.provider_menu_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_menu_items.provider_id
        AND sp.user_id = auth.uid()
    )
  );

-- Fleet managers can view menu items for their fleet
CREATE POLICY "Fleet managers can view menu items for their fleet"
  ON public.provider_menu_items
  FOR SELECT
  TO authenticated
  USING (
    fleet_id IN (
      SELECT p.fleet_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL
    )
  );
