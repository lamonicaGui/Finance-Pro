
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAll() {
    console.log("Tentando encontrar a tabela em qualquer lugar...");
    // Tentar RPC se existir (improvável mas vamos testar)
    // Se não, vamos testar nomes comuns em loop
    const schemas = ['public', 'kat', 'sinacor'];
    const tables = ['open_positions', 'Open_Positions', 'posicoes', 'OpenPositions'];

    for (const s of schemas) {
        for (const t of tables) {
            const { count, error } = await supabase
                .from(t) // PostgREST doesn't support schema selection via .from() easily 
                // unless configured via headers, but usually it's public.
                .select('*', { count: 'exact', head: true });

            if (!error) {
                console.log(`Schema? [default] | Tabela: ${t} | Registros: ${count}`);
            }
        }
    }
}

listAll();
