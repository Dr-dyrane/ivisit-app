const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function listSomeIds() {
    const { data, error } = await supabase.rpc('get_all_auth_users');
    if (error) {
        console.error(error);
    } else {
        console.log('Valid IDs found:');
        data.slice(0, 5).forEach(u => console.log(`- ${u.id} (${u.full_name} / ${u.role})`));
    }
}

listSomeIds().catch(console.error);
