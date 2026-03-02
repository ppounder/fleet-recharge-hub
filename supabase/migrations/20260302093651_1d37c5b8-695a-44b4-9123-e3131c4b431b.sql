
CREATE TABLE public.commercial_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  fleet_id uuid NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (provider_id, fleet_id)
);

ALTER TABLE public.commercial_terms ENABLE ROW LEVEL SECURITY;

-- Service providers can manage their own terms
CREATE POLICY "Providers can manage own commercial terms"
ON public.commercial_terms
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.service_providers sp
    WHERE sp.id = commercial_terms.provider_id AND sp.user_id = auth.uid()
  )
);

-- Fleet managers can view/manage terms for their fleet
CREATE POLICY "Fleet managers can manage commercial terms for their fleet"
ON public.commercial_terms
FOR ALL
USING (
  has_role(auth.uid(), 'fleet-manager'::app_role)
  AND fleet_id IN (
    SELECT p.fleet_id FROM profiles p WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL
  )
);
