-- Remover funções existentes se existirem
DROP FUNCTION IF EXISTS get_company_collaborators(UUID);
DROP FUNCTION IF EXISTS get_company_invitations(UUID);
DROP FUNCTION IF EXISTS create_company_invitation(UUID, TEXT, TEXT);

-- Função para buscar colaboradores da empresa com dados de usuário
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
  -- Verificar se o usuário tem permissão para ver os colaboradores desta empresa
  IF NOT EXISTS (
    SELECT 1 FROM company_collaborators cc
    WHERE cc.company_id = p_company_id 
    AND cc.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não é colaborador desta empresa';
  END IF;

  -- Retornar colaboradores com dados de usuário
  RETURN QUERY
  SELECT 
    cc.id,
    cc.company_id,
    cc.user_id,
    cc.role::TEXT,
    cc.created_at,
    au.email as user_email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as user_name
  FROM company_collaborators cc
  JOIN auth.users au ON cc.user_id = au.id
  WHERE cc.company_id = p_company_id
  ORDER BY cc.created_at ASC;
END;
$$;

-- Função para buscar convites da empresa
CREATE OR REPLACE FUNCTION get_company_invitations(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  email TEXT,
  role TEXT,
  token TEXT,
  invited_by UUID,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  inviter_email TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se o usuário tem permissão para ver os convites desta empresa
  IF NOT EXISTS (
    SELECT 1 FROM company_collaborators cc
    WHERE cc.company_id = p_company_id 
    AND cc.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não é colaborador desta empresa';
  END IF;

  -- Retornar convites com dados do convidador
  RETURN QUERY
  SELECT 
    ci.id,
    ci.company_id,
    ci.email,
    ci.role::TEXT,
    ci.token,
    ci.invited_by,
    ci.created_at,
    ci.expires_at,
    au.email as inviter_email
  FROM company_invitations ci
  LEFT JOIN auth.users au ON ci.invited_by = au.id
  WHERE ci.company_id = p_company_id
  ORDER BY ci.created_at DESC;
END;
$$;

-- Função para criar convite (CORRIGIDA - com cast de tipo)
CREATE OR REPLACE FUNCTION create_company_invitation(
  p_company_id UUID,
  p_email TEXT,
  p_role TEXT
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  email TEXT,
  role TEXT,
  token TEXT,
  invited_by UUID,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invitation_record company_invitations%ROWTYPE;
  v_token TEXT;
BEGIN
  -- Verificar se o usuário tem permissão para criar convites nesta empresa
  IF NOT EXISTS (
    SELECT 1 FROM company_collaborators cc
    WHERE cc.company_id = p_company_id 
    AND cc.user_id = auth.uid()
    AND cc.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas proprietários e administradores podem criar convites';
  END IF;

  -- Verificar se já existe um convite pendente para este email
  IF EXISTS (
    SELECT 1 FROM company_invitations ci
    WHERE ci.company_id = p_company_id 
    AND ci.email = LOWER(TRIM(p_email))
  ) THEN
    RAISE EXCEPTION 'Já existe um convite pendente para este email';
  END IF;

  -- Verificar se o usuário já é colaborador
  IF EXISTS (
    SELECT 1 FROM company_collaborators cc
    JOIN auth.users au ON cc.user_id = au.id
    WHERE cc.company_id = p_company_id 
    AND au.email = LOWER(TRIM(p_email))
  ) THEN
    RAISE EXCEPTION 'Este usuário já é colaborador da empresa';
  END IF;

  -- Gerar token usando método compatível com Supabase
  v_token := replace(cast(gen_random_uuid() as text), '-', '') || replace(cast(gen_random_uuid() as text), '-', '');

  -- Criar o convite (CORRIGIDO - cast do role para collaborator_role)
  INSERT INTO company_invitations (
    company_id,
    email,
    role,
    invited_by,
    token,
    expires_at
  ) VALUES (
    p_company_id,
    LOWER(TRIM(p_email)),
    p_role::collaborator_role,  -- CAST PARA O TIPO ENUM
    auth.uid(),
    v_token,
    NOW() + INTERVAL '7 days'
  )
  RETURNING * INTO v_invitation_record;

  -- Retornar o convite criado
  RETURN QUERY
  SELECT 
    v_invitation_record.id,
    v_invitation_record.company_id,
    v_invitation_record.email,
    v_invitation_record.role::TEXT,  -- CAST PARA TEXT NO RETORNO
    v_invitation_record.token,
    v_invitation_record.invited_by,
    v_invitation_record.created_at,
    v_invitation_record.expires_at;
END;
$$;

-- Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION get_company_collaborators(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_invitations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_company_invitation(UUID, TEXT, TEXT) TO authenticated;