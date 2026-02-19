const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDoctors() {
    const { data, error } = await supabase.from('doctors').select('*');
    if (error) console.error(error);
    console.log('Doctors Count:', data.length);
    console.log('Doctors:', JSON.stringify(data, null, 2));
}

checkDoctors();
