
-- Create supplier network type enum
CREATE TYPE public.network_type AS ENUM ('internal', 'external');

-- Create supplier_networks table
CREATE TABLE public.supplier_networks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type network_type NOT NULL DEFAULT 'internal',
  api_endpoint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_networks ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view networks
CREATE POLICY "Authenticated users can view supplier networks"
ON public.supplier_networks FOR SELECT
TO authenticated
USING (true);

-- Fleet managers can manage networks
CREATE POLICY "Fleet managers can manage supplier networks"
ON public.supplier_networks FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'fleet-manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'fleet-manager'::app_role));

-- Add network_id to suppliers table
ALTER TABLE public.suppliers
ADD COLUMN network_id UUID REFERENCES public.supplier_networks(id);

-- Seed default networks
INSERT INTO public.supplier_networks (name, type, api_endpoint) VALUES
  ('Internal', 'internal', NULL),
  ('1Link', 'external', 'https://api.1link.example.com/suppliers'),
  ('DAF Check', 'external', 'https://api.dafcheck.example.com/suppliers');
