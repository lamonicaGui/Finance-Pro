-- Execute this script in the Supabase SQL Editor BEFORE importing a new CSV/Excel file.
-- This clears the existing client list to prevent "duplicate key" (Cód Sinacor) errors.

DELETE FROM public.cadastro_clientes;

-- Alternatively, use TRUNCATE for faster performance on very large tables:
-- TRUNCATE public.cadastro_clientes;
