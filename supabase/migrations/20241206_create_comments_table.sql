-- =============================================
-- Comments Table with RLS Policies
-- =============================================
-- This migration creates a comments table with proper RLS policies
-- to ensure users can only modify their own comments.

-- 1. Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL, -- Soft delete timestamp

  CONSTRAINT content_not_empty CHECK (char_length(content) > 0),
  CONSTRAINT content_max_length CHECK (char_length(content) <= 5000)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON public.comments(deleted_at) WHERE deleted_at IS NULL;

-- 3. Enable Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view all non-deleted comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can soft delete their own comments" ON public.comments;

-- 5. Create RLS Policies

-- Policy 1: Anyone can view non-deleted comments
CREATE POLICY "Users can view all non-deleted comments"
ON public.comments
FOR SELECT
USING (deleted_at IS NULL);

-- Policy 2: Authenticated users can insert comments
CREATE POLICY "Users can insert their own comments"
ON public.comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update only their own comments
CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can soft delete only their own comments
-- (This is handled by the UPDATE policy above, but kept for clarity)
CREATE POLICY "Users can soft delete their own comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = user_id AND deleted_at IS NULL)
WITH CHECK (auth.uid() = user_id);

-- 6. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Attach trigger to comments table
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;

-- =============================================
-- Testing the RLS Policies
-- =============================================
-- Run these queries in SQL Editor to verify RLS works correctly

-- Test 1: Verify auth.uid() is set (should return your user ID)
-- SELECT auth.uid();

-- Test 2: Insert a comment (should succeed)
-- INSERT INTO public.comments (user_id, content)
-- VALUES (auth.uid(), 'Test comment');

-- Test 3: View your comments (should show your comment)
-- SELECT * FROM public.comments WHERE user_id = auth.uid();

-- Test 4: Soft delete your comment (should succeed)
-- UPDATE public.comments
-- SET deleted_at = now()
-- WHERE user_id = auth.uid() AND id = 'your-comment-id';

-- Test 5: Try to update someone else's comment (should fail with RLS error)
-- UPDATE public.comments
-- SET content = 'Hacked!'
-- WHERE user_id != auth.uid();
