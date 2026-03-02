
ALTER TABLE public.provider_menu_items
  ADD COLUMN work_code_id uuid REFERENCES public.work_codes(id) ON DELETE SET NULL;
