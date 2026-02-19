const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkRemote() {
    console.log('🔍 Checking Remote Stamping Function...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: "SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'stamp_entity_display_id' AND routine_schema = 'public';"
    });

    if (error) {
        // If exec_sql fails, we might not have it. Let's try to just query via rest if it's a view?
        // Actually, we can just use the 'exec_sql' we thought was there.
        console.error('❌ Remote check failed:', error.message);
        return;
    }

    console.log('Remote Definition Output:', JSON.stringify(data, null, 2));
}

checkRemote();
