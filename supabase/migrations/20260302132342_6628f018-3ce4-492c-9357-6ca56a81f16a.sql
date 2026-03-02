-- Rename the table
ALTER TABLE public.estimate_items RENAME TO work_items;

-- Rename the foreign key constraint
ALTER TABLE public.work_items RENAME CONSTRAINT estimate_items_job_id_fkey TO work_items_job_id_fkey;
