-- Migration: Add Master Role to Collaborator System
-- This migration adds a new 'master' role that has supreme access to everything in the system

-- Add 'master' to the collaborator_role enum
ALTER TYPE public.collaborator_role ADD VALUE 'master';

-- Update RLS policies to include master permissions
-- Masters should have access to ALL companies, not just their own

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users can view company collaborators" ON public.company_collaborators;
DROP POLICY IF EXISTS "Company owners can manage collaborators" ON public.company_collaborators;
DROP POLICY IF EXISTS "Users can view relevant invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Company owners can manage invitations" ON public.company_invitations;

-- Recreate policies with master permissions

-- Policy for viewing collaborators (masters can see all)
CREATE POLICY "Users can view company collaborators" ON public.company_collaborators
    FOR SELECT USING (
        -- Masters can see all collaborators
        EXISTS (
            SELECT 1 FROM public.company_collaborators cc
            WHERE cc.user_id = auth.uid() AND cc.role = 'master'
        )
        OR
        -- Regular users can see collaborators of their companies
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
            UNION
            SELECT company_id FROM public.company_collaborators WHERE user_id = auth.uid()
        )
    );

-- Policy for managing collaborators (masters can manage all)
CREATE POLICY "Company owners and masters can manage collaborators" ON public.company_collaborators
    FOR ALL USING (
        -- Masters can manage all collaborators
        EXISTS (
            SELECT 1 FROM public.company_collaborators cc
            WHERE cc.user_id = auth.uid() AND cc.role = 'master'
        )
        OR
        -- Company owners can manage their company collaborators
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
        )
    );

-- Policy for viewing invitations (masters can see all)
CREATE POLICY "Users can view relevant invitations" ON public.company_invitations
    FOR SELECT USING (
        -- Masters can see all invitations
        EXISTS (
            SELECT 1 FROM public.company_collaborators cc
            WHERE cc.user_id = auth.uid() AND cc.role = 'master'
        )
        OR
        -- Regular users can see invitations for their companies or sent to them
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
        )
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Policy for managing invitations (masters can manage all)
CREATE POLICY "Company owners and masters can manage invitations" ON public.company_invitations
    FOR ALL USING (
        -- Masters can manage all invitations
        EXISTS (
            SELECT 1 FROM public.company_collaborators cc
            WHERE cc.user_id = auth.uid() AND cc.role = 'master'
        )
        OR
        -- Company owners can manage their company invitations
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
        )
    );

-- Update the update_collaborator_role function to allow masters to change any role
CREATE OR REPLACE FUNCTION update_collaborator_role(
  p_collaborator_id uuid,
  p_new_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_collaborator public.company_collaborators;
  v_current_user_role public.collaborator_role;
  v_company_owner_id uuid;
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Buscar o colaborador que será atualizado
  SELECT * INTO v_collaborator
  FROM public.company_collaborators
  WHERE id = p_collaborator_id;

  IF v_collaborator IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Colaborador não encontrado');
  END IF;

  -- Verificar o papel do usuário atual na empresa
  SELECT role INTO v_current_user_role
  FROM public.company_collaborators
  WHERE company_id = v_collaborator.company_id
  AND user_id = auth.uid();

  -- Buscar o dono da empresa
  SELECT user_id INTO v_company_owner_id
  FROM public.empresas
  WHERE id = v_collaborator.company_id;

  -- Verificar permissões:
  -- 1. Masters podem alterar qualquer papel
  -- 2. Owners podem alterar papéis (exceto outros owners)
  -- 3. Admins podem alterar papéis de members e viewers
  IF v_current_user_role = 'master' THEN
    -- Masters podem fazer qualquer alteração
    NULL;
  ELSIF auth.uid() = v_company_owner_id THEN
    -- Owner da empresa pode alterar qualquer papel, exceto outros owners
    IF v_collaborator.role = 'owner' AND v_collaborator.user_id != auth.uid() THEN
      RETURN json_build_object('success', false, 'error', 'Não é possível alterar o papel de outro owner');
    END IF;
  ELSIF v_current_user_role = 'admin' THEN
    -- Admins podem alterar apenas members e viewers
    IF v_collaborator.role NOT IN ('member', 'viewer') THEN
      RETURN json_build_object('success', false, 'error', 'Admins só podem alterar papéis de members e viewers');
    END IF;
    -- Admins não podem promover para owner, admin ou master
    IF p_new_role::public.collaborator_role IN ('owner', 'admin', 'master') THEN
      RETURN json_build_object('success', false, 'error', 'Admins não podem promover para owner, admin ou master');
    END IF;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Sem permissão para alterar papéis');
  END IF;

  -- Validar o novo papel
  IF p_new_role::public.collaborator_role IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Papel inválido');
  END IF;

  -- Atualizar o papel do colaborador
  UPDATE public.company_collaborators
  SET 
    role = p_new_role::public.collaborator_role,
    updated_at = now()
  WHERE id = p_collaborator_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Papel do colaborador atualizado com sucesso',
    'new_role', p_new_role
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Erro interno: ' || SQLERRM
    );
END;
$$;

-- Add comment
COMMENT ON TYPE public.collaborator_role IS 'Roles: owner (company owner), admin (administrator), member (regular user), viewer (read-only), master (supreme access to everything)';

-- Success message
SELECT 'Master role added successfully to collaborator system!' as status;