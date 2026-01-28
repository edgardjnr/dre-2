-- Store auth email on profiles for collaborator display and prefer "display_name" from auth.users metadata

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

UPDATE public.profiles p
SET email = au.email,
    updated_at = now()
FROM auth.users au
WHERE au.id = p.id
  AND au.email IS NOT NULL
  AND (p.email IS NULL OR p.email = '');

UPDATE public.profiles p
SET full_name = COALESCE(
      NULLIF(au.raw_user_meta_data->>'display_name', ''),
      NULLIF(au.raw_user_meta_data->>'full_name', ''),
      split_part(au.email, '@', 1),
      p.full_name
    ),
    updated_at = now()
FROM auth.users au
WHERE au.id = p.id
  AND au.email IS NOT NULL
  AND (p.full_name IS NULL OR p.full_name = '');

