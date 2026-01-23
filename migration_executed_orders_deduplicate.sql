-- Execute this script in the Supabase SQL Editor to prevent duplicate trade records.
-- This trigger will ignore identical rows (same data, cliente, papel, cv, quantidade, preco_medio, conta) during import.

-- 1. Create the de-duplication function
CREATE OR REPLACE FUNCTION public.skip_duplicate_executed_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if an identical record already exists
    -- We use COALESCE to handle potential NULLs in columns that might be empty
    IF EXISTS (
        SELECT 1 FROM public.executed_orders 
        WHERE 
            COALESCE(data, '') = COALESCE(NEW.data, '') AND
            COALESCE(cliente, '') = COALESCE(NEW.cliente, '') AND
            COALESCE(papel, '') = COALESCE(NEW.papel, '') AND
            COALESCE(cv, '') = COALESCE(NEW.cv, '') AND
            COALESCE(qtd_exec, '') = COALESCE(NEW.qtd_exec, '') AND
            COALESCE(prc_medio, '') = COALESCE(NEW.prc_medio, '') AND
            COALESCE(conta, '') = COALESCE(NEW.conta, '')
    ) THEN
        -- If exists, skip the insert
        RETURN NULL;
    END IF;

    -- Otherwise, allow the insert
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trigger_skip_duplicate_executed_orders ON public.executed_orders;

CREATE TRIGGER trigger_skip_duplicate_executed_orders
BEFORE INSERT ON public.executed_orders
FOR EACH ROW
EXECUTE FUNCTION public.skip_duplicate_executed_orders();

-- NOTE: This trigger only prevents NEW duplicates from being inserted.
-- To clean existing duplicates, you could run a standard de-duplication query.
