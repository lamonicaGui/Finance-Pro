-- Migration to remove Primary Key from "Cód Sinacor" and add a UUID Primary Key
-- This allows importing multiple rows even if "Cód Sinacor" is empty or duplicated.

-- 1. Remove existing primary key constraint
ALTER TABLE public.cadastro_clientes DROP CONSTRAINT IF EXISTS cadastro_clientes_pkey;

-- 2. Add a new surrogate primary key 'id'
-- If it already exists (from a previous failed run), we skip it, otherwise we add it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cadastro_clientes' AND column_name='id') THEN
        ALTER TABLE public.cadastro_clientes ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY;
    END IF;
END $$;

-- 3. Make "Cód Sinacor" nullable to allow empty strings during import
ALTER TABLE public.cadastro_clientes ALTER COLUMN "Cód Sinacor" DROP NOT NULL;

-- Now you can clear the table and import your CSV/Excel again.
-- DELETE FROM public.cadastro_clientes;
