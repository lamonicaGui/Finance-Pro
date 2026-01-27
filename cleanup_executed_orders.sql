-- Limpar a tabela de ordens executadas
DELETE FROM executed_orders;

-- Ou se preferir garantir que o ID reinicie (se for serial/identity)
-- TRUNCATE TABLE executed_orders RESTART IDENTITY;
