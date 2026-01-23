
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log("=== Verificando Integridade dos Dados ===");

    // 1. Contagem Total
    const { count, error: countErr } = await supabase
        .from('open_positions')
        .select('*', { count: 'exact', head: true });

    if (countErr) console.error("Erro na contagem:", countErr);
    else console.log("Total de registros:", count);

    // 2. Checar Duplicatas Exatas
    // (Simulando agrupamento por atributos principais)
    const { data: sample, error: sampleErr } = await supabase
        .from('open_positions')
        .select('ativo, conta, cliente_nome, Qtd')
        .limit(100);

    const seen = new Set();
    let dupes = 0;
    sample?.forEach(r => {
        const key = `${r.ativo}-${r.conta}-${r.cliente_nome}-${r.Qtd}`;
        if (seen.has(key)) dupes++;
        seen.add(key);
    });
    console.log(`Duplicatas na amostra de 100: ${dupes}`);

    // 3. Testar busca da VILMA (Normalizada)
    const normalize = (s) => s?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() || "";

    // Supondo que o cadastro tenha "VILMA GIANNINI FORMENTI GASI"
    const searchName = "VILMA";

    const { data: vilmaData, error: vilmaErr } = await supabase
        .from('open_positions')
        .select('*')
        .ilike('cliente_nome', `%${searchName}%`);

    if (vilmaErr) console.error("Erro na busca Vilma:", vilmaErr);
    else {
        console.log(`Registros para "${searchName}":`, vilmaData?.length);
        if (vilmaData?.length > 0) {
            console.log("Exemplo Vilma:", vilmaData[0]);
        }
    }
}

verify();
