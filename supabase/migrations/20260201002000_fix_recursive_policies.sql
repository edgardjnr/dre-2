CREATE OR REPLACE FUNCTION public.is_member(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
select exists(
  select 1 from public.company_collaborators
  where company_id = p_company_id and user_id = auth.uid()
);
$$;

ALTER TABLE public.company_collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company collaborators can manage collaborators" ON public.company_collaborators;
DROP POLICY IF EXISTS "Users can view company collaborators" ON public.company_collaborators;
CREATE POLICY company_collaborators_select ON public.company_collaborators FOR SELECT USING (public.is_member(company_id));
CREATE POLICY company_collaborators_insert ON public.company_collaborators FOR INSERT WITH CHECK (public.is_member(company_id));
CREATE POLICY company_collaborators_update ON public.company_collaborators FOR UPDATE USING (public.is_member(company_id)) WITH CHECK (public.is_member(company_id));
CREATE POLICY company_collaborators_delete ON public.company_collaborators FOR DELETE USING (public.is_member(company_id));
