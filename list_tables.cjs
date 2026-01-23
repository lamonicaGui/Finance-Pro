
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listTables() {
    console.log("Checando tabelas disponíveis...");
    const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        console.error("Erro ao listar tabelas via information_schema:", error);
        // Fallback: tentar acessar tabelas comuns
        const commonTables = ['open_positions', 'executed_orders', 'cadastro_clientes', 'posicoes_aberto', 'orders', 'clients'];
        for (const table of commonTables) {
            const { count, error: tableError } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            if (!tableError) {
                console.log(`Tabela: ${table} | Registros: ${count}`);
            }
        }
        return;
    }

    console.log("Tabelas encontradas:", tables.map(t => t.table_name));
}

listTables();
