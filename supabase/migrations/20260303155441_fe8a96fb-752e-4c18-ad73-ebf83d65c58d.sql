
-- Create customers table mirroring suppliers
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text,
  contact_email text,
  contact_phone text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Fleet managers can manage customers
CREATE POLICY "Fleet managers can manage customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fleet-manager'::app_role));

-- Customers can view own record
CREATE POLICY "Customers can view own record"
  ON public.customers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Suppliers can view customers linked to their jobs
CREATE POLICY "Suppliers can view customers via jobs"
  ON public.customers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.suppliers sp ON sp.id = j.provider_id
    WHERE j.customer_id = customers.id AND sp.user_id = auth.uid()
  ));
