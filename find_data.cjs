
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findData() {
    console.log("Procurando dados em QUALQUER tabela...");

    // Lista de tabelas que sabemos que existem ou podem existir
    const possibleTables = [
        'open_positions', 'executed_orders', 'cadastro_clientes', 'orders', 'clients',
        'posicoes', 'posicoes_aberto', 'posicao_aberto', 'saldos', 'saldos_aberto',
        'swing_trade_menu', 'profiles'
    ];

    for (const t of possibleTables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (!error && count > 0) {
            console.log(`ACHEI! Tabela: ${t} | Registros: ${count}`);
        } else if (!error) {
            console.log(`Tabela vazia: ${t}`);
        }
    }
}

findData();
