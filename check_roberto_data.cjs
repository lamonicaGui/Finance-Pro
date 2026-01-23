const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkClientData() {
    console.log("Fetching all records for ROBERTO MARTINEZ (816301)...");

    const { data, error, count } = await supabase
        .from('executed_orders')
        .select('data, papel, cv, qtd_exec, prc_medio, conta', { count: 'exact' })
        .eq('cod_bolsa', '816301')
        .order('data', { ascending: true });

    if (error) {
        console.error("Error fetching data:", error.message);
    } else {
        console.log(`Total records in DB for this client: ${count}`);
        console.log("Sample records:");
        data.slice(0, 20).forEach(r => {
            console.log(`${r.data} | ${r.papel} | ${r.cv} | ${r.qtd_exec} | ${r.prc_medio} | ${r.conta}`);
        });
    }
}

checkClientData();
