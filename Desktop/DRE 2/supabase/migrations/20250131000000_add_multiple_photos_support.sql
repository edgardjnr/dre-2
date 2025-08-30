-- Criar tabela para múltiplas fotos das contas a pagar
CREATE TABLE public.conta_pagar_fotos (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conta_pagar_id uuid NOT NULL REFERENCES public.contas_a_pagar(id) ON DELETE CASCADE,
    foto_url text NOT NULL,
    foto_nome text NOT NULL,
    ordem integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_conta_pagar_fotos_conta_id ON public.conta_pagar_fotos(conta_pagar_id);
CREATE INDEX idx_conta_pagar_fotos_ordem ON public.conta_pagar_fotos(conta_pagar_id, ordem);

-- RLS para fotos das contas
ALTER TABLE public.conta_pagar_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own conta photos" ON public.conta_pagar_fotos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.contas_a_pagar cp 
            WHERE cp.id = conta_pagar_id AND cp.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contas_a_pagar cp 
            WHERE cp.id = conta_pagar_id AND cp.user_id = auth.uid()
        )
    );

-- Migrar fotos existentes da tabela contas_a_pagar para a nova tabela
INSERT INTO public.conta_pagar_fotos (conta_pagar_id, foto_url, foto_nome, ordem)
SELECT 
    id,
    foto_url,
    COALESCE(foto_nome, 'documento.jpg'),
    1
FROM public.contas_a_pagar 
WHERE foto_url IS NOT NULL AND foto_url != '';

-- Comentar as colunas antigas (não remover ainda para compatibilidade)
-- ALTER TABLE public.contas_a_pagar DROP COLUMN foto_url;
-- ALTER TABLE public.contas_a_pagar DROP COLUMN foto_nome;

COMMENT ON COLUMN public.contas_a_pagar.foto_url IS 'DEPRECATED: Use conta_pagar_fotos table instead';
COMMENT ON COLUMN public.contas_a_pagar.foto_nome IS 'DEPRECATED: Use conta_pagar_fotos table instead';