
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
    console.log("Inspecionando todas as tabelas acessíveis...");
    // Tentar ler de information_schema.columns para pegar todas as tabelas que têm colunas
    const { data: cols, error } = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name')
        .limit(100);

    if (error) {
        console.log("Erro ao acessar information_schema.columns:", error.message);
        // Tentar outro approach: listar tabelas via rpc se possível, ou apenas testar nomes comuns exatos
        const tests = ['open_positions', 'Open_Positions', 'OpenPositions', 'posicoes_aberto', 'Posicoes_Aberto', 'posicoes_em_aberto'];
        for (const t of tests) {
            const { count, error: err } = await supabase.from(t).select('*', { count: 'exact', head: true });
            if (!err) console.log(`Sucesso: ${t} | Registros: ${count}`);
            else console.log(`Falha: ${t} | Erro: ${err.message}`);
        }
    } else {
        const tables = [...new Set(cols.map(c => c.table_name))];
        console.log("Tabelas encontradas no information_schema:", tables);
    }
}

inspect();
