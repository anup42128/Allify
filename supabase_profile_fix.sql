-- 1. Add missing columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'Hi! I''m using Allify to expand my horizons, share my journey, and connect with a community that inspires... 🌌✨',
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';

-- 2. Update the handle_new_verified_user function to ensure it's robust
-- (optional but good practice to keep it updated with available fields)
CREATE OR REPLACE FUNCTION public.handle_new_verified_user() 
RETURNS trigger AS $$
BEGIN
  IF new.email_confirmed_at IS NOT NULL AND old.email_confirmed_at IS NULL THEN
    INSERT INTO public.profiles (id, username, full_name, email, birthday)
    VALUES (
      new.id, 
      new.raw_user_meta_data->>'username', 
      new.raw_user_meta_data->>'full_name',
      new.email,
      (new.raw_user_meta_data->>'birthday')::date
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
