-- Create hawk_menu table
CREATE TABLE IF NOT EXISTS public.hawk_menu (
    id TEXT PRIMARY KEY,
    ticker TEXT NOT NULL,
    company TEXT,
    type TEXT, -- 'Ação Nacional' | 'BDR'
    term TEXT, -- '15 dias' | '30 dias'
    expiration TEXT,
    protection TEXT,
    gain TEXT,
    "cdiPercent" TEXT,
    "officeRevenue" TEXT,
    price NUMERIC,
    "minInvestment" NUMERIC,
    selected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create swing_trade_menu table
CREATE TABLE IF NOT EXISTS public.swing_trade_menu (
    id TEXT PRIMARY KEY,
    ticker TEXT NOT NULL,
    company TEXT,
    type TEXT, -- 'Compra' | 'Venda' | 'L&S'
    "entryPrice" NUMERIC,
    "targetPrice" NUMERIC,
    "stopPrice" NUMERIC,
    upside TEXT,
    downside TEXT,
    "startDate" TEXT,
    status TEXT, -- 'Em Aberto' | 'Valendo Entrada' | 'Encerrada'
    "graphTime" TEXT,
    "realizedReturn" TEXT,
    "closePrice" NUMERIC,
    "currentPrice" NUMERIC,
    selected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hawk_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swing_trade_menu ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for everyone" ON public.hawk_menu FOR ALL USING (true);
CREATE POLICY "Enable all for everyone" ON public.swing_trade_menu FOR ALL USING (true);
