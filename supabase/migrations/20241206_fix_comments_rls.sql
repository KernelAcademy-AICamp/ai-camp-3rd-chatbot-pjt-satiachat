-- =============================================
-- Fix Comments RLS Policy for Soft Delete
-- Run this in Supabase SQL Editor
-- =============================================

-- Problem: Comment deletion fails with RLS policy violation (42501)
-- Root cause:
--   1. UPDATE policy missing WITH CHECK clause
--   2. Trigger function lacks SECURITY DEFINER

-- 1. Drop existing comments policies
DROP POLICY IF EXISTS "Anyone can read non-deleted comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

-- 2. Recreate with WITH CHECK clause
CREATE POLICY "Anyone can read non-deleted comments" ON comments
  FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE with both USING and WITH CHECK (critical for soft delete)
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Explicit DELETE policy (for hard delete if needed)
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Fix trigger function to bypass RLS when updating posts.comment_count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER
SECURITY DEFINER  -- Critical: bypasses RLS for posts table update
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
      UPDATE posts SET comment_count = comment_count - 1 WHERE id = NEW.post_id;
    ELSIF OLD.is_deleted = TRUE AND NEW.is_deleted = FALSE THEN
      UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_deleted = FALSE THEN
      UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================
-- Verification Query
-- =============================================
-- Run this to check the policies:
-- SELECT * FROM pg_policies WHERE tablename = 'comments';
