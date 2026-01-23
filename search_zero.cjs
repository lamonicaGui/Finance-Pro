
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function searchZero() {
    console.log("Buscando registros com Qtd = 0 em open_positions...");
    const { data, count, error } = await supabase
        .from('open_positions')
        .select('*', { count: 'exact' })
        .eq('qtd', 0);

    if (error) {
        console.log("Erro ao buscar qtd=0:", error.message);
        // Tentar Qtd (maiúsculo)
        const { count: count2 } = await supabase.from('open_positions').select('*', { count: 'exact' }).eq('Qtd', 0);
        console.log("Contagem com Qtd (maiúsculo) = 0:", count2);
    } else {
        console.log("Contagem com qtd (minúsculo) = 0:", count);
    }

    // Tentar QUALQUER registro de novo, mas com head: false para forçar data
    const { data: allData } = await supabase.from('open_positions').select('*').limit(5);
    console.log("Primeiros 5 registros (sem filtro):", allData);
}

searchZero();
