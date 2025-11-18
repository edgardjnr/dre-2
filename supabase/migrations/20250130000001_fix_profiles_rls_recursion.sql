-- Fix infinite recursion in profiles RLS policies
-- Remove conflicting policies and ensure clean RLS setup

-- 1. Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Master can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Master can update approvals" ON public.profiles;

-- 2. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create clean, non-conflicting policies
-- Allow users to view their own profile only
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Add comments for clarity
COMMENT ON POLICY "profiles_select_own" ON public.profiles IS 'Users can only view their own profile';
COMMENT ON POLICY "profiles_insert_own" ON public.profiles IS 'Users can only insert their own profile';
COMMENT ON POLICY "profiles_update_own" ON public.profiles IS 'Users can only update their own profile';