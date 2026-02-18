const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTypes() {
    console.log('Checking table types...');
    // Since I can't query information_schema directly via anon client, 
    // I'll try to fetch a row and check the JS type, or rely on a helper if I have one.
    // Actually, I can use the SQL tool if I have it.

    const tables = ['payments', 'patient_wallets', 'organization_wallets'];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table ${table}: ERROR - ${error.message}`);
        } else {
            console.log(`Table ${table}: FOUND ${data.length} rows.`);
        }
    }
}

checkTypes().catch(console.error);
