const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTrigger() {
    console.log("Checking for trigger trigger_skip_duplicate_executed_orders...");
    const { data, error } = await supabase.rpc('get_triggers', { table_name: 'executed_orders' });

    // Since I don't know if 'get_triggers' RPC exists, I'll try a raw query via information_schema if possible
    // But Supabase JS client doesn't support direct SQL unless there's an RPC.

    // Alternative: try to insert a known duplicate and see if it fails or returns Null (if we could see that)
    // Or just try to query information_schema.triggers via .from() (if permissions allow)

    const { data: triggerData, error: triggerError } = await supabase
        .from('information_schema.triggers')
        .select('trigger_name')
        .eq('event_object_table', 'executed_orders')
        .eq('trigger_name', 'trigger_skip_duplicate_executed_orders');

    if (triggerError) {
        console.error("Error checking triggers:", triggerError);
    } else if (triggerData && triggerData.length > 0) {
        console.log("SUCCESS: Trigger 'trigger_skip_duplicate_executed_orders' EXISTS in the database.");
    } else {
        console.log("WARNING: Trigger 'trigger_skip_duplicate_executed_orders' DOES NOT EXIST.");
    }
}

checkTrigger();
