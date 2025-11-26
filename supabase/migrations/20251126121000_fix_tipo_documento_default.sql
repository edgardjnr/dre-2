-- Corrige default e constraint da coluna tipo_documento em contas_a_pagar

-- Ajustar default para um valor válido
ALTER TABLE public.contas_a_pagar 
ALTER COLUMN tipo_documento SET DEFAULT 'boleto';

-- Remover constraint antigo, se existir
ALTER TABLE public.contas_a_pagar 
DROP CONSTRAINT IF EXISTS check_tipo_documento;

-- Adicionar constraint com os valores permitidos
ALTER TABLE public.contas_a_pagar 
ADD CONSTRAINT check_tipo_documento 
CHECK (tipo_documento IN ('boleto', 'pix'));

-- Normalizar valores existentes inválidos
UPDATE public.contas_a_pagar 
SET tipo_documento = 'boleto' 
WHERE tipo_documento IS NULL 
   OR tipo_documento IN ('boleta', 'BOL', 'boleto ');

-- Opcional: normalizar outras variações de pix
UPDATE public.contas_a_pagar 
SET tipo_documento = 'pix' 
WHERE tipo_documento IN ('nota_fiscal', 'PIX', 'pix ');

COMMENT ON COLUMN public.contas_a_pagar.tipo_documento IS 'Tipo do documento: boleto ou pix';
