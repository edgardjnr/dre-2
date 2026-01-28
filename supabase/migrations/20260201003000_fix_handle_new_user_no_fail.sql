-- Fix "Database error saving new user" by ensuring the auth trigger never aborts user creation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    UPDATE public.profiles
    SET
      full_name = COALESCE(new.raw_user_meta_data->>'full_name', full_name),
      avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', avatar_url),
      updated_at = now()
    WHERE id = new.id;
    RETURN new;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

