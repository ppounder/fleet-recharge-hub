
CREATE TABLE public.smr_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  applicable_asset_types text[] NOT NULL DEFAULT '{}',
  applicable_makes text[] NOT NULL DEFAULT '{}',
  applicable_models text[] NOT NULL DEFAULT '{}',
  applicable_derivatives text[] NOT NULL DEFAULT '{}',
  applicable_weight_bands text[] NOT NULL DEFAULT '{}',
  applicable_axles int[] NOT NULL DEFAULT '{}',
  fixed_price boolean NOT NULL DEFAULT false,
  labour_net numeric(12,2),
  parts_net numeric(12,2),
  vat_band_id uuid REFERENCES public.vat_bands(id) ON DELETE SET NULL,
  total numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smr_items TO authenticated;
GRANT ALL ON public.smr_items TO service_role;
ALTER TABLE public.smr_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smr_items authenticated all" ON public.smr_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.smr_work_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smr_item_id uuid NOT NULL REFERENCES public.smr_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  checklist_id uuid,
  document_required boolean NOT NULL DEFAULT false,
  reason_for_work text NOT NULL,
  work_type text NOT NULL,
  work_type_other text,
  posting_definition_id uuid,
  labour_hours numeric(6,2) NOT NULL DEFAULT 0,
  vat_band_id uuid REFERENCES public.vat_bands(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smr_work_details TO authenticated;
GRANT ALL ON public.smr_work_details TO service_role;
ALTER TABLE public.smr_work_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smr_work_details authenticated all" ON public.smr_work_details FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at_smr()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_smr_items_updated BEFORE UPDATE ON public.smr_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_smr();
CREATE TRIGGER trg_smr_work_details_updated BEFORE UPDATE ON public.smr_work_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_smr();

CREATE INDEX idx_smr_work_details_item ON public.smr_work_details(smr_item_id);
