-- Add birthday column to profiles table if it doesn't exist
-- Run this in Supabase SQL Editor if you already have the profiles table

-- Add birthday column
alter table public.profiles 
add column if not exists birthday date;

-- Update the trigger to handle birthday
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

-- Update upsert function to handle birthday
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
