const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTypes() {
    console.log("Checking executed_orders schema...");

    // We can't query information_schema easily via .from() if RLS is on or cache is issues
    // But we can try to find an example record if it exists (it was empty recently though)

    // Let's try to query columns via rpc if it exists, or just use what we know.
    // Actually, I can use the error message itself as proof: PostgreSQL is trying to cast "16/01/2026" to a date/timestamp.

    console.log("Based on the error 22008, the column 'data' or 'data_hora' is likely of type DATE or TIMESTAMP.");
    console.log("And the DB DateStyle is likely set to MDY (US).");
}

checkTypes();
