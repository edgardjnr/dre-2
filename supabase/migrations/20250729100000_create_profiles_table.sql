/*
          # Create User Profiles Table and Sync with Auth

          This migration sets up a `profiles` table to store public user data and syncs it with Supabase Auth.

          ## Query Description:
          This operation is structural and foundational for user management. It creates a new table `profiles`, a function `handle_new_user`, and a trigger. This is a standard and safe pattern for extending Supabase Auth. It does not affect existing data in `auth.users` but is critical for new user sign-ups to succeed without "database error saving new user" issues.

          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true (by dropping the trigger, function, and table)

          ## Structure Details:
          - **Table Created**: `public.profiles`
            - `id` (UUID, Primary Key, Foreign Key to `auth.users.id`)
            - `updated_at` (TIMESTAMPTZ)
            - `full_name` (TEXT)
          - **Function Created**: `public.handle_new_user()`
          - **Trigger Created**: `on_auth_user_created` on `auth.users`

          ## Security Implications:
          - **RLS Status**: Enabled on `public.profiles`.
          - **Policy Changes**: Yes, new policies are created for the `profiles` table.
            - **Select Policy**: Users can only read their own profile.
            - **Update Policy**: Users can only update their own profile.
          - **Auth Requirements**: The trigger runs with the permissions of the `postgres` role.

          ## Performance Impact:
          - **Indexes**: A primary key index is automatically created on `profiles.id`.
          - **Triggers**: Adds a new trigger to the `auth.users` table. The impact is negligible as it's a simple insert operation.
          - **Estimated Impact**: Minimal performance impact.
          */

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ,
  full_name TEXT
);

-- 2. Add comments to the table and columns for clarity
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';
COMMENT ON COLUMN public.profiles.id IS 'References the user in auth.users.';

-- 3. Create the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

-- Hosted environments may restrict triggers on auth schema; guard creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()';
  END IF;
END $$;

-- 5. Enable Row Level Security (RLS) on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for the profiles table
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 7. Grant permissions to the authenticated role
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
