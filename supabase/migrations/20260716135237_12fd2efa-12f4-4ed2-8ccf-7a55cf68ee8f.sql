
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS address_line3 text,
  ADD COLUMN IF NOT EXISTS town_city text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS start_date timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS pin text,
  ADD COLUMN IF NOT EXISTS employee_number text,
  ADD COLUMN IF NOT EXISTS ni_number text,
  ADD COLUMN IF NOT EXISTS labour_type text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'technicians_status_check') THEN
    ALTER TABLE public.technicians
      ADD CONSTRAINT technicians_status_check
      CHECK (status IN ('active','account_locked','deleted'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_technicians_workshop_id ON public.technicians(workshop_id);
