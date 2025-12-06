-- =============================================
-- Profile System Enhancement
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- PART 1: DB Initialization (Optional - Run if needed)
-- =============================================

-- Uncomment below to clear all data except foods table
-- WARNING: This will delete ALL user data!

-- TRUNCATE TABLE
--   chat_messages,
--   medication_logs,
--   medications,
--   meal_items,
--   meals,
--   progress_logs,
--   comments,
--   post_reactions,
--   posts,
--   user_profiles
-- CASCADE;

-- Note: You must also delete Auth users from Supabase Dashboard manually

-- =============================================
-- PART 2: Schema Changes
-- =============================================

-- 1. Add avatar_url column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Add nickname unique constraint (case-insensitive)
-- First, create a unique index on lowercase nickname
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_nickname_unique_idx
ON user_profiles (LOWER(nickname))
WHERE nickname IS NOT NULL;

-- =============================================
-- PART 3: RPC Functions
-- =============================================

-- 3. Check nickname availability function
-- IMPORTANT: First drop all existing versions to avoid overload conflicts
DROP FUNCTION IF EXISTS check_nickname_available(TEXT);
DROP FUNCTION IF EXISTS check_nickname_available(TEXT, TEXT);
DROP FUNCTION IF EXISTS check_nickname_available(TEXT, UUID);

-- Parameter accepts TEXT and converts to UUID internally
CREATE OR REPLACE FUNCTION check_nickname_available(
  nickname_to_check TEXT,
  exclude_user_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_excluded_uuid UUID := NULL;
  v_nickname_exists BOOLEAN;
BEGIN
  -- Validate nickname
  IF nickname_to_check IS NULL OR TRIM(nickname_to_check) = '' THEN
    RETURN FALSE;
  END IF;

  -- Convert exclude_user_id TEXT to UUID if provided
  IF exclude_user_id IS NOT NULL AND TRIM(exclude_user_id) != '' THEN
    BEGIN
      v_excluded_uuid := exclude_user_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_excluded_uuid := NULL;
    END;
  END IF;

  -- Check for duplicate nickname
  -- NOTE: user_profiles table uses 'id' as the primary key column (not 'user_id')
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE LOWER(TRIM(nickname)) = LOWER(TRIM(nickname_to_check))
      AND (v_excluded_uuid IS NULL OR id <> v_excluded_uuid)
  ) INTO v_nickname_exists;

  RETURN NOT v_nickname_exists;
END;
$$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================
-- PART 4: Storage Setup Instructions
-- =============================================

-- Run these commands in Supabase Dashboard > Storage:
--
-- 1. Create a new bucket named 'avatars'
-- 2. Set it as PUBLIC bucket
-- 3. Add the following policies:
--
-- Policy 1: Allow public read access
--   - Name: "Public Read"
--   - Allowed operations: SELECT
--   - Policy: true
--
-- Policy 2: Allow authenticated upload to own folder
--   - Name: "Authenticated Upload"
--   - Allowed operations: INSERT
--   - Policy: auth.uid()::text = (storage.foldername(name))[1]
--
-- Policy 3: Allow users to update their own files
--   - Name: "Authenticated Update"
--   - Allowed operations: UPDATE
--   - Policy: auth.uid()::text = (storage.foldername(name))[1]
--
-- Policy 4: Allow users to delete their own files
--   - Name: "Authenticated Delete"
--   - Allowed operations: DELETE
--   - Policy: auth.uid()::text = (storage.foldername(name))[1]

-- =============================================
-- PART 5: Verification Queries
-- =============================================

-- Test nickname availability function:
-- SELECT check_nickname_available('테스트닉네임');
-- SELECT check_nickname_available('테스트닉네임', 'your-user-id-here');

-- Check avatar_url column exists:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'user_profiles' AND column_name = 'avatar_url';
