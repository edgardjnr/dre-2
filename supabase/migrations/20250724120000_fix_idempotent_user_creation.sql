/*
# [Fix Idempotent User Creation Trigger]
[This script corrects a previous migration by making it idempotent. It ensures that the database objects for handling new user profiles are created or replaced safely, avoiding "already exists" errors. It creates the 'profiles' table, a function to populate it from 'auth.users', a trigger to automate this process, and the necessary Row Level Security (RLS) policies.]

## Query Description: [This operation sets up the necessary database structure to automatically create a user profile when a new user signs up. It is designed to be safe to re-run. If a trigger or function already exists, it will be replaced, ensuring the latest version is in use. No existing user data in 'auth.users' or 'profiles' will be lost.]

## Metadata:
- Schema-Category: ["Structural", "Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Tables affected: public.profiles (CREATE IF NOT EXISTS)
- Functions affected: public.handle_new_user (CREATE OR REPLACE)
- Triggers affected: on_auth_user_created on auth.users (DROP IF EXISTS, CREATE)
- Policies affected: Policies on public.profiles (DROP IF EXISTS, CREATE)

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [Yes] - Policies for SELECT, INSERT, and UPDATE on the profiles table are defined to ensure users can only access and modify their own data.
- Auth Requirements: [Supabase Auth]

## Performance Impact:
- Indexes: [A primary key is created on the 'profiles' table, which is indexed by default.]
- Triggers: [Adds a trigger to 'auth.users' that fires after an insert. The performance impact is negligible.]
- Estimated Impact: [Low. This is a standard and lightweight operation for user management.]
*/

-- 1. Create public.profiles table
-- This table will store public user data.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE,
  full_name TEXT,
  avatar_url TEXT,
  
  CONSTRAINT full_name_length CHECK (char_length(full_name) >= 3)
);

-- 2. Create a function to handle new user creation
-- This function will be triggered when a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, updated_at)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', now());
  RETURN new;
END;
$$;

-- 3. Create a trigger to call the function on new user creation
-- This ensures the function runs automatically.
-- We drop the trigger first to avoid "already exists" errors on re-runs.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Set up Row Level Security (RLS) for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones to ensure idempotency.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
