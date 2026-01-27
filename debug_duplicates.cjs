const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
    console.log("Fetching first 2000 records...");
    const { data, error } = await supabase.from('executed_orders').select('*').limit(2000);

    if (error) {
        console.error(error);
        return;
    }

    const groups = {};
    data.forEach(r => {
        const key = `${r.data}|${r.cliente}|${r.papel}|${r.cv}|${r.qtd_exec}|${r.prc_medio}|${r.conta}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    });

    const dups = Object.keys(groups).filter(k => groups[k].length > 1);
    console.log(`Encontradas ${dups.length} chaves duplicadas nos primeiros 2000 registros.`);

    if (dups.length > 0) {
        const first = groups[dups[0]];
        console.log("Exemplo de duplicata:");
        console.log(JSON.stringify(first, null, 2));
    } else {
        console.log("Nenhuma duplicata encontrada nos primeiros 2000. Tentando outro bloco...");
        const { data: data2 } = await supabase.from('executed_orders').select('*').range(35000, 37000);
        // ... similar check
    }
}

debug();
