
CREATE TABLE public.smr_part_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smr_item_id uuid NOT NULL REFERENCES public.smr_items(id) ON DELETE CASCADE,
  smr_work_detail_id uuid NOT NULL REFERENCES public.smr_work_details(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  vat_band_id uuid REFERENCES public.vat_bands(id),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.smr_part_details TO authenticated;
GRANT ALL ON public.smr_part_details TO service_role;

ALTER TABLE public.smr_part_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view smr part details"
  ON public.smr_part_details FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert smr part details"
  ON public.smr_part_details FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update smr part details"
  ON public.smr_part_details FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete smr part details"
  ON public.smr_part_details FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at_smr_part_details()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_smr_part_details_updated_at
  BEFORE UPDATE ON public.smr_part_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_smr_part_details();

CREATE INDEX idx_smr_part_details_item ON public.smr_part_details(smr_item_id);
CREATE INDEX idx_smr_part_details_wd ON public.smr_part_details(smr_work_detail_id);
