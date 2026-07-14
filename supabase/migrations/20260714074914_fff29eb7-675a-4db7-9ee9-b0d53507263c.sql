
-- Customer type enum
DO $$ BEGIN
  CREATE TYPE public.customer_type AS ENUM ('broker','corporate','internal','public_sector','retail');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS parent_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sl_account_number text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS address_line3 text,
  ADD COLUMN IF NOT EXISTS town_city text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS internal_company boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_type public.customer_type;

-- Customer contacts
CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  position text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_contacts TO authenticated;
GRANT ALL ON public.customer_contacts TO service_role;

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view customer contacts"
  ON public.customer_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert customer contacts"
  ON public.customer_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update customer contacts"
  ON public.customer_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete customer contacts"
  ON public.customer_contacts FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at_customer_contacts()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_customer_contacts_updated_at ON public.customer_contacts;
CREATE TRIGGER trg_customer_contacts_updated_at
  BEFORE UPDATE ON public.customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_customer_contacts();
