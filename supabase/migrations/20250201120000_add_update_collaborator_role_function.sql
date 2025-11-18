-- Função para atualizar a função de um colaborador
CREATE OR REPLACE FUNCTION update_collaborator_role(
  p_collaborator_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id UUID;
  v_current_user_role TEXT;
BEGIN
  -- Buscar a empresa do colaborador
  SELECT company_id INTO v_company_id
  FROM company_collaborators
  WHERE id = p_collaborator_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  -- Verificar se o usuário atual tem permissão para alterar funções nesta empresa
  SELECT role INTO v_current_user_role
  FROM company_collaborators
  WHERE company_id = v_company_id 
    AND user_id = auth.uid();

  IF v_current_user_role IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: você não é colaborador desta empresa';
  END IF;

  IF v_current_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas proprietários e administradores podem alterar funções';
  END IF;

  -- Verificar se não está tentando alterar a função de um owner
  IF EXISTS (
    SELECT 1 FROM company_collaborators
    WHERE id = p_collaborator_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Não é possível alterar a função do proprietário';
  END IF;

  -- Atualizar a função do colaborador
  UPDATE company_collaborators
  SET role = p_role::collaborator_role,
      updated_at = NOW()
  WHERE id = p_collaborator_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Erro ao atualizar a função do colaborador';
  END IF;

  RETURN TRUE;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION update_collaborator_role(UUID, TEXT) TO authenticated;