-- Remover enum de categoria das contas a pagar e tornar conta_contabil_id obrigatório
ALTER TABLE public.contas_a_pagar 
DROP COLUMN IF EXISTS categoria;

-- Tornar conta_contabil_id obrigatório
ALTER TABLE public.contas_a_pagar 
ALTER COLUMN conta_contabil_id SET NOT NULL;

-- Adicionar constraint para garantir que a conta contábil pertence à mesma empresa
ALTER TABLE public.contas_a_pagar 
ADD CONSTRAINT fk_conta_contabil_empresa 
FOREIGN KEY (conta_contabil_id) 
REFERENCES public.contas_contabeis(id) 
ON DELETE RESTRICT;

-- Criar função para validar empresa da conta contábil
CREATE OR REPLACE FUNCTION validate_conta_contabil_empresa()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se a conta contábil pertence à mesma empresa
    IF NOT EXISTS (
        SELECT 1 FROM public.contas_contabeis cc 
        WHERE cc.id = NEW.conta_contabil_id 
        AND cc.empresa_id = NEW.empresa_id
    ) THEN
        RAISE EXCEPTION 'A conta contábil deve pertencer à mesma empresa da conta a pagar';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validação
CREATE TRIGGER validate_conta_contabil_empresa_trigger
    BEFORE INSERT OR UPDATE ON public.contas_a_pagar
    FOR EACH ROW
    EXECUTE FUNCTION validate_conta_contabil_empresa();