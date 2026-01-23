
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function compare() {
    console.log("=== Investigando VILMA GIANNINI FORMENTI GASI ===");

    // 1. Buscar no Cadastro de Clientes
    const { data: catData, error: catError } = await supabase
        .from('cadastro_clientes')
        .select('*')
        .ilike('Cliente', '%VILMA GIANNINI FORMENTI GASI%');

    if (catError) console.error("Erro no Cadastro:", catError);
    else console.log("Cadastro:", JSON.stringify(catData, null, 2));

    // 2. Buscar em open_positions (Exato e Parcial)
    const { data: posData, error: posError } = await supabase
        .from('open_positions')
        .select('*')
        .ilike('cliente_nome', '%VILMA%');

    if (posError) console.error("Erro em Posições:", posError);
    else console.log("Posições encontradas:", JSON.stringify(posData, null, 2));

    // 3. Testar se o delete está funcionando (importante para o problema da duplicidade)
    // TENTAR deletar um registro qualquer para ver se RLS permite
    // Se falhar silenciosamente ou der erro, o TRUNCATE/DELETE do import falhou
}

compare();
