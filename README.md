# Allify SQL Setup

This folder contains the SQL schema for Allify. Choose between:

- Option A: `public.users` table that stores password hashes (you manage auth)
- Option B (recommended): Supabase Auth with `public.profiles` for app data

## Files

- `allify_schema.sql`: Complete schema, constraints, RLS examples, trigger, and RPC
- `add_birthday_column.sql`: Add birthday column to existing profiles table

## How to apply on Supabase

You can run the SQL directly in the Supabase SQL Editor or via the CLI.

### Using the Supabase Dashboard

1. Open your Supabase project → SQL Editor
2. Paste the contents of `allify_schema.sql`
3. Run

### Using the Supabase CLI

```bash
# From this directory
supabase db execute --file allify_schema.sql
```

### If you already have the profiles table

If you already ran the schema before and need to add the birthday column:

```bash
supabase db execute --file add_birthday_column.sql
```

## Option A — Using public.users (passwords you manage)

- Users are stored in `public.users`
- Unique, case-insensitive `username` and `email`
- Verify passwords in your server (preferred) or call the helper function:

```sql
select * from public.login_user($1, $2);
```

Parameters:
- `$1`: identifier (email or username)
- `$2`: plaintext password (only if verifying in SQL)

## Option B — Supabase Auth + public.profiles (recommended)

- Supabase manages passwords in `auth.users`
- App data in `public.profiles` with unique, case-insensitive `username`
- Auto-creates a profile on sign-up via the `on_auth_user_created` trigger

### Sign-up

Include metadata when signing up so the trigger can populate `profiles`:

```js
// Example with supabase-js
await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name, username } }
});
```

### Sign-in (email or username)

If the input looks like an email, call `signInWithPassword({ email, password })`.
Otherwise, resolve username to email with the provided RPC and then sign in:

```sql
select public.get_email_for_identifier($1) as email;
```

Then call `signInWithPassword({ email, password })` using the returned email.

### Option B RPC helpers

- Check availability:

```sql
select public.is_username_available('desired_name');
select public.is_email_available('someone@example.com');
```

- Upsert current user's profile (requires authenticated session):

```sql
select * from public.upsert_my_profile('Full Name', 'username_here');
```

- Get current user's profile (requires authenticated session):

```sql
select * from public.get_my_profile();
```

## Notes

- Passwords must never be stored in plaintext.
- Case-insensitive unique indexes prevent `User` vs `user` duplicates.
- Review and adjust RLS policies to match your privacy and access needs.
