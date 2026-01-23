
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStats() {
    console.log("Checando estatísticas de tabelas...");
    const { data, error } = await supabase
        .from('pg_stat_user_tables') // Usually not accessible via anon
        .select('*');

    if (error) {
        console.log("Erro ao acessar pg_stat_user_tables:", error.message);
        // Fallback: tentar adivinhar tabelas
        console.log("Tentando ler de tabelas comuns para ver quem tem dados...");
        const tables = ['open_positions', 'executed_orders', 'cadastro_clientes', 'orders', 'clients', 'posicoes'];
        for (const t of tables) {
            const { count, error: err } = await supabase.from(t).select('*', { count: 'exact', head: true });
            if (!err) console.log(`Tabela: ${t} | Registros: ${count}`);
        }
    } else {
        console.log("Stats:", data);
    }
}

checkStats();
