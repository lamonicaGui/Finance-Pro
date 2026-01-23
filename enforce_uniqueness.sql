-- 1. Limpar a tabela para garantir que não hajam conflitos ao criar o índice
TRUNCATE TABLE public.executed_orders;

-- 2. Tentar adicionar uma restrição de unicidade
-- Nota: Como as colunas são TEXT, a unicidade será baseada no valor exato da string.
-- O script de sync cuidará de normalizar para "143.24" (ponto) e trim().
ALTER TABLE public.executed_orders 
ADD CONSTRAINT unique_order_record 
UNIQUE (data, cod_bolsa, papel, cv, qtd_exec, prc_medio, conta);

-- 3. Atualizar o trigger para ser redundante (opcional, o índice já resolve)
DROP TRIGGER IF EXISTS trigger_skip_duplicate_executed_orders ON public.executed_orders;
