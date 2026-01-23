
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

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
        console.log(`[${r.data}] ${r.cliente} | ${r.papel} | ${r["c/v"] || r.cv} | Qtd: ${r["qtd_exec"] || r.quantidade} | Prc: ${r["prc_medio"] || r.preco_medio} | Status: ${r.status}`);
    });
}

debug();
