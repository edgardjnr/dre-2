-- Prefer display_name (Users "Display name") when returning collaborator info

CREATE OR REPLACE FUNCTION get_company_collaborators(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  user_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ,
  user_email TEXT,
  user_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM company_collaborators cc
    WHERE cc.company_id = p_company_id
    AND cc.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não é colaborador desta empresa';
  END IF;

  RETURN QUERY
  SELECT
    cc.id,
    cc.company_id,
    cc.user_id,
    cc.role::TEXT,
    cc.created_at,
    au.email as user_email,
    COALESCE(
      NULLIF(au.raw_user_meta_data->>'display_name', ''),
      NULLIF(au.raw_user_meta_data->>'full_name', ''),
      au.email
    ) as user_name
  FROM company_collaborators cc
  JOIN auth.users au ON cc.user_id = au.id
  WHERE cc.company_id = p_company_id
  ORDER BY cc.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_company_collaborators(UUID) TO authenticated;

