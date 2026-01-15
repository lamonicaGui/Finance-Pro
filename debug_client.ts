import { supabase } from './services/supabase';

async function test() {
    console.log("Searching for client Wallace Marion / 718897...");
    const { data: client, error: clientErr } = await supabase
        .from('cadastro_clientes')
        .select('*')
        .or('Cliente.ilike.%WALLACE%, "Cod Bolsa".eq.718897');

    console.log("Cadastro Client:", JSON.stringify(client, null, 2));
    if (clientErr) console.error("Client Error:", clientErr);

    console.log("\nSearching for orders for wallace in executed_orders...");
    const { data: orders, error: ordersErr } = await supabase
        .from('executed_orders')
        .select('cliente, papel, data')
        .or('cliente.ilike.%WALLACE%, cliente.ilike.%718897%')
        .limit(10);

    console.log("Orders found:", JSON.stringify(orders, null, 2));
    if (ordersErr) console.error("Orders Error:", ordersErr);
}

test();
