-- Execute this script in the Supabase SQL Editor to enable automatic protection against duplicates.
-- This will cause the import to IGNORE rows that already exist or have empty IDs, instead of failing.

-- 1. Create the function that checks for duplicates
CREATE OR REPLACE FUNCTION public.skip_duplicate_clients()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip if Cód Sinacor is empty or NULL
    IF NEW."Cód Sinacor" IS NULL OR NEW."Cód Sinacor" = '' THEN
        RETURN NULL;
    END IF;

    -- Skip if Cód Sinacor already exists in the table
    IF EXISTS (SELECT 1 FROM public.cadastro_clientes WHERE "Cód Sinacor" = NEW."Cód Sinacor") THEN
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger (drops it first to avoid errors)
DROP TRIGGER IF EXISTS trigger_skip_duplicate_clients ON public.cadastro_clientes;

CREATE TRIGGER trigger_skip_duplicate_clients
BEFORE INSERT ON public.cadastro_clientes
FOR EACH ROW
EXECUTE FUNCTION public.skip_duplicate_clients();

-- SUCCESS: Now you can import your file even if it has duplicates or empty rows.
-- The duplicates will simply be ignored, and only new data will be added.
