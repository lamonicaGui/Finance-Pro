
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function searchAny() {
    console.log("Buscando QUALQUER registro em open_positions...");
    const { data, count, error } = await supabase
        .from('open_positions')
        .select('*', { count: 'exact' });

    if (error) {
        console.error("Erro:", error);
        return;
    }

    console.log("Contagem exata de registros:", count);
    if (data && data.length > 0) {
        console.log("Primeira linha encontrada:", data[0]);
    }
}

searchAny();
