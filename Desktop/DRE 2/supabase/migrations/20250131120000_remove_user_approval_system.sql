-- Remover completamente o sistema de aprovação de usuários
-- Este script remove todas as funcionalidades relacionadas ao sistema de aprovação e usuários master

-- 1. Remover políticas RLS relacionadas ao sistema de aprovação
DROP POLICY IF EXISTS "Master can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Master can update approvals" ON profiles;
DROP POLICY IF EXISTS "Only master can view pending users" ON pending_users;

-- 2. Remover view de usuários pendentes
DROP VIEW IF EXISTS pending_users;

-- 3. Remover funções relacionadas ao sistema de aprovação
DROP FUNCTION IF EXISTS approve_user(UUID);
DROP FUNCTION IF EXISTS reject_user(UUID);
DROP FUNCTION IF EXISTS is_user_master(TEXT);

-- 4. Remover colunas de aprovação da tabela profiles
ALTER TABLE profiles 
DROP COLUMN IF EXISTS approved,
DROP COLUMN IF EXISTS approved_by,
DROP COLUMN IF EXISTS approved_at,
DROP COLUMN IF EXISTS is_master;

-- 5. Recriar política RLS simples para profiles (sem verificação de aprovação)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 6. Política para permitir que usuários atualizem seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 7. Política para permitir inserção de novos perfis
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Comentários
COMMENT ON TABLE profiles IS 'Tabela de perfis de usuários - sistema de aprovação removido';