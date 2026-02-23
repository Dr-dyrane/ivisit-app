const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Near Me Testing Ground Zero: Lagos, Nigeria (New Mission)
const BASE_LAT = parseFloat(process.env.TEST_LAT || '6.5244');
const BASE_LNG = parseFloat(process.env.TEST_LNG || '3.3792');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in environment or .env.local');
    // Log available keys for debugging (obscure the values)
    console.log('Available keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TS = Date.now();
async function seedRealistic() {
    console.log(`🚀 Starting Realistic Seeding (Session: ${TS})...`);

    // 1. CLEANUP (Keep legacy cleanup just in case)
    console.log('🧹 Cleaning up old seed users...');
    const { data: usersData } = await supabase.auth.admin.listUsers();
    if (usersData && usersData.users) {
        const toDelete = usersData.users.filter(u => u.email.includes('seed-user-'));
        for (const u of toDelete) {
            await supabase.auth.admin.deleteUser(u.id);
        }
        console.log(`Deleted ${toDelete.length} legacy users.`);
    }

    // 2. CREATE PERSONAS
    const personas = [
        { key: 'patient', email: `seed-patient-${TS}@ivisit-test.com`, role: 'patient', full_name: 'Adewale Okafor', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80' },
        { key: 'doctor', email: `seed-doctor-${TS}@ivisit-test.com`, role: 'provider', provider_type: 'doctor', full_name: 'Dr. Sarah Jenkins', avatar: 'https://images.unsplash.com/photo-1559839734-2b71f1536780?auto=format&fit=crop&w=150&h=150&q=80' },
        { key: 'driver', email: `seed-driver-${TS}@ivisit-test.com`, role: 'provider', provider_type: 'driver', full_name: 'Musa Bello', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80' },
        { key: 'admin', email: `seed-admin-${TS}@ivisit-test.com`, role: 'org_admin', full_name: 'Amina Mohammed', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80' }
    ];

    const createdUsers = {};

    for (const p of personas) {
        const { data, error } = await supabase.auth.admin.createUser({
            email: p.email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: p.full_name, role: p.role, avatar_url: p.avatar }
        });

        if (error) {
            console.error(`Error creating ${p.key} (${p.email}):`, error.message);
            continue;
        }

        createdUsers[p.key] = data.user;
        console.log(`✅ Created ${p.key}: ${p.full_name} (${p.email})`);

        // Update profile
        await supabase.from('profiles').update({
            role: p.role,
            provider_type: p.provider_type || null
        }).eq('id', data.user.id);
    }

    // 3. CREATE ORGANIZATION & HOSPITAL
    const { data: org, error: orgErr } = await supabase.from('organizations').insert({
        name: 'Lagos Health Network',
        contact_email: 'admin@lagoshealth.com',
        fee_tier: 'premium'
    }).select().single();

    if (orgErr) { console.error('Org error:', orgErr); return; }

    const { data: hosp, error: hospErr } = await supabase.from('hospitals').insert({
        organization_id: org.id,
        name: 'Lagos Island General Hospital',
        address: '1-3 Broad St, Lagos Island, Lagos',
        phone: '+234 1 234 5678',
        latitude: BASE_LAT + 0.015,
        longitude: BASE_LNG + 0.015,
        available_beds: 12,
        icu_beds_available: 4,
        total_beds: 50,
        status: 'available',
        verified: true,
        verification_status: 'verified',
        image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
        coordinates: `SRID=4326;POINT(${BASE_LNG + 0.015} ${BASE_LAT + 0.015})`
    }).select().single();

    if (hospErr) { console.error('Hospital error:', hospErr); return; }

    // Link Amina as Org Admin
    await supabase.from('profiles').update({ organization_id: org.id }).eq('id', createdUsers.admin.id);
    await supabase.from('hospitals').update({ org_admin_id: createdUsers.admin.id }).eq('id', hosp.id);

    // Explicit Doctor Linkage (Master System Fix)
    await supabase.from('doctors').upsert({
        profile_id: createdUsers.doctor.id,
        hospital_id: hosp.id,
        name: createdUsers.doctor.user_metadata.full_name,
        specialization: 'Emergency Medicine',
        status: 'available',
        is_available: true
    }, { onConflict: 'profile_id' });

    // 4. CREATE AMBULANCES
    const ambSnapshots = [
        { call_sign: 'ALFA-01', vehicle_number: 'LA-123-AMB', status: 'available', base_price: 150 },
        { call_sign: 'BRAVO-02', vehicle_number: 'LA-456-AMB', status: 'on_trip', base_price: 150 },
        { call_sign: 'CHARLIE-03', vehicle_number: 'LA-789-AMB', status: 'maintenance', base_price: 150 }
    ];

    const ambulances = [];
    for (const amb of ambSnapshots) {
        const { data } = await supabase.from('ambulances').insert({
            hospital_id: hosp.id,
            ...amb,
            location: `SRID=4326;POINT(${BASE_LNG + (Math.random() - 0.5) * 0.005} ${BASE_LAT + (Math.random() - 0.5) * 0.005})`
        }).select().single();
        ambulances.push(data);
    }

    // Link Driver to BRAVO-02
    await supabase.from('profiles').update({
        organization_id: org.id,
        assigned_ambulance_id: ambulances[1].id
    }).eq('id', createdUsers.driver.id);

    // 5. CREATE CORE USE CASES (Emergency Requests)

    // Use Case 1: Active Emergency (In Progress)
    const { data: activeReq } = await supabase.from('emergency_requests').insert({
        user_id: createdUsers.patient.id,
        hospital_id: hosp.id,
        ambulance_id: ambulances[1].id,
        status: 'in_progress',
        service_type: 'ambulance',
        hospital_name: hosp.name,
        patient_location: `SRID=4326;POINT(${BASE_LNG + 0.002} ${BASE_LAT + 0.002})`,
        severity: 'critical',
        created_at: new Date(Date.now() - 15 * 60000).toISOString() // 15 mins ago
    }).select().single();

    // Use Case 2: Completed Request (History)
    const { data: completedReq } = await supabase.from('emergency_requests').insert({
        user_id: createdUsers.patient.id,
        hospital_id: hosp.id,
        status: 'completed',
        service_type: 'ambulance',
        hospital_name: hosp.name,
        patient_location: `SRID=4326;POINT(${BASE_LNG - 0.003} ${BASE_LAT - 0.002})`,
        total_cost: 165.00,
        created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    }).select().single();

    // 5b. RICH HISTORY FOR ANALYTICS (20 more cases)
    console.log('📈 Seeding 20 historical cases for analytics...');
    const historicalCases = [];
    for (let i = 0; i < 20; i++) {
        const hoursAgo = Math.floor(Math.random() * 72) + 2; // 2 to 74 hours ago
        historicalCases.push({
            user_id: createdUsers.patient.id,
            hospital_id: hosp.id,
            status: 'completed',
            service_type: Math.random() > 0.3 ? 'ambulance' : 'bed',
            hospital_name: hosp.name,
            total_cost: Math.floor(Math.random() * 200) + 50,
            created_at: new Date(Date.now() - (hoursAgo * 3600000)).toISOString()
        });
    }
    await supabase.from('emergency_requests').insert(historicalCases);

    // Use Case 3: Bed Reservation (Booking)
    await supabase.from('emergency_requests').insert({
        user_id: createdUsers.patient.id,
        hospital_id: hosp.id,
        status: 'accepted',
        service_type: 'bed',
        hospital_name: hosp.name,
        specialty: 'Cardiology',
        created_at: new Date(Date.now() - 10 * 60000).toISOString()
    });

    // 6. CREATE PAYMENTS & LEDGERS
    const { data: payment } = await supabase.from('payments').insert({
        user_id: createdUsers.patient.id,
        emergency_request_id: completedReq.id,
        organization_id: org.id,
        amount: 165.00,
        payment_method: 'card',
        status: 'completed',
        processed_at: new Date().toISOString()
    }).select().single();

    // Update hospital balance (Manual ledger for seed)
    const { data: wallet } = await supabase.from('organization_wallets').select('id, balance').eq('organization_id', org.id).single();
    await supabase.from('organization_wallets').update({ balance: 160.87 }).eq('id', wallet.id);
    await supabase.from('wallet_ledger').insert({
        wallet_id: wallet.id,
        amount: 160.87,
        transaction_type: 'credit',
        description: 'Payment for Emergency ' + completedReq.display_id,
        reference_id: payment.id
    });

    // 7. ANALYTICS & ACTIVITY SEEDING
    const activityLogs = [
        { user_id: createdUsers.patient.id, action: 'emergency_started', description: 'Patient initiated critical emergency', color: 'hsl(var(--destructive))' },
        { user_id: createdUsers.driver.id, action: 'ambulance_dispatched', description: 'Ambulance BRAVO-02 dispatched to patient', color: 'hsl(var(--primary))' },
        { user_id: createdUsers.patient.id, action: 'payment_completed', description: 'Payment of $165.00 via Card successful', color: 'hsl(var(--success))' }
    ];

    for (const log of activityLogs) {
        await supabase.from('user_activity').insert({
            ...log,
            entity_type: 'emergency_request',
            metadata: { seed: true }
        });
    }

    // 8. HEALTH NEWS SEEDING (Contextual Awareness)
    console.log('📰 Seeding Health News...');
    await supabase.from('health_news').insert([
        {
            title: 'Lagos Island Hospital Expanded',
            source: 'Lagos Health Network',
            category: 'Infrastructure',
            image_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
            published: true
        },
        {
            title: 'Fleet Expansion: ALFA-01 Live in Lagos',
            source: 'Logistics Desk',
            category: 'Logistics',
            image_url: 'https://images.unsplash.com/photo-1587350859730-ba5965eefc43?auto=format&fit=crop&w=800&q=80',
            published: true
        }
    ]);

    // 9. TRENDING TOPICS (Search Context)
    console.log('🔍 Seeding Trending Topics...');
    await supabase.from('trending_topics').upsert([
        { query: 'ER near Broad St', category: 'Emergency', rank: 1 },
        { query: 'Lagos Island Medical', category: 'Facilities', rank: 2 },
        { query: 'Ambulance ETA', category: 'Logistics', rank: 3 }
    ]);

    console.log('✨ Seeding Perfected. 4 Use Cases Active.');
}

seedRealistic().catch(console.error);
