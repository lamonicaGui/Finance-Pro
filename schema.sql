-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account TEXT,
    name TEXT,
    email TEXT,
    cc TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    ticker TEXT,
    side TEXT,
    "lastPrice" NUMERIC,
    "orderPrice" NUMERIC,
    mode TEXT,
    basis TEXT,
    value NUMERIC,
    "stopLoss" BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Master Registry Table (Cadastro de Clientes)
CREATE TABLE IF NOT EXISTS public.cadastro_clientes (
  "Source.Name" text null,
  "Conta" text null,
  "Cód Assessor" text null,
  "Assessor" text null,
  "Cód Sinacor" text not null,
  "Status" text null,
  "Data Suitability" text null,
  "Vencimento Suitability" text null,
  "Encerrar?" text null,
  "Cliente" text null,
  "Atividade" text null,
  "E-mail" text null,
  "Telefone" text null,
  "Carteira BDR" text null,
  "Carteira BEN" text null,
  "Carteira HB" text null,
  "Carteira BR" text null,
  "Carteira FII" text null,
  "Suitability" text null,
  "Tipo investidor" text null,
  "Conta Global" text null,
  constraint cadastro_clientes_pkey primary key ("Cód Sinacor")
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastro_clientes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for production)
CREATE POLICY "Enable all for anonymous users" ON public.clients FOR ALL USING (true);
CREATE POLICY "Enable all for anonymous users" ON public.orders FOR ALL USING (true);
CREATE POLICY "Enable select for anonymous users" ON public.cadastro_clientes FOR SELECT USING (true);

-- (Fim do arquivo)
