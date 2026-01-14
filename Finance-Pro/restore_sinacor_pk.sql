-- Script for cleaning data and restoring Cód Sinacor as Primary Key
-- Run this if you previously ran the UUID migration or if you want to ensure the PK is correct.

-- 1. Clear the table to avoid collisions during the process
DELETE FROM public.cadastro_clientes;

-- 2. Drop the UUID based primary key if it exists
ALTER TABLE public.cadastro_clientes DROP CONSTRAINT IF EXISTS cadastro_clientes_pkey;
ALTER TABLE public.cadastro_clientes DROP COLUMN IF EXISTS id;

-- 3. Restore "Cód Sinacor" as NOT NULL (required for PK)
-- We use a DELETE here just in case there are nulls that "NOT NULL" would conflict with.
-- But since we cleared the table in step 1, this is safe.
ALTER TABLE public.cadastro_clientes ALTER COLUMN "Cód Sinacor" SET NOT NULL;

-- 4. Re-add the Primary Key constraint on "Cód Sinacor"
ALTER TABLE public.cadastro_clientes ADD PRIMARY KEY ("Cód Sinacor");

-- NOTE: When importing your CSV/Excel, ensure that:
-- - All rows have a value for "Cód Sinacor".
-- - There are no empty rows at the end of the file.
-- - No two clients have the same "Cód Sinacor".
