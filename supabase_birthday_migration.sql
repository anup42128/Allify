-- Add birthday column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthday DATE;

-- Allow users to update their own birthday (if RLS is enabled)
-- Requires existing RLS policies on profiles, assuming standard setup
-- create policy "Users can update own profile" on profiles for update using ( auth.uid() = id );

-- Optional: If you are using a trigger to copy auth.users metadata to profiles
-- You might need to update your handle_new_user function.
-- Example:
/*
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, username, email, birthday)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', new.email, (new.raw_user_meta_data->>'birthday')::date);
  return new;
end;
$$ language plpgsql security definer;
*/
