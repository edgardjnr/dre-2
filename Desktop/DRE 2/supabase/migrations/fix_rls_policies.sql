-- Corrigir políticas RLS com recursão infinita
-- Data: 2025-01-28

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "Users can view company collaborators" ON public.company_collaborators;
DROP POLICY IF EXISTS "Company owners can manage collaborators" ON public.company_collaborators;
DROP POLICY IF EXISTS "Users can view relevant invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Company owners can manage invitations" ON public.company_invitations;

-- Recriar políticas sem recursão
-- Política para visualizar colaboradores (sem recursão)
CREATE POLICY "Users can view company collaborators" ON public.company_collaborators
    FOR SELECT USING (
        -- Proprietário da empresa pode ver todos os colaboradores
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
        )
        -- Ou o próprio usuário pode ver seu próprio registro
        OR user_id = auth.uid()
    );

-- Política para gerenciar colaboradores (apenas proprietários)
CREATE POLICY "Company owners can manage collaborators" ON public.company_collaborators
    FOR ALL USING (
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
        )
    );

-- Política para visualizar convites
CREATE POLICY "Users can view relevant invitations" ON public.company_invitations
    FOR SELECT USING (
        -- Proprietário da empresa pode ver convites da empresa
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
        )
        -- Ou usuário pode ver convites enviados para seu email
        OR email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Política para gerenciar convites (apenas proprietários)
CREATE POLICY "Company owners can manage invitations" ON public.company_invitations
    FOR ALL USING (
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
        )
    );

-- Política adicional para permitir inserção de colaboradores via função
CREATE POLICY "Allow function to insert collaborators" ON public.company_collaborators
    FOR INSERT WITH CHECK (true);

-- Política adicional para permitir inserção de convites via função
CREATE POLICY "Allow function to insert invitations" ON public.company_invitations
    FOR INSERT WITH CHECK (true);