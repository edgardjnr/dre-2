-- Fix infinite recursion in profiles RLS policies
-- The issue is caused by conflicting policies that create circular dependencies

-- 1. Drop all existing policies on profiles table to start clean
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Master can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Master can update approvals" ON public.profiles;

-- 2. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create simple, non-conflicting policies
-- Allow authenticated users to view all profiles (public data)
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert their own profile only
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile only
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- 5. Add comments for clarity
COMMENT ON POLICY "profiles_select_authenticated" ON public.profiles IS 'Authenticated users can view all profiles (public data)';
COMMENT ON POLICY "profiles_insert_own" ON public.profiles IS 'Users can only insert their own profile';
COMMENT ON POLICY "profiles_update_own" ON public.profiles IS 'Users can only update their own profile';

-- 6. Ensure the handle_new_user function has proper security context
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert with explicit security context bypass for trigger
  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    new.raw_user_meta_data->>'avatar_url',
    now()
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, update it instead
    UPDATE public.profiles 
    SET 
      full_name = COALESCE(new.raw_user_meta_data->>'full_name', full_name),
      avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', avatar_url),
      updated_at = now()
    WHERE id = new.id;
    RETURN new;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE WARNING 'Failed to create/update profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates or updates a profile for a new user from auth.users metadata with error handling';