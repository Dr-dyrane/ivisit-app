const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
    const { data, error } = await supabase.rpc('reload_schema');
    console.log('Reload Schema Result:', data, error);

    // Fallback: check columns manually
    const { data: cols, error: colErr } = await supabase.from('hospitals').select('*').limit(1);
    if (cols && cols.length > 0) {
        console.log('Columns in hospitals:', Object.keys(cols[0]));
    } else {
        console.log('No data in hospitals or error:', colErr);
    }
}
checkColumns();
