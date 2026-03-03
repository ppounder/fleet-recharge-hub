
-- The previous migration succeeded for the table rename, enum rename, and all RLS policies
-- except it errored on the redundant constraint rename. The table and policies are already updated.
-- This is a no-op migration to confirm state.
SELECT 1;
