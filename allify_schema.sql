-- Allify SQL Setup
-- This file provides two setups:
--   Option A: Standalone public.users table (you manage password hashing)
--   Option B: Supabase Auth with public.profiles (preferred)
-- Includes: case-insensitive uniqueness, helpful indexes, RLS (example),
--           trigger to auto-create profile, and an RPC to resolve login identifier.

-- =========================================================
-- Shared prerequisites
-- =========================================================
create extension if not exists pgcrypto;

-- =========================================================
-- Option A — Standalone users table managed by your app
-- =========================================================
-- Stores password hashes (NEVER plaintext). Hash using bcrypt/argon2 in your server.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  username text not null,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),

  constraint username_format check (username ~ '^[A-Za-z0-9_]{3,30}$'),
  constraint email_format check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

-- Case-insensitive unique constraints (avoid collisions like User vs user)
create unique index if not exists users_username_unique_ci on public.users (lower(username));
create unique index if not exists users_email_unique_ci on public.users (lower(email));

-- Helpful composite index for common lookups
create index if not exists users_lookup_ci on public.users (lower(username), lower(email));

-- Enable RLS (policies should be tailored to your access model)
alter table public.users enable row level security;
-- Example policies (adjust/remove to your needs):
-- create policy users_read_own
--   on public.users for select
--   using (true);

-- Optional: SQL-side password verification helper using pgcrypto's crypt() (bcrypt-compatible)
-- Prefer verifying password hashes in your application server. If you choose to verify in SQL,
-- use this function which returns a single user row on success, none on failure.
create or replace function public.login_user(identifier text, plain_password text)
returns table (
  id uuid,
  full_name text,
  username text,
  email text,
  created_at timestamptz
)
language sql
stable
as $$
  select u.id, u.full_name, u.username, u.email, u.created_at
  from public.users u
  where (lower(u.email) = lower(identifier) or lower(u.username) = lower(identifier))
    and u.password_hash = crypt(plain_password, u.password_hash)
  limit 1;
$$;

-- =========================================================
-- Option B — Supabase Auth + public.profiles (recommended)
-- =========================================================
-- Supabase manages passwords in auth.users; keep app profile data in public.profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null,
  birthday date,
  created_at timestamptz not null default now(),

  constraint username_format check (username ~ '^[A-Za-z0-9_]{3,30}$')
);

-- Global, case-insensitive unique username
create unique index if not exists profiles_username_unique_ci on public.profiles (lower(username));

-- Enable RLS and set recommended basic policies
alter table public.profiles enable row level security;

-- Anyone can read profiles (adjust to your privacy needs)
do $$ begin
  begin
    create policy profiles_read_all
      on public.profiles for select
      using (true);
  exception when duplicate_object then null; end;
end $$;

-- Only the owner can insert/update their own profile
do $$ begin
  begin
    create policy profiles_insert_own
      on public.profiles for insert
      with check (auth.uid() = user_id);
  exception when duplicate_object then null; end;
end $$;

do $$ begin
  begin
    create policy profiles_update_own
      on public.profiles for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  exception when duplicate_object then null; end;
end $$;

-- Trigger to auto-create a profile when a new auth user is inserted
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, username, birthday)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    (new.raw_user_meta_data->>'birthday')::date
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RPC to resolve identifier (email or username) to an email for Supabase sign-in
create or replace function public.get_email_for_identifier(identifier text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with candidate as (
    select lower(identifier) as ident
  )
  select au.email
  from candidate c
  join public.profiles p on lower(p.username) = c.ident
  join auth.users au on au.id = p.user_id
  union all
  select au.email
  from candidate c
  join auth.users au on lower(au.email) = c.ident
  limit 1;
$$;

-- Username availability (case-insensitive)
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles pr
    where lower(pr.username) = lower(p_username)
  );
$$;

-- Email availability (case-insensitive) using auth.users
create or replace function public.is_email_available(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from auth.users au
    where lower(au.email) = lower(p_email)
  );
$$;

-- Upsert the current user's profile with uniqueness validation
create or replace function public.upsert_my_profile(p_full_name text, p_username text, p_birthday date default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Prevent taking another user's username (case-insensitive)
  if exists (
    select 1 from public.profiles pr
    where lower(pr.username) = lower(p_username)
      and pr.user_id <> v_user_id
  ) then
    raise exception 'Username is already taken' using errcode = '23505';
  end if;

  insert into public.profiles as pr (user_id, full_name, username, birthday)
  values (v_user_id, p_full_name, p_username, p_birthday)
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        username  = excluded.username,
        birthday = excluded.birthday
  returning pr.* into v_profile;

  return v_profile;
end;
$$;

-- Get the current user's profile
create or replace function public.get_my_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select pr.*
  from public.profiles pr
  where pr.user_id = auth.uid();
$$;

-- Grants for RPCs
do $$ begin
  begin
    grant execute on function public.get_email_for_identifier(text) to anon, authenticated;
  exception when undefined_function then null; end;
  begin
    grant execute on function public.is_username_available(text) to anon, authenticated;
  exception when undefined_function then null; end;
  begin
    grant execute on function public.is_email_available(text) to anon, authenticated;
  exception when undefined_function then null; end;
  begin
    grant execute on function public.upsert_my_profile(text, text) to authenticated;
  exception when undefined_function then null; end;
  begin
    grant execute on function public.get_my_profile() to authenticated;
  exception when undefined_function then null; end;
end $$;

-- =========================================================
-- Notes
-- =========================================================
-- Option A login flow (server-side recommended):
--   1) Look up user by identifier (email or username) case-insensitively
--   2) Verify password with the same KDF used for password_hash (bcrypt/argon2)
--   3) Example SQL helper provided: public.login_user(identifier, plain_password)
--
-- Option B login flow (Supabase Auth):
--   1) If user input looks like an email, call signInWithPassword({ email, password })
--   2) Else call public.get_email_for_identifier(identifier) to resolve to an email
--   3) Then call signInWithPassword with the resolved email
--   4) At sign-up, include user_metadata: { full_name, username } so the trigger populates profiles