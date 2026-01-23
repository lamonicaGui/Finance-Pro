const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkExecutedOrdersDuplicates() {
    console.log("Fetching all records from executed_orders...");
    const allData = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('executed_orders')
            .select('*')
            .range(from, from + step - 1);

        if (error) {
            console.error("Error:", error);
            return;
        }

        allData.push(...data);
        if (data.length < step) {
            hasMore = false;
        } else {
            from += step;
        }
    }

    console.log(`Total records: ${allData.length}`);

    const seen = new Map();
    const dups = [];

    allData.forEach(r => {
        // Unique key matching the trigger logic: data, cliente, papel, cv, qtd_exec, prc_medio, conta
        const key = `${r.data}|${r.cliente}|${r.papel}|${r.cv}|${r.qtd_exec}|${r.prc_medio}|${r.conta}`;
        if (!seen.has(key)) {
            seen.set(key, []);
        }
        seen.get(key).push(r.id);
        if (seen.get(key).length === 2) {
            dups.push(key);
        }
    });

    console.log(`Unique keys with duplicates: ${dups.length}`);

    if (dups.length > 0) {
        console.log("\nDuplicate examples:");
        dups.slice(0, 5).forEach(key => {
            console.log(`- Key: ${key} | IDs: ${seen.get(key).join(', ')}`);
        });

        const totalDupRecords = dups.reduce((acc, key) => acc + (seen.get(key).length - 1), 0);
        console.log(`\nTotal extra records (to be removed): ${totalDupRecords}`);
    } else {
        console.log("No duplicates found. The prevention mechanism seems to be working!");
    }
}

checkExecutedOrdersDuplicates();
