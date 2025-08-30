/*
  # [Fix User Profile Setup Idempotency]
  This script corrects the user profile creation process by making it idempotent.
  It ensures that the script can be run multiple times without causing "already exists" errors
  for tables, functions, triggers, or RLS policies. It safely creates the user
  profiles table and the associated automation for new user sign-ups.

  ## Query Description:
  This operation is safe to run. It checks for the existence of database objects before
  creating them. If the 'profiles' table, 'handle_new_user' function, or related triggers
  and policies already exist, they will be dropped and recreated to match this definition.
  This ensures the database schema is consistent with the application's requirements without
  risk of data loss, as it only affects the user profile setup.

  ## Metadata:
  - Schema-Category: ["Structural", "Safe"]
  - Impact-Level: ["Low"]
  - Requires-Backup: false
  - Reversible: true

  ## Structure Details:
  - Table: `public.profiles` (created if not exists)
  - Function: `public.handle_new_user` (replaced if exists)
  - Trigger: `on_auth_user_created` on `auth.users` (dropped and recreated if exists)
  - Policies: RLS policies on `public.profiles` (dropped and recreated if exists)

  ## Security Implications:
  - RLS Status: Enabled on `public.profiles`.
  - Policy Changes: Yes. Defines policies ensuring users can only access and modify their own profile data.
  - Auth Requirements: This script integrates with `auth.users`.

  ## Performance Impact:
  - Indexes: A primary key is created on `public.profiles`.
  - Triggers: Adds an `AFTER INSERT` trigger to `auth.users`. The performance impact is negligible as it's a simple insert operation.
  - Estimated Impact: Low. This is a standard setup for Supabase user profiles.
*/

-- 1. Create public.profiles table
-- This table will store public user data.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  full_name text,
  updated_at timestamptz,
  CONSTRAINT id_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';

-- 2. Create a function to handle new user creation
-- This function will be triggered when a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, updated_at)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', now());
  RETURN new;
END;
$$;
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a profile for a new user.';

-- 3. Create a trigger to call the function on new user creation
-- This ensures the handle_new_user function runs after a user is added to auth.users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'When a new user signs up, create a profile for them.';

-- 4. Enable Row Level Security (RLS) on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.profiles IS 'RLS is enabled to protect user data.';

-- 5. Create RLS policies for the profiles table
-- Policy: Allow users to view their own profile.
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile."
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Policy: Allow users to update their own profile.
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Allow logged-in users to create their own profile (this is handled by the trigger, but good to have)
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);
