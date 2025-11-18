-- Atualizar constraint tipo_documento para aceitar valores do TypeScript
-- Remove o constraint antigo
ALTER TABLE public.contas_a_pagar 
DROP CONSTRAINT IF EXISTS check_tipo_documento;

-- Adiciona o novo constraint com os valores corretos
ALTER TABLE public.contas_a_pagar 
ADD CONSTRAINT check_tipo_documento 
CHECK (tipo_documento IN ('boleto', 'pix'));

-- Atualizar registros existentes se houver
UPDATE public.contas_a_pagar 
SET tipo_documento = 'boleto' 
WHERE tipo_documento = 'boleta';

UPDATE public.contas_a_pagar 
SET tipo_documento = 'pix' 
WHERE tipo_documento = 'nota_fiscal';

-- Atualizar comentário da coluna
COMMENT ON COLUMN public.contas_a_pagar.tipo_documento IS 'Tipo do documento: boleto ou pix';