const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDuplicates() {
    const allData = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('open_positions')
            .select('id, ativo, conta, cliente_nome, Qtd')
            .range(from, from + step - 1);

        if (error) {
            console.error("Erro:", error);
            return;
        }

        allData.push(...data);
        if (data.length < step) {
            hasMore = false;
        } else {
            from += step;
        }
    }

    const data = allData;

    console.log(`Total de registros: ${data.length}`);

    const counts = {};
    const dups = [];

    data.forEach(r => {
        const key = `${r.ativo}|${r.conta}|${r.cliente_nome}|${r.Qtd}`;
        if (!counts[key]) {
            counts[key] = [];
        }
        counts[key].push(r.id);
        if (counts[key].length === 2) {
            dups.push(key);
        }
    });

    console.log(`Chaves únicas com duplicatas: ${dups.length}`);

    if (dups.length > 0) {
        console.log("\nExemplos de duplicatas:");
        dups.slice(0, 5).forEach(key => {
            console.log(`- Chave: ${key} | IDs: ${counts[key].join(', ')}`);
        });

        const totalDupRecords = dups.reduce((acc, key) => acc + (counts[key].length - 1), 0);
        console.log(`\nTotal de registros extras (a serem removidos): ${totalDupRecords}`);
    } else {
        console.log("Nenhuma duplicata encontrada.");
    }
}

checkDuplicates();
