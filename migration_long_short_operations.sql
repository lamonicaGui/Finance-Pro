-- Create the long_short_operations table
CREATE TABLE IF NOT EXISTS long_short_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente TEXT NOT NULL,
    ativo_long TEXT NOT NULL,
    qtd_long NUMERIC NOT NULL,
    pm_long NUMERIC NOT NULL,
    ativo_short TEXT NOT NULL,
    qtd_short NUMERIC NOT NULL,
    pm_short NUMERIC NOT NULL,
    data_inicio DATE NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE long_short_operations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read/write (as requested for multi-user reflection)
-- Note: Adjusting policies for production as needed, but for now allowing full access to authenticated users.
CREATE POLICY "Allow all actions for authenticated users" ON long_short_operations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
