
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
    console.log("Buscando dados para SERGIO HENRIQUE DE SOUZA - GOGL34...");
    const { data, error } = await supabase
        .from('executed_orders')
        .select('*')
        .ilike('cliente', '%SERGIO HENRIQUE%')
        .eq('papel', 'GOGL34')
        .order('data', { ascending: true });

    if (error) {
        console.error("Erro:", error);
        return;
    }

    console.log("Registros encontrados:", data?.length);
    data?.forEach(r => {
        const side = r["c/v"] || r.cv;
        const qty = r["qtd_exec"] || r.quantidade;
        const prc = r["prc_medio"] || r.preco_medio;
        console.log(`[${r.data}] ${side} | Qtd: ${qty} | Prc: ${prc} | Status: ${r.status}`);
    });
}

debug();
