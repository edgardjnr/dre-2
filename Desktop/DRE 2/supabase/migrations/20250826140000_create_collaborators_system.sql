/*
          ## Migration: Create Collaborators System

          This migration creates the necessary tables and policies for a collaborative user management system:
          
          ### Tables Created:
          1. `empresa_collaborators` - Links users to companies with roles
          2. `invitations` - Manages pending invitations to join companies
          
          ### Features:
          - Company owners (masters) can invite collaborators
          - Collaborators have full access to company resources
          - Invitation system with email notifications
          - Role-based access control
          - Row-level security enforced
          
          ### Security:
          - Masters can only manage their own companies
          - Collaborators can only access companies they're invited to
          - Invitations can only be sent by company masters
          - All operations respect user authentication
          
          ## Metadata:
          - Schema-Category: "Collaborative"
          - Impact-Level: "Medium"
          - Requires-Backup: false
          - Reversible: true
          */

-- Create ENUM types for roles and invitation status
CREATE TYPE public.collaborator_role_enum AS ENUM ('master', 'collaborator');
CREATE TYPE public.invitation_status_enum AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- 1. Table: empresa_collaborators
-- Links users to companies with their roles
CREATE TABLE IF NOT EXISTS public.empresa_collaborators (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.collaborator_role_enum NOT NULL DEFAULT 'collaborator',
    invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(empresa_id, user_id)
);

-- 2. Table: invitations  
-- Manages pending invitations to join companies
CREATE TABLE IF NOT EXISTS public.invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    role public.collaborator_role_enum NOT NULL DEFAULT 'collaborator',
    status public.invitation_status_enum NOT NULL DEFAULT 'pending',
    token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64'),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    created_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz NULL,
    UNIQUE(empresa_id, email)
);

-- Enable RLS on new tables
ALTER TABLE public.empresa_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for empresa_collaborators
-- Users can see collaborators of companies they have access to
CREATE POLICY "Users can view collaborators of accessible companies" ON public.empresa_collaborators
    FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.empresa_collaborators 
            WHERE user_id = auth.uid()
        )
        OR empresa_id IN (
            SELECT id 
            FROM public.empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Only masters can manage collaborators
CREATE POLICY "Masters can manage collaborators" ON public.empresa_collaborators
    FOR ALL
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.empresa_collaborators 
            WHERE user_id = auth.uid() AND role = 'master'
        )
        OR empresa_id IN (
            SELECT id 
            FROM public.empresas 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.empresa_collaborators 
            WHERE user_id = auth.uid() AND role = 'master'
        )
        OR empresa_id IN (
            SELECT id 
            FROM public.empresas 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for invitations
-- Users can view invitations for companies they have access to
CREATE POLICY "Users can view invitations for accessible companies" ON public.invitations
    FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.empresa_collaborators 
            WHERE user_id = auth.uid() AND role = 'master'
        )
        OR empresa_id IN (
            SELECT id 
            FROM public.empresas 
            WHERE user_id = auth.uid()
        )
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Only masters can create invitations
CREATE POLICY "Masters can create invitations" ON public.invitations
    FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.empresa_collaborators 
            WHERE user_id = auth.uid() AND role = 'master'
        )
        OR empresa_id IN (
            SELECT id 
            FROM public.empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Masters can update and delete their invitations
CREATE POLICY "Masters can manage invitations" ON public.invitations
    FOR UPDATE
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.empresa_collaborators 
            WHERE user_id = auth.uid() AND role = 'master'
        )
        OR empresa_id IN (
            SELECT id 
            FROM public.empresas 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Masters can delete invitations" ON public.invitations
    FOR DELETE
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.empresa_collaborators 
            WHERE user_id = auth.uid() AND role = 'master'
        )
        OR empresa_id IN (
            SELECT id 
            FROM public.empresas 
            WHERE user_id = auth.uid()
        )
    );

-- Function to automatically create master collaborator when company is created
CREATE OR REPLACE FUNCTION create_master_collaborator()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the company creator as master collaborator
    INSERT INTO public.empresa_collaborators (empresa_id, user_id, role, invited_by)
    VALUES (NEW.id, NEW.user_id, 'master', NEW.user_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create master collaborator
DROP TRIGGER IF EXISTS auto_create_master_collaborator ON public.empresas;
CREATE TRIGGER auto_create_master_collaborator
    AFTER INSERT ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION create_master_collaborator();

-- Function to handle invitation acceptance
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token text)
RETURNS json AS $$
DECLARE
    invitation_record public.invitations;
    user_record auth.users;
    result json;
BEGIN
    -- Get current user
    SELECT * INTO user_record FROM auth.users WHERE id = auth.uid();
    
    IF user_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;
    
    -- Get invitation
    SELECT * INTO invitation_record 
    FROM public.invitations 
    WHERE token = invitation_token 
    AND status = 'pending' 
    AND expires_at > now();
    
    IF invitation_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if email matches
    IF invitation_record.email != user_record.email THEN
        RETURN json_build_object('success', false, 'error', 'Email does not match invitation');
    END IF;
    
    -- Check if user is already a collaborator
    IF EXISTS (
        SELECT 1 FROM public.empresa_collaborators 
        WHERE empresa_id = invitation_record.empresa_id 
        AND user_id = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'User is already a collaborator');
    END IF;
    
    -- Accept invitation
    UPDATE public.invitations 
    SET status = 'accepted', accepted_at = now() 
    WHERE id = invitation_record.id;
    
    -- Add user as collaborator
    INSERT INTO public.empresa_collaborators (empresa_id, user_id, role, invited_by)
    VALUES (invitation_record.empresa_id, auth.uid(), invitation_record.role, invitation_record.invited_by);
    
    RETURN json_build_object('success', true, 'empresa_id', invitation_record.empresa_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_empresa_collaborators_empresa_id ON public.empresa_collaborators(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_collaborators_user_id ON public.empresa_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_empresa_id ON public.invitations(empresa_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);