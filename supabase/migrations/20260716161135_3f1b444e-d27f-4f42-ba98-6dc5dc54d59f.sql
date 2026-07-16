ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
WITH ranked AS (SELECT id, ROW_NUMBER() OVER (PARTITION BY fleet_id ORDER BY last_name, first_name) - 1 AS rn FROM public.technicians)
UPDATE public.technicians t SET sort_order = ranked.rn FROM ranked WHERE ranked.id = t.id;