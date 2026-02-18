/**
 * CRUD VERIFICATION: MODULE 8 (HEALTH NEWS)
 * Tests individual field updates as requested by user.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyHealthNewsCrud() {
    console.log('🧪 VERIFYING HEALTH NEWS CRUD (INDIVIDUAL FIELD UPDATES)\n');

    // 1. Fetch a row to update
    const { data: rows, error: fErr } = await supabase
        .from('health_news')
        .select('*')
        .limit(1);

    if (fErr || !rows.length) {
        console.error('   ❌ Initial Fetch Failed:', fErr ? fErr.message : 'No data');
        return;
    }

    const targetId = rows[0].id;
    console.log(`   🎯 Target Record ID: ${targetId}`);

    // 2. Update Title separately
    console.log('\n2. Updating TITLE separately...');
    const newTitle = rows[0].title + ' (Updated)';
    const { error: tErr } = await supabase
        .from('health_news')
        .update({ title: newTitle })
        .eq('id', targetId);

    if (tErr) console.error('   ❌ Title Update Error:', tErr.message);
    else console.log('   ✅ Title updated.');

    // 3. Update Category separately
    console.log('\n3. Updating CATEGORY separately...');
    const { error: cErr } = await supabase
        .from('health_news')
        .update({ category: 'urgent' })
        .eq('id', targetId);

    if (cErr) console.error('   ❌ Category Update Error:', cErr.message);
    else console.log('   ✅ Category updated.');

    // 4. Update Published separately
    console.log('\n4. Updating PUBLISHED separately...');
    const { error: pErr } = await supabase
        .from('health_news')
        .update({ published: false })
        .eq('id', targetId);

    if (pErr) console.error('   ❌ Published Update Error:', pErr.message);
    else console.log('   ✅ Published updated.');

    // 5. Final Fetch Verification
    console.log('\n5. Performing Final Verification...');
    const { data: finalRow, error: vErr } = await supabase
        .from('health_news')
        .select('*')
        .eq('id', targetId)
        .single();

    if (vErr) {
        console.error('   ❌ Final Verify Error:', vErr.message);
    } else {
        console.log('   ✅ Final Verification Success!');
        console.log('      Title match:', finalRow.title === newTitle);
        console.log('      Category match:', finalRow.category === 'urgent');
        console.log('      Published match:', finalRow.published === false);
    }

    // REVERT for clean state
    await supabase.from('health_news').update({ title: rows[0].title, category: rows[0].category, published: rows[0].published }).eq('id', targetId);

    console.log('\n🏁 CRUD VERIFICATION COMPLETE');
}

verifyHealthNewsCrud().catch(console.error);
