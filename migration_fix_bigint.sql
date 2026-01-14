-- Migration script to fix "invalid input syntax for type bigint" during import
-- This converts numeric ID columns to TEXT to handle empty strings (NULL/empty) gracefully.

ALTER TABLE public.cadastro_clientes 
  ALTER COLUMN "Conta" TYPE text,
  ALTER COLUMN "Cód Assessor" TYPE text,
  ALTER COLUMN "Cód Sinacor" TYPE text;

-- Important: If you had a primary key on "Cód Sinacor", it remains valid as TEXT.
-- This change allows the CSV/Excel import to succeed even if some rows have empty values in these columns.
