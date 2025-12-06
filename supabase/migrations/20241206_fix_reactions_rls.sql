-- =============================================
-- Fix post_reactions RLS Policy
-- Run this in Supabase SQL Editor
-- =============================================

-- IMPORTANT: post_reactions.user_id is UUID type (not TEXT)
-- So we should NOT use ::text casting

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read reactions" ON post_reactions;
DROP POLICY IF EXISTS "Authenticated users can manage own reactions" ON post_reactions;
DROP POLICY IF EXISTS "Users can insert own reactions" ON post_reactions;
DROP POLICY IF EXISTS "Users can update own reactions" ON post_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON post_reactions;

-- Recreate with correct type (NO casting needed for UUID column)
CREATE POLICY "Anyone can read reactions" ON post_reactions
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert own reactions" ON post_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions" ON post_reactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions" ON post_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================
-- Verification Query
-- =============================================
-- Run this to check the policies:
-- SELECT * FROM pg_policies WHERE tablename = 'post_reactions';
