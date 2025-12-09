# RLS Security & Production Checklist

## Pre-Deployment Checklist

### 1. Authentication Configuration

- [ ] Supabase client has explicit auth config:
  ```typescript
  createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  ```

- [ ] Only ONE Supabase client instance created (in `src/lib/supabase.ts`)
- [ ] All components import from central client (`import { supabase } from '@/lib/supabase'`)
- [ ] Protected routes check `isLoading: false` before rendering
- [ ] Environment variables properly set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 2. RLS Policies

- [ ] RLS enabled on ALL tables: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- [ ] Policies created for all operations (SELECT, INSERT, UPDATE, DELETE)
- [ ] Policies use correct functions:
  - `auth.uid()` for authenticated user ID (returns UUID)
  - NOT `current_user` (database role name)
  - NOT `session_user` (database role name)

- [ ] Policies tested with correct types:
  ```sql
  -- ✅ CORRECT
  USING (auth.uid() = user_id)

  -- ❌ WRONG (type mismatch)
  USING (auth.uid() = user_id::text)
  ```

- [ ] WITH CHECK clause included for INSERT/UPDATE policies:
  ```sql
  CREATE POLICY "Users can insert own records"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  ```

### 3. Security Vulnerabilities

- [ ] Service role key NEVER exposed in client code
- [ ] Service role key only used in:
  - Server-side API routes
  - Supabase Edge Functions
  - CI/CD scripts
  - Admin panels with separate authentication

- [ ] Anon key used in client (frontend)
- [ ] No hardcoded user IDs in client code
- [ ] Input validation before database operations (Zod schemas)
- [ ] SQL injection prevention (parameterized queries via Supabase client)

### 4. Error Handling

- [ ] RLS errors caught and user-friendly messages shown:
  ```typescript
  if (error.code === 'PGRST116') {
    throw new Error('Permission denied');
  }
  ```

- [ ] Network errors handled gracefully
- [ ] Token expiry handled by auto-refresh
- [ ] Unauthorized access redirects to login

### 5. Performance

- [ ] Indexes created on foreign keys:
  ```sql
  CREATE INDEX idx_table_user_id ON table_name(user_id);
  ```

- [ ] Soft delete queries filter efficiently:
  ```sql
  CREATE INDEX idx_table_deleted_at ON table_name(deleted_at)
  WHERE deleted_at IS NULL;
  ```

- [ ] Pagination implemented for list endpoints
- [ ] React Query caching configured properly

### 6. Testing

- [ ] RLS policies tested in SQL Editor:
  ```sql
  -- Set JWT claims manually
  SET request.jwt.claims = '{"sub": "user-id"}';

  -- Test queries
  SELECT * FROM table_name;  -- Should work
  UPDATE table_name SET ... WHERE user_id != 'user-id';  -- Should fail
  ```

- [ ] Integration tests for:
  - [ ] User can create own records
  - [ ] User can update own records
  - [ ] User cannot update others' records
  - [ ] User cannot delete others' records
  - [ ] Anonymous users have read-only access (if applicable)

- [ ] Token refresh tested (wait 1+ hour)
- [ ] Logout clears session properly
- [ ] Multiple browser tabs stay in sync

### 7. Monitoring & Logging

- [ ] Error tracking set up (Sentry, LogRocket, etc.)
- [ ] RLS violations logged:
  ```typescript
  if (error.code === 'PGRST116') {
    console.error('RLS violation:', { userId, operation, table });
  }
  ```

- [ ] Auth state changes monitored:
  ```typescript
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event);
  });
  ```

- [ ] Supabase Dashboard → Logs reviewed regularly

### 8. Database Migrations

- [ ] Migrations are idempotent (can run multiple times)
- [ ] Migrations include rollback strategy
- [ ] Policies dropped before recreation:
  ```sql
  DROP POLICY IF EXISTS "policy_name" ON table_name;
  CREATE POLICY "policy_name" ...
  ```

- [ ] Migrations tested in staging environment first

### 9. Documentation

- [ ] RLS policies documented in code comments
- [ ] API documentation includes authentication requirements
- [ ] Error codes documented for frontend team
- [ ] Database schema documented (ER diagram, table descriptions)

### 10. Compliance

- [ ] GDPR: User data deletion implemented (hard delete after soft delete period)
- [ ] Data retention policy defined
- [ ] User consent tracking (if applicable)
- [ ] Audit logs for sensitive operations (if required)

---

## Production Deployment Steps

1. **Backup Database**:
   ```bash
   # Via Supabase Dashboard: Settings → Database → Backup Now
   ```

2. **Run Migrations**:
   ```bash
   supabase db push
   # OR manually in Supabase SQL Editor
   ```

3. **Verify RLS Policies**:
   ```sql
   SELECT tablename, policyname, cmd
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```

4. **Test in Staging**:
   - [ ] Login/logout works
   - [ ] CRUD operations work for own data
   - [ ] Permission errors shown for unauthorized actions
   - [ ] Token auto-refresh works

5. **Deploy Frontend**:
   ```bash
   npm run build
   # Deploy to Vercel/Netlify/etc.
   ```

6. **Smoke Test Production**:
   - [ ] Create account
   - [ ] Create record
   - [ ] Update record
   - [ ] Delete record
   - [ ] Try to access another user's data (should fail)

7. **Monitor for 24 Hours**:
   - [ ] Check error logs
   - [ ] Verify no RLS violations
   - [ ] Confirm no authentication failures

---

## Troubleshooting Common Issues

### Issue: "Permission denied for table"
**Fix**: Enable RLS and create policies.

### Issue: "auth.uid() is NULL"
**Fix**: Check client auth config and session state.

### Issue: "JWT expired"
**Fix**: Enable `autoRefreshToken: true`.

### Issue: "Policy not working"
**Fix**: Verify policy logic with manual SQL test.

### Issue: "Cannot update record"
**Fix**: Check if record's `user_id` matches `auth.uid()`.

---

## Security Audit Checklist

Run this before every major release:

```bash
# 1. Check for exposed secrets
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/
# Expected: No results

# 2. Check for hardcoded credentials
grep -r "sk-" src/  # OpenAI keys
grep -r "Bearer " src/  # JWT tokens
# Expected: No results

# 3. Verify RLS enabled
# In Supabase SQL Editor:
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
AND NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE pg_policies.tablename = pg_tables.tablename
);
# Expected: Empty result (all tables have policies)
```

---

**Last Updated**: 2024-12-06
**Reviewed By**: Claude Code (Senior Backend Engineer)
