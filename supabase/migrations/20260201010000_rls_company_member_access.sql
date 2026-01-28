-- Allow collaborators to access company data (empresas, contas_contabeis, lancamentos, contas_a_pagar)

CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  select exists(
    select 1 from public.empresas e
    where e.id = p_company_id
      and e.ativa is true
      and e.user_id = auth.uid()
  )
  or exists(
    select 1 from public.company_collaborators cc
    where cc.company_id = p_company_id
      and cc.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS TABLE (
  id uuid,
  razao_social text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  select e.id, e.razao_social
  from public.empresas e
  where e.ativa is true
    and public.is_company_member(e.id)
  order by e.razao_social;
$$;

GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_companies() TO authenticated;

-- Empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access to own empresas" ON public.empresas;
DROP POLICY IF EXISTS "empresas_select_member" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert_owner" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update_member" ON public.empresas;
DROP POLICY IF EXISTS "empresas_delete_member" ON public.empresas;

CREATE POLICY empresas_select_member ON public.empresas
  FOR SELECT
  USING (public.is_company_member(id));

CREATE POLICY empresas_insert_owner ON public.empresas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY empresas_update_member ON public.empresas
  FOR UPDATE
  USING (public.is_company_member(id))
  WITH CHECK (public.is_company_member(id));

CREATE POLICY empresas_delete_member ON public.empresas
  FOR DELETE
  USING (public.is_company_member(id));

-- Contas Contábeis
ALTER TABLE public.contas_contabeis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access to own contas" ON public.contas_contabeis;
DROP POLICY IF EXISTS "contas_contabeis_select_member" ON public.contas_contabeis;
DROP POLICY IF EXISTS "contas_contabeis_insert_member" ON public.contas_contabeis;
DROP POLICY IF EXISTS "contas_contabeis_update_member" ON public.contas_contabeis;
DROP POLICY IF EXISTS "contas_contabeis_delete_member" ON public.contas_contabeis;

CREATE POLICY contas_contabeis_select_member ON public.contas_contabeis
  FOR SELECT
  USING (public.is_company_member(empresa_id));

CREATE POLICY contas_contabeis_insert_member ON public.contas_contabeis
  FOR INSERT
  WITH CHECK (public.is_company_member(empresa_id) and auth.uid() = user_id);

CREATE POLICY contas_contabeis_update_member ON public.contas_contabeis
  FOR UPDATE
  USING (public.is_company_member(empresa_id))
  WITH CHECK (public.is_company_member(empresa_id));

CREATE POLICY contas_contabeis_delete_member ON public.contas_contabeis
  FOR DELETE
  USING (public.is_company_member(empresa_id));

-- Lançamentos
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access to own lancamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "lancamentos_select_member" ON public.lancamentos;
DROP POLICY IF EXISTS "lancamentos_insert_member" ON public.lancamentos;
DROP POLICY IF EXISTS "lancamentos_update_member" ON public.lancamentos;
DROP POLICY IF EXISTS "lancamentos_delete_member" ON public.lancamentos;

CREATE POLICY lancamentos_select_member ON public.lancamentos
  FOR SELECT
  USING (public.is_company_member(empresa_id));

CREATE POLICY lancamentos_insert_member ON public.lancamentos
  FOR INSERT
  WITH CHECK (public.is_company_member(empresa_id) and auth.uid() = user_id);

CREATE POLICY lancamentos_update_member ON public.lancamentos
  FOR UPDATE
  USING (public.is_company_member(empresa_id))
  WITH CHECK (public.is_company_member(empresa_id));

CREATE POLICY lancamentos_delete_member ON public.lancamentos
  FOR DELETE
  USING (public.is_company_member(empresa_id));

-- Contas a pagar
ALTER TABLE public.contas_a_pagar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access to own contas_a_pagar" ON public.contas_a_pagar;
DROP POLICY IF EXISTS "contas_a_pagar_select_member" ON public.contas_a_pagar;
DROP POLICY IF EXISTS "contas_a_pagar_insert_member" ON public.contas_a_pagar;
DROP POLICY IF EXISTS "contas_a_pagar_update_member" ON public.contas_a_pagar;
DROP POLICY IF EXISTS "contas_a_pagar_delete_member" ON public.contas_a_pagar;

CREATE POLICY contas_a_pagar_select_member ON public.contas_a_pagar
  FOR SELECT
  USING (public.is_company_member(empresa_id));

CREATE POLICY contas_a_pagar_insert_member ON public.contas_a_pagar
  FOR INSERT
  WITH CHECK (public.is_company_member(empresa_id) and auth.uid() = user_id);

CREATE POLICY contas_a_pagar_update_member ON public.contas_a_pagar
  FOR UPDATE
  USING (public.is_company_member(empresa_id))
  WITH CHECK (public.is_company_member(empresa_id));

CREATE POLICY contas_a_pagar_delete_member ON public.contas_a_pagar
  FOR DELETE
  USING (public.is_company_member(empresa_id));

