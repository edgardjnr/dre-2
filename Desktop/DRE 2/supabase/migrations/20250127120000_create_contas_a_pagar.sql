-- Criar enum para status das contas a pagar
CREATE TYPE public.conta_pagar_status_enum AS ENUM ('pendente', 'paga', 'vencida', 'cancelada');

-- Criar enum para categoria das contas
CREATE TYPE public.conta_pagar_categoria_enum AS ENUM (
    'fornecedores',
    'servicos',
    'impostos',
    'financiamento',
    'aluguel',
    'energia',
    'telefone',
    'internet',
    'outros'
);

-- Criar tabela contas_a_pagar
CREATE TABLE public.contas_a_pagar (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    fornecedor text NOT NULL,
    descricao text NOT NULL,
    categoria public.conta_pagar_categoria_enum NOT NULL DEFAULT 'outros',
    valor numeric(15, 2) NOT NULL CHECK (valor > 0),
    data_vencimento date NOT NULL,
    data_pagamento date,
    status public.conta_pagar_status_enum NOT NULL DEFAULT 'pendente',
    observacoes text,
    numero_documento text,
    foto_url text,
    foto_nome text,
    conta_contabil_id uuid REFERENCES public.contas_contabeis(id),
    lancamento_gerado_id uuid REFERENCES public.lancamentos(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_contas_a_pagar_user_id ON public.contas_a_pagar(user_id);
CREATE INDEX idx_contas_a_pagar_empresa_id ON public.contas_a_pagar(empresa_id);
CREATE INDEX idx_contas_a_pagar_status ON public.contas_a_pagar(status);
CREATE INDEX idx_contas_a_pagar_vencimento ON public.contas_a_pagar(data_vencimento);

-- RLS para Contas a Pagar
ALTER TABLE public.contas_a_pagar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable access to own contas_a_pagar" ON public.contas_a_pagar;
CREATE POLICY "Enable access to own contas_a_pagar" ON public.contas_a_pagar
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contas_a_pagar_updated_at
    BEFORE UPDATE ON public.contas_a_pagar
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket para fotos das contas (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contas-fotos', 'contas-fotos', false)
ON CONFLICT (id) DO NOTHING;

-- Política de storage para fotos
CREATE POLICY "Users can upload their own conta photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'contas-fotos' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own conta photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'contas-fotos' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own conta photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'contas-fotos' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own conta photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'contas-fotos' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );