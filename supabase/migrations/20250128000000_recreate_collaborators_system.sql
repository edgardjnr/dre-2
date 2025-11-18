-- Limpar sistema anterior
DROP TABLE IF EXISTS public.empresa_collaborators CASCADE;
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TYPE IF EXISTS public.collaborator_role_enum CASCADE;
DROP TYPE IF EXISTS public.invitation_status_enum CASCADE;
DROP FUNCTION IF EXISTS create_master_collaborator() CASCADE;
DROP FUNCTION IF EXISTS accept_invitation(text) CASCADE;

-- Criar novos tipos
CREATE TYPE public.collaborator_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- Tabela de colaboradores da empresa
CREATE TABLE public.company_collaborators (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.collaborator_role NOT NULL DEFAULT 'member',
    invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(company_id, user_id)
);

-- Tabela de convites
CREATE TABLE public.company_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    email text NOT NULL,
    role public.collaborator_role NOT NULL DEFAULT 'member',
    invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status public.invitation_status NOT NULL DEFAULT 'pending',
    token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    created_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    UNIQUE(company_id, email)
);

-- Habilitar RLS
ALTER TABLE public.company_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para collaborators
CREATE POLICY "Users can view company collaborators" ON public.company_collaborators
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
            UNION
            SELECT company_id FROM public.company_collaborators WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Company owners can manage collaborators" ON public.company_collaborators
    FOR ALL USING (
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
        )
    );

-- Políticas RLS para invitations
CREATE POLICY "Users can view relevant invitations" ON public.company_invitations
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
        )
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Company owners can manage invitations" ON public.company_invitations
    FOR ALL USING (
        company_id IN (
            SELECT id FROM public.empresas WHERE user_id = auth.uid()
        )
    );

-- Função para aceitar convites
CREATE OR REPLACE FUNCTION accept_company_invitation(invitation_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record public.company_invitations;
    user_record auth.users;
BEGIN
    -- Verificar usuário autenticado
    SELECT * INTO user_record FROM auth.users WHERE id = auth.uid();
    IF user_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;
    
    -- Buscar convite válido
    SELECT * INTO invitation_record 
    FROM public.company_invitations 
    WHERE token = invitation_token 
    AND status = 'pending' 
    AND expires_at > now();
    
    IF invitation_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Verificar email
    IF invitation_record.email != user_record.email THEN
        RETURN json_build_object('success', false, 'error', 'Email mismatch');
    END IF;
    
    -- Verificar se já é colaborador
    IF EXISTS (
        SELECT 1 FROM public.company_collaborators 
        WHERE company_id = invitation_record.company_id 
        AND user_id = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already a collaborator');
    END IF;
    
    -- Aceitar convite
    UPDATE public.company_invitations 
    SET status = 'accepted', accepted_at = now() 
    WHERE id = invitation_record.id;
    
    -- Adicionar como colaborador
    INSERT INTO public.company_collaborators (company_id, user_id, role, invited_by)
    VALUES (invitation_record.company_id, auth.uid(), invitation_record.role, invitation_record.invited_by);
    
    RETURN json_build_object(
        'success', true, 
        'company_id', invitation_record.company_id,
        'role', invitation_record.role
    );
END;
$$;

-- Função para criar owner automaticamente
CREATE OR REPLACE FUNCTION create_company_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.company_collaborators (company_id, user_id, role, invited_by)
    VALUES (NEW.id, NEW.user_id, 'owner', NEW.user_id);
    RETURN NEW;
END;
$$;

-- Trigger para criar owner automaticamente
CREATE TRIGGER auto_create_company_owner
    AFTER INSERT ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION create_company_owner();

-- Índices para performance
CREATE INDEX idx_company_collaborators_company_id ON public.company_collaborators(company_id);
CREATE INDEX idx_company_collaborators_user_id ON public.company_collaborators(user_id);
CREATE INDEX idx_company_invitations_company_id ON public.company_invitations(company_id);
CREATE INDEX idx_company_invitations_email ON public.company_invitations(email);
CREATE INDEX idx_company_invitations_token ON public.company_invitations(token);
CREATE INDEX idx_company_invitations_status ON public.company_invitations(status);