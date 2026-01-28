-- Ensure every auth user has a profiles row, and prefer auth "display_name" / "name" metadata

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(
    NULLIF(new.raw_user_meta_data->>'display_name', ''),
    NULLIF(new.raw_user_meta_data->>'name', ''),
    NULLIF(new.raw_user_meta_data->>'full_name', ''),
    split_part(COALESCE(new.email, ''), '@', 1),
    ''
  );

  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at, email)
  VALUES (
    new.id,
    v_name,
    new.raw_user_meta_data->>'avatar_url',
    now(),
    new.email
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    UPDATE public.profiles
    SET
      full_name = COALESCE(NULLIF(v_name, ''), full_name),
      avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', avatar_url),
      email = COALESCE(new.email, email),
      updated_at = now()
    WHERE id = new.id;
    RETURN new;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

INSERT INTO public.profiles (id, full_name, avatar_url, updated_at, email)
SELECT
  au.id,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'display_name', ''),
    NULLIF(au.raw_user_meta_data->>'name', ''),
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    split_part(COALESCE(au.email, ''), '@', 1),
    ''
  ) AS full_name,
  au.raw_user_meta_data->>'avatar_url' AS avatar_url,
  now() AS updated_at,
  au.email AS email
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);
