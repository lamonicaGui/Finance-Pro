
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
    const searchName = "ALBERTO";
    const searchAccount = "310738";

    console.log("Testando query com aspas (conforme o código atual):");
    const { data: data1, error: error1 } = await supabase
        .from('cadastro_clientes')
        .select('*')
        .or(`Cliente.ilike."%${searchName}%",Conta.ilike."%${searchAccount}%"`)
        .limit(1);

    if (error1) console.error("Erro 1:", error1.message);
    else console.log("Resultado 1 (com aspas):", data1?.length > 0 ? "Encontrado" : "Não encontrado");

    console.log("Testando query SEM aspas (padrão PostgREST):");
    const { data: data2, error: error2 } = await supabase
        .from('cadastro_clientes')
        .select('*')
        .or(`Cliente.ilike.%${searchName}%,Conta.ilike.%${searchAccount}%`)
        .limit(1);

    if (error2) console.error("Erro 2:", error2.message);
    else console.log("Resultado 2 (sem aspas):", data2?.length > 0 ? "Encontrado" : "Não encontrado");
}

testQuery();
