# RLS Policies & HTTP 406 Error Guide

**Issue:** After registering an employee, the employee record loads with **empty department/position fields** AND a `406 (Not Acceptable)` error appears in the console.

**Status:** Code fixes applied. RLS policies in Supabase need to be configured.

---

# What's Happening

## The 406 Error Explained

```
PATCH https://eoxjathcdzhvdnqifgny.supabase.co/rest/v1/employee?user_id=eq.866a3e3d-98d3-4a6c-a238-6c5783706987&select=* 406 (Not Acceptable)
```

Wait — that says `PATCH` but the URL has `select=*`. That's actually a `GET` (read) request, not an update. PostgREST uses `PATCH` in the URL pattern for filter clauses. The 406 means **the row-level query returned an empty result OR RLS is silently rejecting it**.

**Common cause:** Row Level Security (RLS) on the `employee` table is enabled, but the **admin's session** doesn't have a policy to read **other employees' records** by `user_id`. When the new user logs in, the AuthContext tries to read their employee record, but RLS blocks it.

## Why Department/Position Are Empty

If the new user logs in and the AuthContext fails to load their profile (due to RLS), `profile` becomes `null`, so all fields including `department` and `position` appear empty in the UI.

---

# The Fix: Add RLS Policies in Supabase

You need to add **Row Level Security policies** to the `employee` table so that:
1. Users can read their own employee record
2. Admins can read all employee records
3. Authenticated users can insert employee records (for the registration flow)

## Step-by-Step in Supabase SQL Editor

1. Go to Supabase Dashboard → **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste each policy below one at a time and run them

### Policy 1: Users can read their own employee record

```sql
CREATE POLICY "Users can read their own employee record"
ON public.employee
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = auth_user_id);
```

### Policy 2: Admins can read all employee records

```sql
CREATE POLICY "Admins can read all employee records"
ON public.employee
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

### Policy 3: Allow insert during registration

```sql
CREATE POLICY "Allow insert during registration"
ON public.employee
FOR INSERT
TO authenticated
WITH CHECK (true);
```

### Policy 4: Admins can update any employee record

```sql
CREATE POLICY "Admins can update any employee record"
ON public.employee
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

### Policy 5: Users can update their own non-role fields

```sql
CREATE POLICY "Users can update their own employee record"
ON public.employee
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = auth_user_id);
```

### Policy 6: Admins can delete employee records

```sql
CREATE POLICY "Admins can delete employee records"
ON public.employee
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

---

# Check Existing RLS Policies

Before creating new policies, see what already exists:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'employee';
```

If there are existing policies, you may need to either modify them or drop them first:

```sql
DROP POLICY IF EXISTS "policy_name_here" ON public.employee;
```

---

# Verify RLS is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'employee';
```

- `rowsecurity = true` → RLS is enabled
- `rowsecurity = false` → RLS is disabled (you may not have an RLS issue then)

---

# Why These Policies Matter for Your Code

Looking at your `authContext.jsx`:

```javascript
const { data, error } = await supabaseClient
  .from('employee')
  .select('*')
  .eq('user_id', currentUser.id)
  .maybeSingle()
```

This query runs **as the currently logged-in user** (not as service role). If RLS is enabled and no SELECT policy matches, PostgREST returns 406 / empty data.

The 5 policies above cover:
- ✅ Self-read (Policy 1)
- ✅ Admin read-all (Policy 2)
- ✅ Self insert (Policy 3)
- ✅ Admin update (Policy 4)
- ✅ Self update (Policy 5)
- ✅ Admin delete (Policy 6)

---

# Other Tables to Add Policies For

The 406 error you saw is for `employee`, but you likely have similar issues with other tables. Add policies for:

```sql
-- announcement
CREATE POLICY "Authenticated users can read announcements"
ON public.announcement FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create announcements"
ON public.announcement FOR INSERT TO authenticated WITH CHECK (true);

-- document
CREATE POLICY "Authenticated users can read documents"
ON public.document FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can upload documents"
ON public.document FOR INSERT TO authenticated WITH CHECK (true);

-- jobs
CREATE POLICY "Authenticated users can read jobs"
ON public.job FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create jobs"
ON public.job FOR INSERT TO authenticated WITH CHECK (true);

-- leaveform
CREATE POLICY "Users can read their own leave forms"
ON public.leaveform FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.employee WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can create their own leave forms"
ON public.leaveform FOR INSERT TO authenticated WITH CHECK (true);

-- businessform (same pattern as leaveform)
CREATE POLICY "Users can read their own business forms"
ON public.businessform FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.employee WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can create their own business forms"
ON public.businessform FOR INSERT TO authenticated WITH CHECK (true);

-- contracts
CREATE POLICY "Authenticated users can read contracts"
ON public.contracts FOR SELECT TO authenticated USING (true);

-- notification
CREATE POLICY "Users can read their own notifications"
ON public.notification FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR notify_to IN (
    SELECT employee_id FROM public.employee WHERE user_id = auth.uid()
  )
);
```

---

# The "Multiple GoTrueClient" Warning Fix

I also fixed this. Your `supabaseClient.js` was creating **two separate Supabase client instances** (one for `supabaseClient`, one for `signupClient`) with the **same URL and key**, which triggered the warning.

The fix: now `signupClient` is just an alias for `supabaseClient` — they share one GoTrueClient instance.

---

# After Applying the Fixes

1. **Hard refresh** your app (Ctrl+Shift+R)
2. Log in with the new test employee you created
3. The 406 error should be gone
4. Department, position, etc. should display correctly
5. The "Multiple GoTrueClient" warning should also be gone

If you still see issues after applying the policies, run this to debug:

```sql
-- Test if a specific user can read their own employee record
SELECT * FROM public.employee WHERE user_id = 'YOUR_USER_UUID_HERE';
```

If that returns rows when run as that user in the Supabase SQL editor with the JWT set, the policies are working. If not, double-check the policy `USING` clauses.
