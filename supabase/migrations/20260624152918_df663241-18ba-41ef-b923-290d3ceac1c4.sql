ALTER TABLE public.vehicle_defects
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS damage_marks jsonb NOT NULL DEFAULT '[]'::jsonb;