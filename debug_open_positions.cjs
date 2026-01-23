
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
    console.log("Buscando amostra de open_positions...");
    const { data, error } = await supabase
        .from('open_positions')
        .select('*')
        .limit(10);

    if (error) {
        console.error("Erro:", error);
        return;
    }

    console.log("Amostra de registros:", data?.length);
    data?.forEach(r => {
        console.log(`Cliente: "${r.cliente_nome}" | Conta: "${r.conta}" | Ativo: ${r.ativo} | Qtd: ${r.qtd || r.Qtd}`);
    });
}

debug();
