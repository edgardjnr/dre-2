-- Adicionar coluna tipo_documento à tabela contas_a_pagar
ALTER TABLE public.contas_a_pagar 
ADD COLUMN tipo_documento TEXT DEFAULT 'boleta' NOT NULL;

-- Adicionar constraint para validar os valores permitidos
ALTER TABLE public.contas_a_pagar 
ADD CONSTRAINT check_tipo_documento 
CHECK (tipo_documento IN ('boleta', 'nota_fiscal'));

-- Comentário da coluna
COMMENT ON COLUMN public.contas_a_pagar.tipo_documento IS 'Tipo do documento: boleta ou nota_fiscal';