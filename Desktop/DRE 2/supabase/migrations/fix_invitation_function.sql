-- Corrigir a função create_company_invitation
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
  -- Verificações de permissão (mantidas iguais)
  IF NOT EXISTS (
    SELECT 1 FROM company_collaborators cc
    WHERE cc.company_id = p_company_id 
    AND cc.user_id = auth.uid()
    AND cc.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas proprietários e administradores podem criar convites';
  END IF;

  -- Verificar se já existe um convite pendente
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

  -- Gerar token
  v_token := replace(cast(gen_random_uuid() as text), '-', '') || replace(cast(gen_random_uuid() as text), '-', '');

  -- CORRIGIDO: Ordem correta dos campos
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
    p_role::collaborator_role,
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
    v_invitation_record.role::TEXT,
    v_invitation_record.token,
    v_invitation_record.invited_by,
    v_invitation_record.created_at,
    v_invitation_record.expires_at;
END;
$$;