-- 1. Create a table for public profiles
DROP TABLE IF EXISTS public.profiles CASCADE;
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  full_name text,
  email text,
  birthday date, -- Added birthday column
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 3. Function to handle new user verification
-- This runs AFTER the user confirms their email
create or replace function public.handle_new_verified_user() 
returns trigger as $$
begin
  -- ONLY insert into profile if the email is confirmed
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    insert into public.profiles (id, username, full_name, email, birthday) -- Added birthday
    values (
      new.id, 
      new.raw_user_meta_data->>'username', 
      new.raw_user_meta_data->>'full_name',
      new.email,
      (new.raw_user_meta_data->>'birthday')::date -- Added birthday (casted to date)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 4. Trigger to fire on User Update (when email_confirmed_at changes)
drop trigger if exists on_auth_user_verification on auth.users;
create trigger on_auth_user_verification
  after update on auth.users
  for each row execute procedure public.handle_new_verified_user();
