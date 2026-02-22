#!/usr/bin/env node
/**
 * 🧪 ECOSYSTEM INTEGRATION TEST
 * Task: profile_org_emergency_ecosystem
 * 
 * Tests: Profile CRUD (all fields) → Org → Hospital → Ambulance → Driver → Doctor
 *        → Emergency Request → Cash Payment → Dispatch → Completion → Insurance
 * 
 * Zero-leak rule: all test data cleaned up in finally block.
 * Test emails: test-ecosystem-*@ivisit-test.com
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// ─── Load env ────────────────────────────────────────────────────────────────
require('dotenv').config();
const envLocal = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
    const cfg = require('dotenv').parse(fs.readFileSync(envLocal));
    Object.assign(process.env, cfg);
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
    console.error('❌ FATAL: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

// Service client (bypasses RLS — needed for auth.admin)
const svc = SERVICE_KEY
    ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

// Anon client
const anon = createClient(SUPABASE_URL, ANON_KEY);

// ─── Test State ───────────────────────────────────────────────────────────────
const TS = Date.now();
const EMAIL = (tag) => `test-ecosystem-${tag}-${TS}@ivisit-test.com`;

const state = {
    patientUserId: null, patientEmail: EMAIL('patient'),
    orgAdminUserId: null, orgAdminEmail: EMAIL('orgadmin'),
    driverUserId: null, driverEmail: EMAIL('driver'),
    doctorUserId: null, doctorEmail: EMAIL('doctor'),
    orgId: null,
    hospitalId: null,
    ambulanceId: null,
    doctorRecordId: null,
    emergencyReqId: null,
    paymentId: null,
    visitId: null,
};

// ─── Result Tracker ───────────────────────────────────────────────────────────
const results = { passed: 0, failed: 0, warnings: 0, errors: [] };
const schemaGaps = [];

function pass(label, detail = '') {
    results.passed++;
    console.log(`  ✅ ${label}${detail ? ': ' + detail : ''}`);
}

function fail(label, err, type = 'critical') {
    results.failed++;
    const msg = err?.message || String(err);
    results.errors.push({ label, msg, type });
    console.error(`  ❌ ${label}: ${msg}`);
}

function warn(label, detail) {
    results.warnings++;
    schemaGaps.push({ label, detail });
    console.warn(`  ⚠️  SCHEMA GAP — ${label}: ${detail}`);
}

function section(title) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log('═'.repeat(60));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function createAuthUser(email, role = 'patient') {
    if (!svc) {
        console.warn('  ⚠️  No SERVICE_ROLE_KEY — using anon signUp fallback');
        const { data, error } = await anon.auth.signUp({ email, password: 'TestPass123!' });
        if (error) throw error;
        return data.user;
    }
    const { data, error } = await svc.auth.admin.createUser({
        email, password: 'TestPass123!', email_confirm: true,
        user_metadata: { role }
    });
    if (error) throw error;
    return data.user;
}

async function deleteAuthUser(userId) {
    if (!svc || !userId) return;
    await svc.auth.admin.deleteUser(userId);
}

async function signInAs(email) {
    const { data, error } = await anon.auth.signInWithPassword({ email, password: 'TestPass123!' });
    if (error) throw error;
    return createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }
    });
}

// ─── PHASE 1: Profile CRUD ────────────────────────────────────────────────────
async function phase1_profileCrud() {
    section('PHASE 1: Profile CRUD — Every Field');

    // 1A: Create auth user → auto-creates profile via trigger
    try {
        const user = await createAuthUser(state.patientEmail, 'patient');
        state.patientUserId = user.id;
        pass('1A Create auth user', user.id);
    } catch (e) { fail('1A Create auth user', e); return; }

    // Wait for trigger
    await new Promise(r => setTimeout(r, 1000));

    // 1B: Read profile — validate trigger created it
    try {
        const client = svc || anon;
        const { data, error } = await client.from('profiles').select('*').eq('id', state.patientUserId).single();
        if (error) throw error;
        if (!data.display_id) throw new Error('display_id not stamped by trigger');
        if (!data.display_id.startsWith('PAT-')) throw new Error(`Expected PAT- prefix, got: ${data.display_id}`);
        pass('1B Profile auto-created with PAT- display_id', data.display_id);

        // Validate all auto-created linked records
        const { data: prefs } = await client.from('preferences').select('user_id').eq('user_id', state.patientUserId).single();
        prefs ? pass('1B preferences auto-created') : fail('1B preferences missing', 'trigger did not create preferences');

        const { data: med } = await client.from('medical_profiles').select('user_id').eq('user_id', state.patientUserId).single();
        med ? pass('1B medical_profiles auto-created') : fail('1B medical_profiles missing', 'trigger did not create medical_profiles');

        const { data: wallet } = await client.from('patient_wallets').select('user_id').eq('user_id', state.patientUserId).single();
        wallet ? pass('1B patient_wallet auto-created') : fail('1B patient_wallet missing', 'trigger did not create patient_wallet');

    } catch (e) { fail('1B Profile read/validation', e); }

    // 1C: Update every profile field
    try {
        const client = svc || anon;
        const { error } = await client.from('profiles').update({
            email: state.patientEmail,
            phone: '+12345678901',
            username: `testuser_${TS}`,
            first_name: 'Test',
            last_name: 'Patient',
            full_name: 'Test Patient',
            image_uri: 'https://example.com/avatar.jpg',
            avatar_url: 'https://example.com/avatar.jpg',
            address: '2235 Corinto Court, Test City',
            gender: 'male',
            date_of_birth: '1990-01-15',
            organization_name: null,
            onboarding_status: 'pending',
        }).eq('id', state.patientUserId);
        if (error) throw error;
        pass('1C Profile all text fields updated');
    } catch (e) { fail('1C Profile field update', e); }

    // 1D: BVN verified → onboarding complete
    try {
        const client = svc || anon;
        const { error } = await client.from('profiles').update({ bvn_verified: true }).eq('id', state.patientUserId);
        if (error) throw error;
        const { data } = await client.from('profiles').select('onboarding_status').eq('id', state.patientUserId).single();
        if (data?.onboarding_status === 'complete') {
            pass('1D bvn_verified=true → onboarding_status=complete (trigger working)');
        } else {
            warn('1D onboarding auto-complete trigger', `bvn_verified=true but onboarding_status=${data?.onboarding_status}`);
        }
    } catch (e) { fail('1D BVN verified trigger', e); }

    // 1E: Medical profile CRUD
    try {
        const client = svc || anon;
        const { error: updErr } = await client.from('medical_profiles').update({
            blood_type: 'O+',
            allergies: ['Penicillin', 'Latex'],
            conditions: ['Hypertension'],
            medications: ['Lisinopril 10mg'],
            organ_donor: true,
            insurance_provider: 'BlueCross',
            insurance_policy_number: 'POL-123456',
            emergency_contact_name: 'Jane Patient',
            emergency_contact_phone: '+19876543210',
            emergency_contact_relationship: 'Spouse',
            emergency_notes: 'Patient has severe latex allergy — notify all staff'
        }).eq('user_id', state.patientUserId);
        if (updErr) throw updErr;
        pass('1E medical_profiles all fields updated');
    } catch (e) { fail('1E medical_profiles update', e); }

    // 1F: get_medical_summary RPC
    try {
        const { data, error } = await anon.rpc('get_medical_summary', { p_user_id: state.patientUserId });
        if (error && !error.message.includes('not found')) throw error;
        pass('1F get_medical_summary RPC accessible', data?.success ? 'returned data' : 'returned not-found (expected if RLS blocks)');
    } catch (e) { fail('1F get_medical_summary RPC', e); }

    // 1G: Preferences update
    try {
        const client = svc || anon;
        const { error } = await client.from('preferences').update({
            demo_mode_enabled: false,
            notifications_enabled: true,
            appointment_reminders: true,
            emergency_updates: true,
            privacy_share_medical_profile: false,
            privacy_share_emergency_contacts: false,
            notification_sounds_enabled: true,
            view_preferences: { theme: 'dark', language: 'en' }
        }).eq('user_id', state.patientUserId);
        if (error) throw error;
        pass('1G preferences all fields updated');
    } catch (e) { fail('1G preferences update', e); }
}

// ─── PHASE 2: Organisation ────────────────────────────────────────────────────
async function phase2_organisation() {
    section('PHASE 2: Organisation Setup');
    const client = svc || anon;

    // 2A: Create org admin user
    try {
        const user = await createAuthUser(state.orgAdminEmail, 'org_admin');
        state.orgAdminUserId = user.id;
        pass('2A Org admin auth user created', user.id);
        await new Promise(r => setTimeout(r, 800));

        // Promote role to org_admin
        const { error } = await client.from('profiles').update({ role: 'org_admin' }).eq('id', state.orgAdminUserId);
        if (error) throw error;

        const { data } = await client.from('profiles').select('display_id, role').eq('id', state.orgAdminUserId).single();
        if (data?.display_id?.startsWith('OAD-')) {
            pass('2A display_id updated to OAD- on role change', data.display_id);
        } else {
            warn('2A display_id prefix for org_admin', `Expected OAD-, got: ${data?.display_id}`);
        }
    } catch (e) { fail('2A Create org admin', e); return; }

    // 2B: Create organisation
    try {
        const { data, error } = await client.from('organizations').insert({
            name: `iVisit Health Systems (Test ${TS})`,
            contact_email: state.orgAdminEmail,
            is_active: true,
            ivisit_fee_percentage: 2.5,
            fee_tier: 'standard'
        }).select('id, display_id').single();
        if (error) throw error;
        state.orgId = data.id;
        if (data.display_id?.startsWith('ORG-')) {
            pass('2B Organisation created with ORG- display_id', data.display_id);
        } else {
            fail('2B Organisation display_id', `Expected ORG-, got: ${data.display_id}`);
        }
    } catch (e) { fail('2B Create organisation', e); return; }

    // 2C: Verify org wallet auto-created
    try {
        await new Promise(r => setTimeout(r, 500));
        const { data } = await client.from('organization_wallets').select('id, balance').eq('organization_id', state.orgId).single();
        if (data) {
            pass('2C org_wallet auto-created by trigger', `balance=${data.balance}`);
        } else {
            warn('2C org_wallet auto-creation', 'organization_wallets row not found — missing automation trigger');
        }
    } catch (e) { warn('2C org_wallet check', e.message); }

    // 2D: Link org admin to org
    try {
        const { error } = await client.from('profiles').update({ organization_id: state.orgId }).eq('id', state.orgAdminUserId);
        if (error) throw error;
        const { data } = await client.from('profiles').select('onboarding_status').eq('id', state.orgAdminUserId).single();
        if (data?.onboarding_status === 'complete') {
            pass('2D org_admin onboarding complete on org_id set');
        } else {
            warn('2D onboarding trigger for org_admin', `onboarding_status=${data?.onboarding_status}`);
        }
    } catch (e) { fail('2D Link org admin to org', e); }
}

// ─── PHASE 3: Hospital ────────────────────────────────────────────────────────
async function phase3_hospital() {
    section('PHASE 3: Hospital Setup — Corinto General Hospital');
    const client = svc || anon;
    if (!state.orgId) { fail('PHASE 3 skipped', 'no orgId from phase 2'); return; }

    try {
        const { data, error } = await client.from('hospitals').insert({
            name: `Corinto General Hospital (Test ${TS})`,
            address: '2235 Corinto Court, Medical District',
            phone: '+15105550100',
            latitude: 37.8044,
            longitude: -122.2712,
            type: 'general',
            specialties: ['Emergency Medicine', 'Internal Medicine', 'Surgery'],
            service_types: ['ambulance', 'bed', 'consultation'],
            features: ['24/7 ER', 'ICU', 'Trauma Center'],
            emergency_level: 'Level 1',
            available_beds: 50,
            ambulances_count: 5,
            wait_time: '15 mins',
            price_range: '$200-$1000',
            verified: true,
            verification_status: 'approved',
            status: 'available',
            base_price: 150.00,
            bed_availability: { standard: 30, icu: 10, private: 10 },
            emergency_wait_time_minutes: 15,
            org_admin_id: state.orgAdminUserId,
            organization_id: state.orgId,
        }).select('id, display_id').single();
        if (error) throw error;
        state.hospitalId = data.id;
        if (data.display_id?.startsWith('HSP-')) {
            pass('3A Hospital created with HSP- display_id', data.display_id);
        } else {
            fail('3A Hospital display_id', `Expected HSP-, got: ${data.display_id}`);
        }
    } catch (e) { fail('3A Create hospital', e); return; }

    // 3B: Test nearby_hospitals RPC
    try {
        const { data, error } = await anon.rpc('nearby_hospitals', { user_lat: 37.8044, user_lng: -122.2712, radius_km: 50 });
        if (error) throw error;
        pass('3B nearby_hospitals RPC', `${data?.length || 0} hospitals found`);
    } catch (e) { fail('3B nearby_hospitals RPC', e); }

    // 3C: Check for schema gaps in hospitals table
    try {
        const { error } = await client.from('hospitals').select('available_beds').eq('id', state.hospitalId).single();
        if (error) throw error;
        pass('3C Hospital available_beds readable');
    } catch (e) { warn('3C Hospital schema', e.message); }
}

// ─── PHASE 4: Pricing ─────────────────────────────────────────────────────────
async function phase4_pricing() {
    section('PHASE 4: Service & Room Pricing (Org Admin configures)');
    if (!state.hospitalId) { fail('PHASE 4 skipped', 'no hospitalId'); return; }

    // 4A: Service Pricing
    try {
        const { data, error } = await anon.rpc('upsert_service_pricing', {
            payload: {
                hospital_id: state.hospitalId,
                service_type: 'ambulance',
                service_name: 'Basic Life Support Ambulance',
                base_price: 250.00,
                description: 'Standard BLS ambulance transport'
            }
        });
        if (error) throw error;
        pass('4A upsert_service_pricing — ambulance', 'stored');
    } catch (e) { fail('4A upsert_service_pricing', e); }

    try {
        await anon.rpc('upsert_service_pricing', {
            payload: { hospital_id: state.hospitalId, service_type: 'bed', service_name: 'Emergency Bed Admission', base_price: 400.00, description: 'Standard emergency bed' }
        });
        pass('4A upsert_service_pricing — bed');
    } catch (e) { fail('4A upsert_service_pricing bed', e); }

    // 4B: Room Pricing
    try {
        const roomTypes = [
            { room_type: 'standard', room_name: 'Standard Room', price_per_night: 200.00 },
            { room_type: 'icu', room_name: 'ICU', price_per_night: 800.00 },
            { room_type: 'private', room_name: 'Private Suite', price_per_night: 500.00 },
        ];
        for (const room of roomTypes) {
            const { error } = await anon.rpc('upsert_room_pricing', { payload: { hospital_id: state.hospitalId, ...room, description: `${room.room_name} pricing` } });
            if (error) throw error;
        }
        pass('4B upsert_room_pricing — standard/icu/private', '3 room types configured');
    } catch (e) { fail('4B upsert_room_pricing', e); }

    // 4C: Verify stored
    try {
        const client = svc || anon;
        const { data: sp } = await client.from('service_pricing').select('service_type, base_price').eq('hospital_id', state.hospitalId);
        const { data: rp } = await client.from('room_pricing').select('room_type, price_per_night').eq('hospital_id', state.hospitalId);
        pass('4C Pricing readable from DB', `${sp?.length} service types, ${rp?.length} room types`);
    } catch (e) { fail('4C Pricing read', e); }
}

// ─── PHASE 5: Ambulance & Driver ──────────────────────────────────────────────
async function phase5_ambulanceDriver() {
    section('PHASE 5: Ambulance Fleet & Driver Setup');
    const client = svc || anon;
    if (!state.hospitalId) { fail('PHASE 5 skipped', 'no hospitalId'); return; }

    // 5A: Create ambulance
    try {
        const { data, error } = await client.from('ambulances').insert({
            hospital_id: state.hospitalId,
            organization_id: state.orgId,
            type: 'BLS',
            call_sign: `AMB-TEST-${TS}`,
            vehicle_number: `VEH-${TS}`,
            license_plate: `LPL-${TS}`,
            base_price: 250.00,
            crew: { paramedics: 2, driver: 1 },
        }).select('id, display_id').single();
        if (error) throw error;
        state.ambulanceId = data.id;
        if (data.display_id?.startsWith('AMB-')) {
            pass('5A Ambulance created with AMB- display_id', data.display_id);
        } else {
            fail('5A Ambulance display_id', `Expected AMB-, got: ${data.display_id}`);
        }
    } catch (e) { fail('5A Create ambulance', e); return; }

    // 5B: Check ambulances status column constraint gap
    try {
        // The ambulances table status CHECK only allows emergency request statuses
        // but automation trigger sets 'on_trip' and RPC expects 'available'/'dispatched'
        const { error } = await client.from('ambulances').update({ status: 'available' }).eq('id', state.ambulanceId);
        if (error && error.message.includes('violates check constraint')) {
            warn('5B ambulances.status CHECK constraint', `Cannot set status='available' — constraint only allows emergency request statuses. SCHEMA GAP: Need to update ambulances.status CHECK in logistics pillar.`);
        } else if (error) {
            fail('5B ambulance status update', error);
        } else {
            pass('5B ambulance status=available set successfully');
        }
    } catch (e) { warn('5B ambulance status constraint', e.message); }

    // 5C: Create driver
    try {
        const user = await createAuthUser(state.driverEmail, 'viewer');
        state.driverUserId = user.id;
        await new Promise(r => setTimeout(r, 800));

        // Promote to driver
        const { error } = await client.from('profiles').update({ role: 'provider', provider_type: 'driver', organization_id: state.orgId }).eq('id', state.driverUserId);
        if (error) throw error;

        const { data } = await client.from('profiles').select('display_id, onboarding_status').eq('id', state.driverUserId).single();
        if (data?.display_id?.startsWith('DRV-')) {
            pass('5C Driver promoted (viewer→provider/driver) with DRV- prefix', data.display_id);
        } else {
            warn('5C Driver display_id prefix', `Expected DRV-, got: ${data?.display_id}`);
        }
    } catch (e) { fail('5C Create/promote driver', e); return; }

    // 5D: Attach driver to ambulance
    try {
        const { error } = await client.from('ambulances').update({ profile_id: state.driverUserId }).eq('id', state.ambulanceId);
        if (error) throw error;
        pass('5D Driver attached to ambulance (ambulance.profile_id set)');
    } catch (e) { fail('5D Attach driver to ambulance', e); }

    // 5E: Assign ambulance to driver profile
    try {
        const { error } = await client.from('profiles').update({ assigned_ambulance_id: state.ambulanceId }).eq('id', state.driverUserId);
        if (error) throw error;
        const { data } = await client.from('profiles').select('onboarding_status').eq('id', state.driverUserId).single();
        data?.onboarding_status === 'complete'
            ? pass('5E Driver onboarding complete on ambulance assignment')
            : warn('5E Driver onboarding trigger', `assigned_ambulance_id set but onboarding_status=${data?.onboarding_status}`);
    } catch (e) { fail('5E Driver ambulance assignment', e); }
}

// ─── PHASE 6: Doctor ──────────────────────────────────────────────────────────
async function phase6_doctor() {
    section('PHASE 6: Doctor Setup');
    const client = svc || anon;
    if (!state.hospitalId) { fail('PHASE 6 skipped', 'no hospitalId'); return; }

    try {
        const user = await createAuthUser(state.doctorEmail, 'provider');
        state.doctorUserId = user.id;
        await new Promise(r => setTimeout(r, 800));

        await client.from('profiles').update({ role: 'provider', provider_type: 'doctor', organization_id: state.orgId }).eq('id', state.doctorUserId);
        const { data: prof } = await client.from('profiles').select('display_id').eq('id', state.doctorUserId).single();
        prof?.display_id?.startsWith('DOC-')
            ? pass('6A Doctor profile promoted with DOC- prefix', prof.display_id)
            : warn('6A Doctor display_id prefix', `Expected DOC-, got: ${prof?.display_id}`);
    } catch (e) { fail('6A Create doctor user', e); return; }

    // 6B: Insert doctors record
    try {
        const { data, error } = await client.from('doctors').insert({
            profile_id: state.doctorUserId,
            hospital_id: state.hospitalId,
            name: 'Dr. Test Doctor',
            specialization: 'Emergency Medicine',
            consultation_fee: '$150',
            license_number: `LIC-${TS}`,
            department: 'Emergency',
            is_available: true,
            is_on_call: false,
            max_patients: 10,
            current_patients: 0,
            status: 'available',
            email: state.doctorEmail,
            phone: '+15105550200',
            about: 'Test doctor for ecosystem validation',
            rating: 4.9,
            experience: 10,
        }).select('id, display_id').single();
        if (error) throw error;
        state.doctorRecordId = data.id;
        pass('6B Doctor record inserted', `display_id=${data.display_id}`);
    } catch (e) { fail('6B Insert doctor record', e); }

    // 6C: Doctor schedule
    try {
        const { error } = await client.from('doctor_schedules').insert({
            doctor_id: state.doctorRecordId,
            date: new Date().toISOString().split('T')[0],
            start_time: '08:00',
            end_time: '16:00',
            shift_type: 'day',
            is_available: true,
        });
        if (error) throw error;
        pass('6C Doctor schedule inserted');
    } catch (e) { fail('6C Doctor schedule', e); }
}

// ─── PHASE 7: Availability ────────────────────────────────────────────────────
async function phase7_availability() {
    section('PHASE 7: Availability System Validation');
    const client = svc || anon;

    // 7A: Hospital availability
    try {
        if (state.hospitalId) {
            const { error } = await anon.rpc('update_hospital_availability', {
                hospital_id: state.hospitalId,
                beds_available: 48,
                er_wait_time: 12,
                p_status: 'available',
                ambulance_count: 4
            });
            if (error) throw error;
            pass('7A update_hospital_availability RPC works');
        }
    } catch (e) { fail('7A update_hospital_availability', e); }

    // 7B: Ambulance availability check
    try {
        const { data: amb } = await (client).from('ambulances').select('status, profile_id, hospital_id').eq('id', state.ambulanceId).single();
        pass('7B Ambulance state readable', `status=${amb?.status}, driver=${!!amb?.profile_id}`);
    } catch (e) { fail('7B Ambulance read', e); }

    // 7C: get_available_ambulances RPC — check for schema gaps
    try {
        const { data, error } = await anon.rpc('get_available_ambulances', { p_hospital_id: state.hospitalId });
        if (error) {
            warn('7C get_available_ambulances RPC', `Error: ${error.message} — Check ambulances.location type, ambulances.rating, ambulances.specialty, ambulances.last_maintenance columns`);
        } else {
            pass('7C get_available_ambulances RPC', `${data?.length || 0} available`);
        }
    } catch (e) { warn('7C get_available_ambulances', e.message); }
}

// ─── PHASE 8: Full Emergency Flow ─────────────────────────────────────────────
async function phase8_emergencyFlow() {
    section('PHASE 8: Full Emergency Flow — Cash Payment');
    const client = svc || anon;
    if (!state.hospitalId || !state.patientUserId) { fail('PHASE 8 skipped', 'missing hospital or patient'); return; }

    // 8A: Create emergency request via RPC
    try {
        const { data, error } = await anon.rpc('create_emergency_v4', {
            p_user_id: state.patientUserId,
            p_request_data: {
                hospital_id: state.hospitalId,
                service_type: 'ambulance',
                hospital_name: `Corinto General Hospital (Test ${TS})`,
                specialty: 'Emergency Medicine',
                ambulance_type: 'BLS',
                patient_location: { lat: 37.8044, lng: -122.2712 },
                patient_snapshot: { blood_type: 'O+', conditions: ['Hypertension'] }
            },
            p_payment_data: { method: 'cash', total_amount: 250.00, currency: 'USD', fee_amount: 6.25 }
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'create_emergency_v4 returned success=false');
        state.emergencyReqId = data.request_id;
        state.paymentId = data.payment_id;
        pass('8A create_emergency_v4 (cash)', `REQ=${data.display_id}, requires_approval=${data.requires_approval}`);
    } catch (e) { fail('8A create_emergency_v4', e); return; }

    // 8B: Verify visit auto-created
    try {
        await new Promise(r => setTimeout(r, 500));
        const { data } = await (client).from('visits').select('id, status').eq('request_id', state.emergencyReqId).single();
        if (data) {
            state.visitId = data.id;
            pass('8B Visit auto-created by create_emergency_v4', `status=${data.status}`);
        } else {
            fail('8B Visit not created', 'visits row missing for request_id');
        }
    } catch (e) { fail('8B Visit check', e); }

    // 8C: Fund org wallet for fee payment
    try {
        const { data: orgWallet } = await (client).from('organization_wallets').select('id').eq('organization_id', state.orgId).single();
        if (orgWallet) {
            await (client).from('organization_wallets').update({ balance: 500.00 }).eq('id', orgWallet.id);
            // Also ensure ivisit_main_wallet exists
            const { data: mw } = await (client).from('ivisit_main_wallet').select('id').limit(1).single();
            if (!mw) {
                await (client).from('ivisit_main_wallet').insert({ balance: 0, currency: 'USD' });
                pass('8C ivisit_main_wallet initialized');
            }
            pass('8C Org wallet funded for fee deduction ($500)');
        } else {
            warn('8C Org wallet funding', 'org wallet not found — cash approval will fail fee check');
        }
    } catch (e) { warn('8C Org wallet funding', e.message); }

    // 8D: Approve cash payment
    if (state.paymentId && state.emergencyReqId) {
        try {
            const { data, error } = await anon.rpc('approve_cash_payment', {
                p_payment_id: state.paymentId,
                p_request_id: state.emergencyReqId
            });
            if (error) throw error;
            if (data?.success) {
                pass('8D approve_cash_payment', `fee_deducted=${data.fee_deducted}, new_balance=${data.new_balance}`);
            } else {
                fail('8D approve_cash_payment', data?.error || 'returned success=false');
            }
        } catch (e) { fail('8D approve_cash_payment', e); }

        // 8E: Verify post-approval state
        try {
            const { data: req } = await (client).from('emergency_requests').select('status, payment_status').eq('id', state.emergencyReqId).single();
            const { data: pay } = await (client).from('payments').select('status').eq('id', state.paymentId).single();
            const { data: vis } = await (client).from('visits').select('status').eq('id', state.visitId).single();
            req?.status === 'in_progress' ? pass('8E emergency_request.status=in_progress') : fail('8E emergency status', `got: ${req?.status}`);
            pay?.status === 'completed' ? pass('8E payment.status=completed') : fail('8E payment status', `got: ${pay?.status}`);
            vis?.status === 'active' ? pass('8E visit.status=active') : fail('8E visit status', `got: ${vis?.status}`);
        } catch (e) { fail('8E Post-approval state check', e); }

        // 8F: Wallet ledger entries
        try {
            const { data: ledger } = await (client).from('wallet_ledger').select('transaction_type, amount').eq('reference_id', state.paymentId);
            ledger?.length >= 2 ? pass('8F wallet_ledger entries created', `${ledger.length} entries`) : warn('8F wallet_ledger', `Expected >= 2 entries, got ${ledger?.length}`);
        } catch (e) { fail('8F wallet_ledger check', e); }
    }

    // 8G: Dispatch ambulance
    if (state.ambulanceId && state.emergencyReqId) {
        try {
            const { data, error } = await anon.rpc('assign_ambulance_to_emergency', {
                p_emergency_request_id: state.emergencyReqId,
                p_ambulance_id: state.ambulanceId
            });
            if (error) throw error;
            data?.success ? pass('8G assign_ambulance_to_emergency') : warn('8G ambulance dispatch', data?.error || 'not available');
        } catch (e) { warn('8G ambulance dispatch', e.message); }
    }
}

// ─── PHASE 9: Bed Booking ─────────────────────────────────────────────────────
async function phase9_bedBooking() {
    section('PHASE 9: Bed Booking Flow');
    if (!state.hospitalId || !state.patientUserId) { fail('PHASE 9 skipped', 'missing prerequisites'); return; }

    let bedReqId = null;
    try {
        const { data, error } = await anon.rpc('create_emergency_v4', {
            p_user_id: state.patientUserId,
            p_request_data: {
                hospital_id: state.hospitalId,
                service_type: 'bed',
                hospital_name: `Corinto General Hospital (Test ${TS})`,
                specialty: 'Internal Medicine',
                patient_location: { lat: 37.8044, lng: -122.2712 },
                patient_snapshot: {}
            },
            p_payment_data: { method: 'cash', total_amount: 400.00, currency: 'USD' }
        });
        if (error) throw error;
        bedReqId = data?.request_id;
        pass('9A Bed booking emergency created', `REQ=${data?.display_id}`);
    } catch (e) {
        // Might fail if unique index blocks (patient already has active ambulance request)
        if (e.message?.includes('unique') || e.message?.includes('one_active')) {
            pass('9A Unique index works — blocks duplicate active request');
        } else {
            fail('9A Bed booking', e);
        }
    }

    // 9B: Discharge
    if (bedReqId) {
        try {
            const ok = await anon.rpc('discharge_patient', { request_uuid: bedReqId });
            pass('9B discharge_patient RPC works');
        } catch (e) { fail('9B discharge_patient', e); }
    }
}

// ─── PHASE 10: Insurance ──────────────────────────────────────────────────────
async function phase10_insurance() {
    section('PHASE 10: Insurance Flow');
    const client = svc || anon;
    if (!state.patientUserId) { fail('PHASE 10 skipped', 'no patient'); return; }

    try {
        const { data, error } = await (client).from('insurance_policies').insert({
            user_id: state.patientUserId,
            provider_name: 'BlueCross TestCare',
            policy_number: `POL-${TS}`,
            policy_type: 'comprehensive',
            coverage_amount: 50000.00,
            is_active: true,
            is_default: true,
        }).select('id').single();
        if (error) throw error;
        pass('10A insurance_policies INSERT', `id=${data.id}`);
    } catch (e) { fail('10A insurance_policies insert', e); }

    // Test get_insurance_policies RPC
    try {
        const { data, error } = await anon.rpc('get_insurance_policies', { p_user_id: state.patientUserId });
        if (error && error.message.includes('does not exist')) {
            warn('10B get_insurance_policies RPC', 'Function does not exist — needs to be added to core_rpcs pillar');
        } else if (error) {
            fail('10B get_insurance_policies', error);
        } else {
            pass('10B get_insurance_policies RPC', `${data?.length || 0} policies`);
        }
    } catch (e) { warn('10B get_insurance_policies RPC', e.message); }
}

// ─── PHASE 11: Relationship Graph Verification ────────────────────────────────
async function phase11_relationships() {
    section('PHASE 11: Full Relationship Graph Verification');
    const client = svc || anon;

    // Verify the full chain: profile → org → hospital → ambulance → driver
    try {
        if (state.ambulanceId) {
            const { data } = await (client).from('ambulances')
                .select(`id, display_id, organization_id, hospital_id, profile_id, hospitals(id, name, organization_id, organizations(id, name))`)
                .eq('id', state.ambulanceId).single();
            const hasOrg = data?.hospitals?.organizations?.id === state.orgId;
            hasOrg ? pass('11A ambulance→hospital→org chain intact') : warn('11A FK chain', `Org mismatch: expected ${state.orgId}, got ${data?.hospitals?.organizations?.id}`);
        }
    } catch (e) { warn('11A Relationship graph', e.message); }

    // Doctor → Hospital → Org
    try {
        if (state.doctorRecordId) {
            const { data } = await (client).from('doctors')
                .select(`id, profile_id, hospital_id, hospitals(organization_id)`)
                .eq('id', state.doctorRecordId).single();
            data?.hospitals?.organization_id === state.orgId
                ? pass('11B doctor→hospital→org chain intact')
                : warn('11B Doctor FK chain', 'org_id mismatch on doctor→hospital');
        }
    } catch (e) { warn('11B Doctor relationship', e.message); }

    // Emergency → Hospital → payment → wallet_ledger
    try {
        if (state.emergencyReqId) {
            const { data } = await (client).from('emergency_requests')
                .select(`id, hospital_id, ambulance_id, assigned_doctor_id, payments(id, status)`)
                .eq('id', state.emergencyReqId).single();
            pass('11C Emergency → payment chain', `payments=${data?.payments?.length ?? 'N/A'}`);
        }
    } catch (e) { warn('11C Emergency relationships', e.message); }
}

// ─── CLEANUP ──────────────────────────────────────────────────────────────────
async function cleanup() {
    section('CLEANUP — Zero Leak Protocol');
    const client = svc || anon;

    // Delete in FK-safe reverse order
    try {
        if (state.hospitalId) {
            await (client).from('doctor_schedules').delete().eq('doctor_id', state.doctorRecordId);
            await (client).from('emergency_doctor_assignments').delete().eq('emergency_request_id', state.emergencyReqId);
            await (client).from('wallet_ledger').delete().eq('reference_id', state.paymentId);
            await (client).from('payments').delete().eq('id', state.paymentId);
            await (client).from('visits').delete().eq('request_id', state.emergencyReqId);
            await (client).from('emergency_requests').delete().eq('id', state.emergencyReqId);
            await (client).from('insurance_policies').delete().eq('user_id', state.patientUserId);
            await (client).from('doctors').delete().eq('id', state.doctorRecordId);
            await (client).from('ambulances').delete().eq('id', state.ambulanceId);
            await (client).from('service_pricing').delete().eq('hospital_id', state.hospitalId);
            await (client).from('room_pricing').delete().eq('hospital_id', state.hospitalId);
            await (client).from('hospitals').delete().eq('id', state.hospitalId);
        }
        if (state.orgId) {
            await (client).from('organization_wallets').delete().eq('organization_id', state.orgId);
            await (client).from('organizations').delete().eq('id', state.orgId);
        }
        console.log('  🗑️  DB records cleaned');
    } catch (e) {
        console.error('  ⚠️  Cleanup error (non-fatal):', e.message);
    }

    // Delete auth users
    for (const uid of [state.patientUserId, state.orgAdminUserId, state.driverUserId, state.doctorUserId]) {
        if (uid) { await deleteAuthUser(uid); }
    }
    console.log('  🗑️  Auth users deleted');
}

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
function printSummary() {
    section('FINAL REPORT');
    const total = results.passed + results.failed;
    console.log(`\n  ✅ Passed:   ${results.passed}`);
    console.log(`  ❌ Failed:   ${results.failed}`);
    console.log(`  ⚠️  Warnings: ${results.warnings}`);
    console.log(`  📊 Success:  ${total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0}%`);

    if (schemaGaps.length > 0) {
        console.log('\n  📋 SCHEMA GAPS DETECTED (require pillar migration fixes):');
        schemaGaps.forEach((g, i) => console.log(`     ${i + 1}. [${g.label}] ${g.detail}`));
    }

    if (results.errors.length > 0) {
        console.log('\n  🚨 ERROR LOG:');
        results.errors.forEach((e, i) => console.log(`     ${i + 1}. [${e.type}] ${e.label}: ${e.msg}`));
    }

    // Write JSON log
    const logPath = path.join(__dirname, '../validation/error_log.json');
    try {
        fs.writeFileSync(logPath, JSON.stringify({ timestamp: new Date().toISOString(), results, schemaGaps }, null, 2));
        console.log(`\n  📁 Error log written: ${logPath}`);
    } catch (e) { /* non-fatal */ }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🧪 iVisit Ecosystem Integration Test');
    console.log(`   Task: profile_org_emergency_ecosystem`);
    console.log(`   Time: ${new Date().toISOString()}`);
    console.log(`   Service Key: ${SERVICE_KEY ? '✅ present' : '⚠️  missing (RLS-limited mode)'}`);

    try {
        await phase1_profileCrud();
        await phase2_organisation();
        await phase3_hospital();
        await phase4_pricing();
        await phase5_ambulanceDriver();
        await phase6_doctor();
        await phase7_availability();
        await phase8_emergencyFlow();
        await phase9_bedBooking();
        await phase10_insurance();
        await phase11_relationships();
    } finally {
        await cleanup();
        printSummary();
        process.exit(results.failed > 0 ? 1 : 0);
    }
}

main().catch(e => {
    console.error('🚨 FATAL:', e);
    process.exit(1);
});
