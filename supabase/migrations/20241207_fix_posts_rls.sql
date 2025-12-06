-- =============================================
-- Fix Posts RLS Policy for Soft Delete
-- Run this in Supabase SQL Editor
-- =============================================

-- Problem: Post deletion (soft delete) fails with RLS policy violation (403)
-- Root cause: Same as comments - SELECT policy blocks UPDATE verification

-- 1. Drop existing posts policies
DROP POLICY IF EXISTS "Anyone can read non-deleted posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;

-- 2. Recreate with proper SELECT and UPDATE policies
CREATE POLICY "Anyone can read non-deleted posts" ON posts
  FOR SELECT
  USING (is_deleted = FALSE OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================
-- Verification Query
-- =============================================
-- Run this to check the policies:
-- SELECT * FROM pg_policies WHERE tablename = 'posts';
