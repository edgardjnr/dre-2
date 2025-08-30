/*
# [Migration] Setup User Profiles and Auth Trigger (v2)
This script sets up the public 'profiles' table and a trigger to automatically populate it when a new user signs up in Supabase Auth.
This version includes an explicit permission grant to fix the "must be owner of relation users" error.

## Query Description:
This is a structural and security setup. It creates a new table and automates data insertion from the secure `auth.users` table. It also configures Row Level Security to ensure users can only access their own data. This is a foundational step for most applications and is considered safe.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (manually by dropping the created objects)

## Security Implications:
- RLS Status: Enabled on the new `profiles` table.
- Policy Changes: Yes, adds policies for SELECT, UPDATE, and INSERT on `profiles`.
- Auth Requirements: This script integrates directly with Supabase Auth.
*/

-- 1. Grant Trigger Permission
-- This is the key fix for the "must be owner of relation users" error.
-- It safely grants the necessary permission to the admin role to create a trigger on the auth.users table.
GRANT TRIGGER ON TABLE auth.users TO supabase_admin;

-- 2. Create the profiles table
-- This table will store public user data.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text,
  CONSTRAINT id_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';

-- 3. Create the function to handle new user creation
-- This function will be called by the trigger whenever a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a profile for a new user from auth.users metadata.';

-- 4. Create the trigger on the auth.users table
-- This trigger calls the handle_new_user function after a new user is inserted.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Set up Row Level Security (RLS) for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "Public profiles are viewable by everyone." ON public.profiles IS 'Allows any user to view any profile.';
COMMENT ON POLICY "Users can insert their own profile." ON public.profiles IS 'Ensures a user can only create their own profile.';
COMMENT ON POLICY "Users can update their own profile." ON public.profiles IS 'Ensures a user can only update their own profile.';
