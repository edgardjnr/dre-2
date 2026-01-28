-- Adicionar sistema de aprovação de usuários
-- Apenas o usuário master pode aprovar novos cadastros

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;

-- Definir o usuário master (baseado no email de auth.users)
UPDATE public.profiles p
SET is_master = true, approved = true, approved_at = NOW()
WHERE p.id IN (
  SELECT u.id FROM auth.users u WHERE u.email = 'edgard.drinks@gmail.com'
);

-- Criar função para verificar se usuário é master
CREATE OR REPLACE FUNCTION public.is_user_master(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE u.email = user_email AND p.is_master = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar função para aprovar usuário
CREATE OR REPLACE FUNCTION public.approve_user(user_id_to_approve UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_email TEXT;
  is_master BOOLEAN;
BEGIN
  -- Obter email do usuário atual
  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Verificar se o usuário atual é master
  SELECT public.is_user_master(current_user_email) INTO is_master;
  
  IF NOT is_master THEN
    RAISE EXCEPTION 'Apenas o usuário master pode aprovar novos usuários';
  END IF;
  
  -- Aprovar o usuário
  UPDATE public.profiles
  SET 
    approved = true,
    approved_by = auth.uid(),
    approved_at = NOW()
  WHERE id = user_id_to_approve;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar função para rejeitar usuário
CREATE OR REPLACE FUNCTION public.reject_user(user_id_to_reject UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_email TEXT;
  is_master BOOLEAN;
BEGIN
  -- Obter email do usuário atual
  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Verificar se o usuário atual é master
  SELECT public.is_user_master(current_user_email) INTO is_master;
  
  IF NOT is_master THEN
    RAISE EXCEPTION 'Apenas o usuário master pode rejeitar usuários';
  END IF;
  
  -- Deletar o usuário rejeitado
  DELETE FROM public.profiles WHERE id = user_id_to_reject;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar política RLS para verificar aprovação
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    public.is_user_master((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Política para permitir que usuários master vejam todos os perfis
CREATE POLICY "Master can view all profiles" ON public.profiles
  FOR SELECT USING (
    public.is_user_master((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Política para permitir que usuários master atualizem aprovações
CREATE POLICY "Master can update approvals" ON public.profiles
  FOR UPDATE USING (
    public.is_user_master((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Criar view para usuários pendentes de aprovação
CREATE OR REPLACE VIEW public.pending_users AS
SELECT 
  p.id,
  u.email,
  p.full_name,
  u.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.approved = false AND p.is_master = false
ORDER BY u.created_at DESC;

-- Conceder permissões na view para usuários master
GRANT SELECT ON public.pending_users TO authenticated;

-- Criar política RLS para a view
CREATE POLICY "Only master can view pending users" ON public.pending_users
  FOR SELECT USING (
    public.is_user_master((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Comentários
COMMENT ON COLUMN public.profiles.approved IS 'Indica se o usuário foi aprovado pelo master';
COMMENT ON COLUMN public.profiles.approved_by IS 'ID do usuário master que aprovou';
COMMENT ON COLUMN public.profiles.approved_at IS 'Data e hora da aprovação';
COMMENT ON COLUMN public.profiles.is_master IS 'Indica se o usuário é master do sistema';
COMMENT ON FUNCTION public.approve_user(UUID) IS 'Função para aprovar usuário (apenas master)';
COMMENT ON FUNCTION public.reject_user(UUID) IS 'Função para rejeitar usuário (apenas master)';
COMMENT ON VIEW public.pending_users IS 'View com usuários pendentes de aprovação';
