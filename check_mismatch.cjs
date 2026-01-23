
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMismatch() {
    console.log("=== Verificando Mismatch de Cadastro vs Posições ===");

    // 1. O que o sistema "vê" como Cadastro (VILMA)
    const { data: cad, error: cadErr } = await supabase
        .from('cadastro_clientes')
        .select('Cliente, Conta')
        .ilike('Cliente', '%VILMA%');

    console.log("Cadastro (Em cadastro_clientes):", cad);

    // 2. O que o sistema "vê" como Posições (VILMA)
    const { data: pos, error: posErr } = await supabase
        .from('open_positions')
        .select('cliente_nome, conta, ativo')
        .ilike('cliente_nome', '%VILMA%');

    console.log("Posições (Em open_positions):", pos);
}

checkMismatch();
