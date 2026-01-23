
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugData() {
    const { data, error } = await supabase
        .from('executed_orders')
        .select('*')
        .ilike('cliente', '%SERGIO HENRIQUE%')
        .eq('papel', 'GOGL34')
        .order('data', { ascending: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- RAW DATA FOR GOGL34 ---');
    data.forEach(r => {
        console.log(`[${r.data}] ${r.cv} | Qtd: ${r["qtd_exec"] || r.quantidade} | Prc: ${r["prc_medio"] || r.preco_medio} | Status: ${r.status}`);
    });
}

debugData();
