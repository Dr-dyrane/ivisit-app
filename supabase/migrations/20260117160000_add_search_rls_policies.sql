-- Migration: Add RLS policies to search tables
-- Description: Implement Row Level Security for search tables following Apple privacy standards

-- Enable RLS on search tables if not already enabled
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_selections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own search history" ON search_history;
DROP POLICY IF EXISTS "Users can insert own search history" ON search_history;
DROP POLICY IF EXISTS "Users can update own search history" ON search_history;
DROP POLICY IF EXISTS "Users can delete own search history" ON search_history;

DROP POLICY IF EXISTS "Users can view own search selections" ON search_selections;
DROP POLICY IF EXISTS "Users can insert own search selections" ON search_selections;
DROP POLICY IF EXISTS "Users can update own search selections" ON search_selections;
DROP POLICY IF EXISTS "Users can delete own search selections" ON search_selections;

-- Create user-only RLS policies for search_history (Apple privacy standard)
CREATE POLICY "Users can only access own search history"
ON search_history FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user-only RLS policies for search_selections (Apple privacy standard)
CREATE POLICY "Users can only access own search selections"
ON search_selections FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
