-- Create a table for public profiles
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  birthday date,

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table profiles enable row level security;

-- Policies
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Only create a profile if email is confirmed AND username is provided
  -- This prevents unverified signups from creating profiles
  if new.email_confirmed_at IS NOT NULL and new.raw_user_meta_data->>'username' is not null then
    -- Check if profile already exists to prevent duplicate inserts
    if not exists (select 1 from public.profiles where id = new.id) then
      insert into public.profiles (id, full_name, username, avatar_url, birthday)
      values (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'username',
        new.raw_user_meta_data->>'avatar_url',
        (new.raw_user_meta_data->>'birthday')::date
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

-- Secure function to check if an email already exists (only checks VERIFIED users)
-- If an unverified user exists, delete them and return false (email available)
create or replace function public.check_email_exists(email_to_check text)
returns boolean as $$
declare
  user_record record;
begin
  -- Check if user exists in auth.users
  select id, email_confirmed_at into user_record
  from auth.users
  where email ilike email_to_check;
  
  -- If no user found, email is available
  if not found then
    return false;
  end if;
  
  -- If user exists but is NOT verified, delete them and return false (email available)
  if user_record.email_confirmed_at is null then
    delete from auth.users where id = user_record.id;
    return false;
  end if;
  
  -- User exists and is verified, email is taken
  return true;
end;
$$ language plpgsql security definer;

-- Secure function to get email from username
create or replace function public.get_email_by_username(username_input text)
returns text as $$
declare
  found_email text;
begin
  select u.email into found_email
  from auth.users u
  join public.profiles p on u.id = p.id
  where p.username = username_input;
  
  return found_email;
end;
$$ language plpgsql security definer;

-- Function to clean up unverified users older than 1 hour
create or replace function public.delete_unverified_users()
returns void as $$
begin
  delete from auth.users
  where email_confirmed_at is null
  and created_at < now() - interval '1 hour';
end;
$$ language plpgsql security definer;

-- Create a cron job to run cleanup every 2 minutes (requires pg_cron extension)
-- IMPORTANT: Run these steps IN ORDER:
-- 
-- STEP 1: Enable pg_cron extension
--   Go to: Supabase Dashboard -> Database -> Extensions
--   Find "pg_cron" and toggle it ON
--
-- STEP 2: After enabling pg_cron, run this command in SQL Editor:
--
-- select cron.schedule(
--   'delete-unverified-users',
--   '*/2 * * * *',
--   'select public.delete_unverified_users()'
-- );
--
-- This will run the cleanup every 2 minutes automatically
