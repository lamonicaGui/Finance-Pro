
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLS() {
    console.log("--- Testando RLS em open_positions ---");

    // 1. SELECT simples
    const { data: selectData, count, error: selectError } = await supabase
        .from('open_positions')
        .select('*', { count: 'exact' });

    console.log("Select Count:", count);
    if (selectError) console.error("Select Error:", selectError.message);
    else console.log("Select Data Sample:", selectData?.slice(0, 2));

    // 2. DELETE teste
    console.log("--- Testando DELETE (limite 1) ---");
    const { data: delData, error: delError } = await supabase
        .from('open_positions')
        .delete()
        .eq('ativo', 'TEST_NON_EXISTENT'); // Just to see if it triggers an error

    if (delError) console.error("Delete Error:", delError.message);
    else console.log("Delete request accepted (doesn't mean row was deleted, just that policy allowed the attempt).");

    // 3. RPC Call Test
    console.log("--- Testando RPC truncate_open_positions ---");
    const { data: rpcData, error: rpcError } = await supabase.rpc('truncate_open_positions');
    if (rpcError) console.error("RPC Error:", rpcError.message);
    else console.log("RPC Success!");
}

testRLS();
