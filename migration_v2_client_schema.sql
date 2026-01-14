-- WARNING: This will delete all current client data to apply the new format.
-- If you need to keep data, back it up first!
DROP TABLE IF EXISTS public.cadastro_clientes CASCADE;

-- Create new structure as per image
CREATE TABLE public.cadastro_clientes (
    "Conta" TEXT,
    "Cod Bolsa" TEXT PRIMARY KEY,
    "Carteira" TEXT,
    "Cliente" TEXT,
    "Assessor" TEXT,
    "Base" TEXT,
    "Unidade" TEXT,
    "Especialista RV" TEXT,
    "Email Assessor" TEXT,
    "Email Cliente" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now()
);

-- Index for performance on common search fields
CREATE INDEX IF NOT EXISTS idx_cliente_search ON public.cadastro_clientes ("Cliente");
CREATE INDEX IF NOT EXISTS idx_cod_bolsa_search ON public.cadastro_clientes ("Cod Bolsa");

-- Trigger to prevent duplicate "Cod Bolsa" during import
CREATE OR REPLACE FUNCTION public.skip_duplicate_clients_v2()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip if Cod Bolsa is empty or NULL
    IF NEW."Cod Bolsa" IS NULL OR NEW."Cod Bolsa" = '' THEN
        RETURN NULL;
    END IF;

    -- Skip if Cod Bolsa already exists in the table
    IF EXISTS (SELECT 1 FROM public.cadastro_clientes WHERE "Cod Bolsa" = NEW."Cod Bolsa") THEN
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_skip_duplicate_clients ON public.cadastro_clientes;

CREATE TRIGGER trigger_skip_duplicate_clients
BEFORE INSERT ON public.cadastro_clientes
FOR EACH ROW
EXECUTE FUNCTION public.skip_duplicate_clients_v2();

-- Enable RLS
ALTER TABLE public.cadastro_clientes ENABLE ROW LEVEL SECURITY;

-- Policy for select
DROP POLICY IF EXISTS "Enable select for anonymous users" ON public.cadastro_clientes;
CREATE POLICY "Enable select for anonymous users" ON public.cadastro_clientes FOR SELECT USING (true);
