
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS parent_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pl_account_number text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS address_line3 text,
  ADD COLUMN IF NOT EXISTS town_city text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS provides_parts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provides_tyres boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provides_workshop boolean NOT NULL DEFAULT false;
