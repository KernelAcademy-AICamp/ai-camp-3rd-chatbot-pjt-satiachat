# Supabase RLS Authentication Debugging Guide

## Problem: `auth.uid()` Returns NULL in RLS Policies

This guide helps diagnose and fix issues where RLS policies fail because `auth.uid()` evaluates to NULL, even when the client is properly authenticated.

---

## Common Causes

### 1. JWT Token Not Sent to PostgREST

**Symptom**: Client has valid session, but `auth.uid()` is NULL on server.

**Diagnosis**:
```typescript
// Check if session exists in client
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Access Token:', session?.access_token);
```

**Solution**: Ensure Supabase client is configured with proper auth settings.

```typescript
// ✅ CORRECT: Explicit auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,    // Auto-refresh expired tokens
    persistSession: true,       // Persist session to localStorage
    detectSessionInUrl: true,   // Detect session from URL (OAuth)
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
  },
});

// ❌ WRONG: Missing auth config
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

### 2. Token Expired or Invalid

**Symptom**: Works initially, then fails after 1 hour.

**Diagnosis**:
```sql
-- In Supabase SQL Editor, check JWT validity
SELECT
  auth.jwt() AS current_jwt,
  (auth.jwt() ->> 'exp')::int AS expiry_timestamp,
  to_timestamp((auth.jwt() ->> 'exp')::int) AS expiry_time,
  now() AS current_time,
  to_timestamp((auth.jwt() ->> 'exp')::int) < now() AS is_expired;
```

**Solution**: Enable auto-refresh in client config (see above).

---

### 3. RLS Policy Syntax Error

**Symptom**: Policy exists but never matches.

**Common Mistakes**:
```sql
-- ❌ WRONG: Using wrong function
USING (current_user = user_id::text)  -- current_user is database role, not user ID

-- ❌ WRONG: Type mismatch
USING (auth.uid() = user_id::text)  -- auth.uid() returns UUID, not text

-- ✅ CORRECT: Proper type matching
USING (auth.uid() = user_id)
```

**Diagnosis**:
```sql
-- Test policy logic manually
SELECT
  auth.uid() AS authenticated_user_id,
  user_id,
  auth.uid() = user_id AS policy_match
FROM comments
WHERE id = 'your-comment-id';
```

---

### 4. Multiple Supabase Client Instances

**Symptom**: Some requests work, others don't.

**Problem**: Creating multiple `createClient()` instances can lead to session desync.

**Solution**:
```typescript
// ✅ CORRECT: Single client instance
// src/lib/supabase.ts
export const supabase = createClient(url, key, options);

// ✅ CORRECT: Import everywhere
import { supabase } from '@/lib/supabase';

// ❌ WRONG: Creating new instances
const supabase = createClient(url, key); // DON'T DO THIS
```

---

### 5. Session Not Loaded Before API Call

**Symptom**: First request after page load fails, subsequent requests succeed.

**Problem**: React component makes API call before `AuthContext` loads session.

**Solution**:
```typescript
// ✅ CORRECT: Wait for auth to load
export function ProtectedComponent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Now safe to make authenticated requests
  const { data } = useComments();
  // ...
}
```

---

## Debugging Checklist

### Client-Side Checks

1. **Verify session exists**:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Session:', session);
   ```

2. **Check localStorage**:
   ```javascript
   // In browser console
   localStorage.getItem('supabase.auth.token')
   ```

3. **Inspect network request**:
   - Open DevTools → Network tab
   - Look for request to `https://your-project.supabase.co/rest/v1/comments`
   - Verify `Authorization: Bearer <token>` header exists

4. **Decode JWT token**:
   ```javascript
   // Use https://jwt.io to decode token
   // Verify 'sub' claim matches user ID
   ```

### Server-Side Checks (Supabase SQL Editor)

1. **Test auth.uid() directly**:
   ```sql
   SELECT auth.uid();  -- Should return your user UUID
   ```

   If NULL:
   - Click "RLS disabled" → "RLS enabled" toggle in SQL Editor
   - Click your profile icon → Copy your JWT token
   - Run: `SET request.jwt.claims = '{"sub": "your-user-id"}';`

2. **Test RLS policy logic**:
   ```sql
   -- Manually test UPDATE policy
   SELECT
     auth.uid() AS my_user_id,
     user_id AS comment_owner_id,
     auth.uid() = user_id AS can_update
   FROM comments
   WHERE id = 'comment-id-to-test';
   ```

3. **Check policy coverage**:
   ```sql
   -- List all policies on comments table
   SELECT
     schemaname,
     tablename,
     policyname,
     permissive,
     roles,
     cmd,
     qual,
     with_check
   FROM pg_policies
   WHERE tablename = 'comments';
   ```

4. **Simulate RLS as authenticated user**:
   ```sql
   -- Set your JWT claims manually
   SET request.jwt.claims = jsonb_build_object(
     'sub', 'your-user-id',
     'role', 'authenticated'
   );

   -- Now test queries
   SELECT * FROM comments;  -- Should work
   UPDATE comments SET deleted_at = now() WHERE id = 'your-comment';  -- Should work
   UPDATE comments SET deleted_at = now() WHERE user_id != 'your-user-id';  -- Should fail
   ```

---

## Common Error Messages

### "new row violates row-level security policy"

**Cause**: INSERT policy's `WITH CHECK` clause failed.

**Fix**: Verify you're setting `user_id` to `auth.uid()`:
```typescript
// ✅ CORRECT
const { data, error } = await supabase
  .from('comments')
  .insert({ user_id: user.id, content: 'Hello' });

// ❌ WRONG: Missing user_id
const { data, error } = await supabase
  .from('comments')
  .insert({ content: 'Hello' });
```

### "PGRST116: Permission denied for table comments"

**Cause**: No matching RLS policy for operation.

**Fix**: Check policies exist for the operation (SELECT/INSERT/UPDATE/DELETE).

### "JWT expired"

**Cause**: Access token expired (default: 1 hour).

**Fix**: Enable `autoRefreshToken: true` in client config (see Solution 1).

---

## Production Best Practices

### 1. Use Service Role Key for Admin Operations

```typescript
// ⚠️ SECURITY WARNING: Never expose service role key in client!
// Only use in server-side code (e.g., API routes, Edge Functions)

import { createClient } from '@supabase/supabase-js';

// Server-side only
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Bypasses RLS
);

// Hard delete (admin only)
await supabaseAdmin.from('comments').delete().eq('id', commentId);
```

### 2. Add Error Handling for RLS Violations

```typescript
try {
  const { data, error } = await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);

  if (error) {
    // Check for RLS violation
    if (error.code === 'PGRST116') {
      throw new Error('You do not have permission to delete this comment');
    }
    throw error;
  }

  return data;
} catch (err) {
  console.error('Failed to delete comment:', err);
  throw err;
}
```

### 3. Add Observability

```typescript
// Log RLS failures for monitoring
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  }
});
```

### 4. Test RLS Policies in CI/CD

```sql
-- tests/rls_tests.sql
BEGIN;

-- Set up test user
SELECT set_config('request.jwt.claims', '{"sub": "test-user-id"}', true);

-- Test: User can update own comment
UPDATE comments SET content = 'Updated' WHERE user_id = 'test-user-id';
-- Expected: 1 row updated

-- Test: User cannot update others' comments
UPDATE comments SET content = 'Hacked' WHERE user_id != 'test-user-id';
-- Expected: 0 rows updated

ROLLBACK;
```

---

## Quick Fix Summary

If you're experiencing RLS issues, try these in order:

1. ✅ Add explicit auth config to `createClient()`
2. ✅ Verify `auth.uid()` in SQL Editor
3. ✅ Check network request has `Authorization` header
4. ✅ Decode JWT token and verify `sub` claim
5. ✅ Test RLS policy logic manually in SQL
6. ✅ Ensure only one Supabase client instance
7. ✅ Wait for `isLoading: false` before API calls

---

## Testing Your Fix

### Test Scenario 1: Update Own Comment
```typescript
const { user } = useAuth();
const { mutate: softDelete } = useSoftDeleteComment();

// Should succeed (user owns this comment)
softDelete(commentId);
```

### Test Scenario 2: Update Someone Else's Comment
```typescript
// Should fail with permission error
softDelete(someoneElsesCommentId);
// Expected: "You do not have permission to delete this comment"
```

### Test Scenario 3: Token Refresh
```typescript
// Wait 1+ hours, then make request
// Should auto-refresh and succeed (if autoRefreshToken: true)
const { data } = await supabase.from('comments').select('*');
```

---

## Need More Help?

If you're still experiencing issues after following this guide:

1. Check Supabase Dashboard → Logs → Postgres Logs for RLS errors
2. Enable Supabase client debug mode:
   ```typescript
   localStorage.setItem('supabase.auth.debug', 'true');
   ```
3. Share your RLS policy definition and error message in Supabase Discord/GitHub

---

**Last Updated**: 2024-12-06
**Author**: Claude Code (AI Backend Engineer)
