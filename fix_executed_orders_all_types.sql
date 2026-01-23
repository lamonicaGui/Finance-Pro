-- Execute this in the Supabase SQL Editor to fix ALL import format errors.
-- This script covers dates, timestamps, and numbers that often cause "out of range" or "syntax" errors.

ALTER TABLE IF EXISTS public.executed_orders 
ALTER COLUMN data TYPE TEXT,
ALTER COLUMN data_hora TYPE TEXT,
ALTER COLUMN liquidacao TYPE TEXT,
ALTER COLUMN qtd_exec TYPE TEXT,
ALTER COLUMN prc_medio TYPE TEXT,
ALTER COLUMN volume TYPE TEXT,
ALTER COLUMN cod_bolsa TYPE TEXT,
ALTER COLUMN conta TYPE TEXT;

-- Success: All problematic columns are now TEXT. 
-- You should be able to import the CSV completely now.
