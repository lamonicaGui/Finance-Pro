const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearExecutedOrders() {
    console.log("Attempting to clear all data from executed_orders...");

    // Using a DELETE with a filter that matches all rows
    // This is equivalent to clearing the table but works through the API
    const { data, error, count } = await supabase
        .from('executed_orders')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // ID is never this, so it matches all

    if (error) {
        console.error("Error clearing table:", error.message);
        console.error("Details:", error.details);
    } else {
        console.log(`SUCCESS: Cleared ${count} records from executed_orders.`);
    }
}

clearExecutedOrders();
