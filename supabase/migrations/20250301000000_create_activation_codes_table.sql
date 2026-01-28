-- Criação da tabela de códigos de ativação
CREATE TABLE IF NOT EXISTS public.activation_codes (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Adicionar índice para busca rápida por código
CREATE INDEX IF NOT EXISTS activation_codes_code_idx ON public.activation_codes (code);

-- Adicionar políticas RLS para segurança
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- Removida política baseada em profiles.role (coluna não existe)

-- Política para permitir que usuários verifiquem seus próprios códigos
CREATE POLICY "Users can verify their own activation codes"
  ON public.activation_codes
  FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Política para permitir inserção de novos códigos (apenas autenticados)
CREATE POLICY "Authenticated can request activation codes"
  ON public.activation_codes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para permitir atualização apenas de códigos não utilizados
CREATE POLICY "Update only unused activation codes"
  ON public.activation_codes
  FOR UPDATE
  USING (is_used = FALSE AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));
