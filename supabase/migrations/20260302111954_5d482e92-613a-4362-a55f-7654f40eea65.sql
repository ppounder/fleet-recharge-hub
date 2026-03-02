
-- Create labour_rates table
CREATE TABLE public.labour_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  fleet_id UUID NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.labour_rates ENABLE ROW LEVEL SECURITY;

-- Providers can manage own labour rates
CREATE POLICY "Providers can manage own labour rates"
ON public.labour_rates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM service_providers sp
    WHERE sp.id = labour_rates.provider_id AND sp.user_id = auth.uid()
  )
);

-- Fleet managers can manage labour rates for their fleet
CREATE POLICY "Fleet managers can manage labour rates for their fleet"
ON public.labour_rates FOR ALL
USING (
  has_role(auth.uid(), 'fleet-manager'::app_role)
  AND fleet_id IN (
    SELECT p.fleet_id FROM profiles p
    WHERE p.id = auth.uid() AND p.fleet_id IS NOT NULL
  )
);

-- Function to ensure only one default per provider+fleet
CREATE OR REPLACE FUNCTION public.ensure_single_default_labour_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.labour_rates
    SET is_default = false, updated_at = now()
    WHERE provider_id = NEW.provider_id
      AND fleet_id = NEW.fleet_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ensure_single_default_labour_rate
BEFORE INSERT OR UPDATE ON public.labour_rates
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_labour_rate();
