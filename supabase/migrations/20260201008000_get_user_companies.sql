-- Return companies available to the logged user (owner or collaborator)

CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS TABLE (
  id uuid,
  razao_social text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  select e.id, e.razao_social
  from public.empresas e
  where e.ativa is true
    and (
      e.user_id = auth.uid()
      or exists (
        select 1
        from public.company_collaborators cc
        where cc.company_id = e.id
          and cc.user_id = auth.uid()
      )
    )
  order by e.razao_social;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_companies() TO authenticated;

