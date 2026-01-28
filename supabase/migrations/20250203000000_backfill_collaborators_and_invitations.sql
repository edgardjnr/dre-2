-- Backfill owners into company_collaborators for existing empresas
INSERT INTO public.company_collaborators (company_id, user_id, role, invited_by)
SELECT e.id, e.user_id, 'owner'::public.collaborator_role, e.user_id
FROM public.empresas e
LEFT JOIN public.company_collaborators cc
  ON cc.company_id = e.id AND cc.user_id = e.user_id
WHERE cc.id IS NULL;

-- Migrate legacy invitations table to company_invitations if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'invitations'
  ) THEN
    INSERT INTO public.company_invitations (company_id, email, role, invited_by, token, expires_at, created_at, accepted_at)
    SELECT 
      i.empresa_id,
      i.email,
      CASE 
        WHEN i.role::text IN ('owner','admin','member','viewer') THEN i.role::text::public.collaborator_role
        ELSE 'member'::public.collaborator_role
      END,
      i.invited_by,
      i.token,
      i.expires_at,
      i.created_at,
      i.accepted_at
    FROM public.invitations i
    ON CONFLICT (company_id, email) DO NOTHING;
  END IF;
END $$;
