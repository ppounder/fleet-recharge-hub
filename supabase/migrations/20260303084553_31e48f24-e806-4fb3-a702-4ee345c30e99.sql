
-- Add authorization status to work items
ALTER TABLE public.work_items
ADD COLUMN auth_status text NOT NULL DEFAULT 'pending';

-- Valid values: 'pending', 'authorisation_requested', 'authorised', 'in_query', 'declined'
COMMENT ON COLUMN public.work_items.auth_status IS 'Authorization status: pending, authorisation_requested, authorised, in_query, declined';
