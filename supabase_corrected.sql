-- 1. Add birthday column to existing profiles table
-- We use ALTER TABLE to be safe if the table already exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthday DATE;

-- 2. Update the function to verify it includes 'birthday'
-- This replaces the existing function with the new logic
CREATE OR REPLACE FUNCTION public.handle_new_verified_user() 
RETURNS trigger AS $$
BEGIN
  -- ONLY insert into profile if the email is confirmed
  IF new.email_confirmed_at IS NOT NULL AND old.email_confirmed_at IS NULL THEN
    INSERT INTO public.profiles (id, username, full_name, email, birthday)
    VALUES (
      new.id, 
      new.raw_user_meta_data->>'username', 
      new.raw_user_meta_data->>'full_name',
      new.email,
      (new.raw_user_meta_data->>'birthday')::date -- Cast the birthday string to a date
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger is set (The user's code already checks this, but good to double check)
-- This part is usually one-time setup. If the trigger 'on_auth_user_verification' exists, this changes nothing.
DROP TRIGGER IF EXISTS on_auth_user_verification ON auth.users;
CREATE TRIGGER on_auth_user_verification
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_verified_user();
