const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanup() {
    console.log("Iniciando limpeza da tabela 'executed_orders'...");

    // Obs: DELETE sem filtro no Supabase/Postgrest requer que a política de RLS permita
    // ou que o modo "Confirm Delete" esteja desativado se for via UI.
    // Aqui tentamos deletar onde o cliente não é nulo (praticamente todos) ou usando neq('cliente', '___')

    const { data, error, count } = await supabase
        .from('executed_orders')
        .delete({ count: 'exact' })
        .neq('cliente', 'valor_inexistente_para_forcar_delete_total');

    if (error) {
        console.error("Erro ao limpar a base:", error.message);
        console.log("Dica: Verifique se a política de RLS permite DELETE para usuários anônimos.");
    } else {
        console.log(`Sucesso! Foram removidos ${count} registros da tabela 'executed_orders'.`);
    }
}

cleanup();
