
CREATE OR REPLACE FUNCTION public.set_updated_at_supplier_contacts()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.supplier_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_contacts TO authenticated;
GRANT ALL ON public.supplier_contacts TO service_role;

ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view supplier contacts"
  ON public.supplier_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert supplier contacts"
  ON public.supplier_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update supplier contacts"
  ON public.supplier_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete supplier contacts"
  ON public.supplier_contacts FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_supplier_contacts_supplier_id ON public.supplier_contacts(supplier_id);

CREATE TRIGGER update_supplier_contacts_updated_at
  BEFORE UPDATE ON public.supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_supplier_contacts();
