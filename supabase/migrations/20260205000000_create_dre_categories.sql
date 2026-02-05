-- Configurable DRE categories (principal + subcategories) per company

create table if not exists public.dre_categorias_dre (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  parent_id uuid references public.dre_categorias_dre(id) on delete cascade,
  codigo text not null,
  nome text not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint dre_categorias_dre_codigo_format check (codigo ~ '^[0-9]+(\.[0-9]+)*$')
);

create unique index if not exists dre_categorias_dre_empresa_codigo_uq
  on public.dre_categorias_dre (empresa_id, codigo);

create index if not exists dre_categorias_dre_empresa_parent_idx
  on public.dre_categorias_dre (empresa_id, parent_id);

alter table public.dre_categorias_dre enable row level security;

drop policy if exists dre_categorias_dre_select_member on public.dre_categorias_dre;
drop policy if exists dre_categorias_dre_insert_member on public.dre_categorias_dre;
drop policy if exists dre_categorias_dre_update_member on public.dre_categorias_dre;

create policy dre_categorias_dre_select_member on public.dre_categorias_dre
  for select
  using (public.is_company_member(empresa_id));

create policy dre_categorias_dre_insert_member on public.dre_categorias_dre
  for insert
  with check (public.is_company_member(empresa_id) and auth.uid() = user_id);

create policy dre_categorias_dre_update_member on public.dre_categorias_dre
  for update
  using (public.is_company_member(empresa_id))
  with check (public.is_company_member(empresa_id));

create or replace function public.delete_dre_categoria(p_categoria_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  c record;
  escaped text;
  pattern text;
begin
  select * into c
  from public.dre_categorias_dre
  where id = p_categoria_id;

  if not found then
    raise exception 'Categoria não encontrada';
  end if;

  if not public.is_company_member(c.empresa_id) then
    raise exception 'Sem permissão';
  end if;

  escaped := regexp_replace(c.codigo, '\.', '\\.', 'g');

  if c.parent_id is null then
    pattern := '^' || escaped || '\.';
  else
    pattern := '^' || escaped || '(\.|\s)';
  end if;

  if exists (
    select 1
    from public.contas_contabeis cc
    where cc.empresa_id = c.empresa_id
      and cc.categoria ~ pattern
    limit 1
  ) then
    raise exception 'Não é possível excluir: categoria está vinculada a contas';
  end if;

  delete from public.dre_categorias_dre
  where id = p_categoria_id;
end;
$$;

grant execute on function public.delete_dre_categoria(uuid) to authenticated;

