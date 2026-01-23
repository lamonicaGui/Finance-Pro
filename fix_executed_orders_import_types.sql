-- Execute this in the Supabase SQL Editor to fix both date and numeric format errors (22008 and 22P02).
-- This changes problematic columns to TEXT, allowing Brazilian formats (DD/MM/YYYY and 11,11) to be imported.

ALTER TABLE IF EXISTS public.executed_orders 
ALTER COLUMN data TYPE TEXT,
ALTER COLUMN data_hora TYPE TEXT,
ALTER COLUMN qtd_exec TYPE TEXT,
ALTER COLUMN prc_medio TYPE TEXT,
ALTER COLUMN volume TYPE TEXT;

-- Success: You can now import the CSV regardless of date or number formatting.
