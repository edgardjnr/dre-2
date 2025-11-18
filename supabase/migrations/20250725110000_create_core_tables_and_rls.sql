/*
          # [Structural] Create Core Application Tables and RLS Policies
          This migration script creates the core tables for the DRE system (empresas, contas_contabeis, lancamentos) and establishes the necessary security policies (RLS) to ensure data privacy and security for a multi-tenant application.

          ## Query Description:
          - Creates custom ENUM types for structured data.
          - Defines the main tables with appropriate columns, constraints, and foreign key relationships.
          - Associates every piece of data with a specific user via a `user_id` column.
          - Enables Row Level Security (RLS) on all new tables.
          - Implements RLS policies to ensure users can only access and modify their own data.
          This is a foundational and safe operation for a new setup. No existing data is affected.

          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true

          ## Structure Details:
          - Tables created: `empresas`, `contas_contabeis`, `lancamentos`.
          - Types created: `regime_tributario_enum`, `conta_categoria_enum`, `conta_tipo_enum`, `lancamento_tipo_enum`.
          - Foreign Keys: Establishes relationships between users, empresas, contas, and lançamentos.

          ## Security Implications:
          - RLS Status: Enabled on all new tables.
          - Policy Changes: Yes, new policies are created to restrict data access to the owner.
          - Auth Requirements: Policies rely on `auth.uid()` to identify the current user.
          
          ## Performance Impact:
          - Indexes: Primary keys and foreign keys are indexed by default.
          - Triggers: None added in this script.
          - Estimated Impact: Low. Standard table creation.
          */

-- Create custom ENUM types for consistency
DROP TYPE IF EXISTS public.regime_tributario_enum;
CREATE TYPE public.regime_tributario_enum AS ENUM ('Simples Nacional', 'Lucro Presumido', 'Lucro Real');

DROP TYPE IF EXISTS public.conta_categoria_enum;
CREATE TYPE public.conta_categoria_enum AS ENUM (
    'Receita Bruta',
    'Deduções e Impostos',
    'Custo dos Produtos Vendidos',
    'Despesas Comerciais',
    'Despesas Administrativas',
    'Outras Despesas Operacionais',
    'Receitas Financeiras',
    'Despesas Financeiras',
    'Impostos sobre Lucro'
);

DROP TYPE IF EXISTS public.conta_tipo_enum;
CREATE TYPE public.conta_tipo_enum AS ENUM ('Analítica', 'Sintética');

DROP TYPE IF EXISTS public.lancamento_tipo_enum;
CREATE TYPE public.lancamento_tipo_enum AS ENUM ('Débito', 'Crédito');


-- 1. Empresas Table
CREATE TABLE IF NOT EXISTS public.empresas (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    razao_social text NOT NULL,
    cnpj text NOT NULL UNIQUE,
    regime_tributario public.regime_tributario_enum,
    data_abertura date,
    email text,
    telefone text,
    endereco text,
    ativa boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for Empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access to own empresas" ON public.empresas;
CREATE POLICY "Enable access to own empresas" ON public.empresas
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 2. Contas Contábeis Table
CREATE TABLE IF NOT EXISTS public.contas_contabeis (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo text NOT NULL,
    nome text NOT NULL,
    categoria public.conta_categoria_enum NOT NULL,
    tipo public.conta_tipo_enum NOT NULL,
    ativa boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(empresa_id, codigo)
);

-- RLS for Contas Contábeis
ALTER TABLE public.contas_contabeis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access to own contas" ON public.contas_contabeis;
CREATE POLICY "Enable access to own contas" ON public.contas_contabeis
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 3. Lançamentos Table
CREATE TABLE IF NOT EXISTS public.lancamentos (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    conta_id uuid NOT NULL REFERENCES public.contas_contabeis(id) ON DELETE CASCADE,
    data date NOT NULL,
    descricao text NOT NULL,
    valor numeric(15, 2) NOT NULL,
    tipo public.lancamento_tipo_enum NOT NULL,
    historico text,
    documento text,
    observacoes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for Lançamentos
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access to own lancamentos" ON public.lancamentos;
CREATE POLICY "Enable access to own lancamentos" ON public.lancamentos
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
