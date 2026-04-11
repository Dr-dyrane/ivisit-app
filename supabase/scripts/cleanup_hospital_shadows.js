#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
	throw new Error('Missing Supabase service-role environment');
}

const APPLY = process.argv.includes('--apply');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES = {
	AMBULANCES: 'ambulances',
	DOCTORS: 'doctors',
	EMERGENCY_REQUESTS: 'emergency_requests',
	HOSPITALS: 'hospitals',
	PROFILES: 'profiles',
	ROOM_PRICING: 'room_pricing',
	SERVICE_PRICING: 'service_pricing',
	VISITS: 'visits',
};

const ADDRESS_TOKEN_REPLACEMENTS = [
	[/\bunited states\b/g, ''],
	[/\busa\b/g, ''],
	[/\bcanada\b/g, ''],
	[/\bnigeria\b/g, ''],
	[/\bcalifornia\b/g, 'ca'],
	[/\bavenue\b/g, 'ave'],
	[/\bstreet\b/g, 'st'],
	[/\bdrive\b/g, 'dr'],
	[/\broad\b/g, 'rd'],
	[/\bboulevard\b/g, 'blvd'],
	[/\blane\b/g, 'ln'],
	[/\bcourt\b/g, 'ct'],
	[/\bcircle\b/g, 'cir'],
	[/\bparkway\b/g, 'pkwy'],
	[/\bsuite\b/g, 'ste'],
	[/\bunit\b/g, 'ste'],
];

const normalizeText = (value = '') =>
	String(value || '')
		.toLowerCase()
		.replace(/[.,]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

const canonicalizeAddress = (value = '') => {
	let normalized = normalizeText(value);
	ADDRESS_TOKEN_REPLACEMENTS.forEach(([pattern, replacement]) => {
		normalized = normalized.replace(pattern, replacement);
	});
	return normalized.replace(/\s+/g, ' ').trim();
};

const coordinateKey = (value) => {
	const number = Number(value);
	if (!Number.isFinite(number)) return '0.00000';
	return number.toFixed(5);
};

const isDemoHospital = (hospital) => {
	const placeId = String(hospital.place_id || '').toLowerCase();
	const verificationStatus = String(hospital.verification_status || '').toLowerCase();
	const features = Array.isArray(hospital.features) ? hospital.features : [];
	return (
		placeId.startsWith('demo:') ||
		verificationStatus.startsWith('demo') ||
		features.some((feature) => String(feature).toLowerCase().includes('demo'))
	);
};

const isLiveVerifiedHospital = (hospital) =>
	isDemoHospital(hospital) !== true &&
	(hospital.verified === true ||
		String(hospital.verification_status || '').toLowerCase() === 'verified');

const isPendingProviderHospital = (hospital) =>
	isDemoHospital(hospital) !== true &&
	String(hospital.verification_status || '').toLowerCase() !== 'verified';

const isSharedHospital = (hospital) => {
	const features = Array.isArray(hospital.features) ? hospital.features : [];
	return features.some((feature) => String(feature).toLowerCase() === 'demo_shared');
};

const facilityKeyForHospital = (hospital) => {
	const name = normalizeText(hospital.name);
	const address = canonicalizeAddress(hospital.address);
	if (name && address) return `${name}|${address}`;
	return [
		name,
		coordinateKey(hospital.latitude),
		coordinateKey(hospital.longitude),
	].join('|');
};

const compareByCreatedAt = (a, b) =>
	String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
	String(a.id || '').localeCompare(String(b.id || ''));

const fetchAllByHospitalIds = async (table, hospitalIds, columns = '*') => {
	if (hospitalIds.length === 0) return [];
	const { data, error } = await supabase
		.from(table)
		.select(columns)
		.in('hospital_id', hospitalIds);
	if (error) throw new Error(`${table} fetch failed: ${error.message}`);
	return data || [];
};

const fetchReferenceCounts = async (hospitalIds) => {
	const refCounts = new Map(
		hospitalIds.map((id) => [
			id,
			{
				ambulances: 0,
				doctors: 0,
				emergency_requests: 0,
				room_pricing: 0,
				service_pricing: 0,
				visits: 0,
			},
		])
	);

	const tableSpecs = [
		TABLES.AMBULANCES,
		TABLES.DOCTORS,
		TABLES.EMERGENCY_REQUESTS,
		TABLES.ROOM_PRICING,
		TABLES.SERVICE_PRICING,
		TABLES.VISITS,
	];

	for (const table of tableSpecs) {
		const rows = await fetchAllByHospitalIds(table, hospitalIds, 'hospital_id');
		rows.forEach((row) => {
			if (!row.hospital_id || !refCounts.has(row.hospital_id)) return;
			refCounts.get(row.hospital_id)[table] += 1;
		});
	}

	return refCounts;
};

const byHospitalId = (rows) =>
	rows.reduce((map, row) => {
		const key = row.hospital_id;
		if (!key) return map;
		if (!map.has(key)) map.set(key, []);
		map.get(key).push(row);
		return map;
	}, new Map());

const refScore = (refs = {}) =>
	(refs.emergency_requests || 0) * 100 +
	(refs.visits || 0) * 100 +
	(refs.ambulances || 0) * 30 +
	(refs.doctors || 0) * 20 +
	(refs.service_pricing || 0) * 10 +
	(refs.room_pricing || 0) * 10;

const chooseCanonicalHospital = (rows, refCounts) => {
	const ranked = [...rows].sort((a, b) => {
		const aLiveVerified = isLiveVerifiedHospital(a);
		const bLiveVerified = isLiveVerifiedHospital(b);
		if (aLiveVerified !== bLiveVerified) return aLiveVerified ? -1 : 1;

		const aShared = isSharedHospital(a);
		const bShared = isSharedHospital(b);
		if (aShared !== bShared) return aShared ? -1 : 1;

		const aVerified = a.verified === true || String(a.verification_status || '').toLowerCase() === 'verified';
		const bVerified = b.verified === true || String(b.verification_status || '').toLowerCase() === 'verified';
		if (aVerified !== bVerified) return aVerified ? -1 : 1;

		const aScore = refScore(refCounts.get(a.id));
		const bScore = refScore(refCounts.get(b.id));
		if (aScore !== bScore) return bScore - aScore;

		const aOrg = a.organization_id ? 1 : 0;
		const bOrg = b.organization_id ? 1 : 0;
		if (aOrg !== bOrg) return bOrg - aOrg;

		return compareByCreatedAt(a, b);
	});

	return ranked[0];
};

const pickSeedDonor = (canonical, donors, refCounts) =>
	[...donors].sort((a, b) => {
		const aScore = refScore(refCounts.get(a.id));
		const bScore = refScore(refCounts.get(b.id));
		if (aScore !== bScore) return bScore - aScore;
		return compareByCreatedAt(a, b);
	})[0] || null;

const runDelete = async (table, ids) => {
	if (!ids || ids.length === 0) return 0;
	const { error } = await supabase.from(table).delete().in('id', ids);
	if (error) throw new Error(`${table} delete failed: ${error.message}`);
	return ids.length;
};

const upsertServicePricing = async (canonicalHospitalId, rows) => {
	for (const row of rows) {
		const payload = {
			hospital_id: canonicalHospitalId,
			service_type: row.service_type,
			service_name: row.service_name,
			base_price: row.base_price,
			description: row.description,
		};
		const { error } = await supabase.rpc('upsert_service_pricing', { payload });
		if (error) throw new Error(`service pricing upsert failed: ${error.message}`);
	}
};

const upsertRoomPricing = async (canonicalHospitalId, rows) => {
	for (const row of rows) {
		const payload = {
			hospital_id: canonicalHospitalId,
			room_type: row.room_type,
			room_name: row.room_name,
			price_per_night: row.price_per_night,
			description: row.description,
		};
		const { error } = await supabase.rpc('upsert_room_pricing', { payload });
		if (error) throw new Error(`room pricing upsert failed: ${error.message}`);
	}
};

const seedCanonicalHospital = async ({
	canonical,
	donor,
	doctorsByHospital,
	ambulancesByHospital,
	servicePricingByHospital,
	roomPricingByHospital,
	refCounts,
}) => {
	if (!donor) {
		return {
			movedDoctorId: null,
			movedAmbulanceId: null,
		};
	}

	const canonicalRefs = refCounts.get(canonical.id) || {};
	const donorDoctors = doctorsByHospital.get(donor.id) || [];
	const donorAmbulances = ambulancesByHospital.get(donor.id) || [];
	const donorServicePricing = servicePricingByHospital.get(donor.id) || [];
	const donorRoomPricing = roomPricingByHospital.get(donor.id) || [];

	let movedDoctorId = null;
	let movedAmbulanceId = null;

	if ((canonicalRefs.doctors || 0) === 0 && donorDoctors.length > 0) {
		const doctor = donorDoctors[0];
		const { error } = await supabase
			.from(TABLES.DOCTORS)
			.update({ hospital_id: canonical.id, updated_at: new Date().toISOString() })
			.eq('id', doctor.id);
		if (error) throw new Error(`doctor reassignment failed: ${error.message}`);
		if (canonical.organization_id && doctor.profile_id) {
			const { error: profileError } = await supabase
				.from(TABLES.PROFILES)
				.update({ organization_id: canonical.organization_id, updated_at: new Date().toISOString() })
				.eq('id', doctor.profile_id);
			if (profileError) throw new Error(`doctor profile org sync failed: ${profileError.message}`);
		}
		movedDoctorId = doctor.id;
	}

	if ((canonicalRefs.ambulances || 0) === 0 && donorAmbulances.length > 0) {
		const ambulance = donorAmbulances[0];
		const { error } = await supabase
			.from(TABLES.AMBULANCES)
			.update({
				hospital_id: canonical.id,
				organization_id: canonical.organization_id || ambulance.organization_id,
				updated_at: new Date().toISOString(),
			})
			.eq('id', ambulance.id);
		if (error) throw new Error(`ambulance reassignment failed: ${error.message}`);
		if (canonical.organization_id && ambulance.profile_id) {
			const { error: profileError } = await supabase
				.from(TABLES.PROFILES)
				.update({
					organization_id: canonical.organization_id,
					assigned_ambulance_id: ambulance.id,
					updated_at: new Date().toISOString(),
				})
				.eq('id', ambulance.profile_id);
			if (profileError) throw new Error(`ambulance profile org sync failed: ${profileError.message}`);
		}
		movedAmbulanceId = ambulance.id;
	}

	if ((canonicalRefs.service_pricing || 0) === 0 && donorServicePricing.length > 0) {
		await upsertServicePricing(canonical.id, donorServicePricing);
	}

	if ((canonicalRefs.room_pricing || 0) === 0 && donorRoomPricing.length > 0) {
		await upsertRoomPricing(canonical.id, donorRoomPricing);
	}

	return { movedDoctorId, movedAmbulanceId };
};

const main = async () => {
	const { data: hospitals, error } = await supabase
		.from(TABLES.HOSPITALS)
		.select('id,name,address,place_id,features,organization_id,latitude,longitude,verified,verification_status,status,created_at')
		.eq('status', 'available');

	if (error) throw new Error(`hospital fetch failed: ${error.message}`);

	const groups = new Map();
	hospitals.forEach((hospital) => {
		const key = facilityKeyForHospital(hospital);
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(hospital);
	});

	const duplicateGroups = [...groups.entries()]
		.filter(([, rows]) => rows.length > 1 && rows.some(isDemoHospital))
		.sort((a, b) => b[1].length - a[1].length);

	const hospitalIds = hospitals.map((hospital) => hospital.id);
	const refCounts = await fetchReferenceCounts(hospitalIds);

	const allDoctors = await fetchAllByHospitalIds(TABLES.DOCTORS, hospitalIds, 'id,hospital_id,profile_id');
	const allAmbulances = await fetchAllByHospitalIds(
		TABLES.AMBULANCES,
		hospitalIds,
		'id,hospital_id,profile_id,organization_id'
	);
	const allServicePricing = await fetchAllByHospitalIds(
		TABLES.SERVICE_PRICING,
		hospitalIds,
		'id,hospital_id,service_type,service_name,base_price,description'
	);
	const allRoomPricing = await fetchAllByHospitalIds(
		TABLES.ROOM_PRICING,
		hospitalIds,
		'id,hospital_id,room_type,room_name,price_per_night,description'
	);
	const allRequests = await fetchAllByHospitalIds(
		TABLES.EMERGENCY_REQUESTS,
		hospitalIds,
		'id,hospital_id'
	);
	const allVisits = await fetchAllByHospitalIds(TABLES.VISITS, hospitalIds, 'id,hospital_id');

	const doctorsByHospital = byHospitalId(allDoctors);
	const ambulancesByHospital = byHospitalId(allAmbulances);
	const servicePricingByHospital = byHospitalId(allServicePricing);
	const roomPricingByHospital = byHospitalId(allRoomPricing);
	const requestsByHospital = byHospitalId(allRequests);
	const visitsByHospital = byHospitalId(allVisits);

	const plan = duplicateGroups.map(([key, rows]) => {
		const canonical = chooseCanonicalHospital(rows, refCounts);
		const donors = rows.filter((row) => row.id !== canonical.id);
		const seedDonor = pickSeedDonor(canonical, donors, refCounts);
		return { key, rows, canonical, donors, seedDonor };
	});

	const summary = {
		duplicate_groups: plan.length,
		canonical_hospitals: plan.length,
		duplicate_hospitals_to_remove: plan.reduce((total, group) => total + group.donors.length, 0),
		emergency_requests_to_reassign: 0,
		visits_to_reassign: 0,
		ambulances_to_remove: 0,
		doctors_to_remove: 0,
		service_pricing_to_remove: 0,
		room_pricing_to_remove: 0,
	};

	plan.forEach((group) => {
		group.donors.forEach((hospital) => {
			summary.emergency_requests_to_reassign += (requestsByHospital.get(hospital.id) || []).length;
			summary.visits_to_reassign += (visitsByHospital.get(hospital.id) || []).length;
			summary.ambulances_to_remove += (ambulancesByHospital.get(hospital.id) || []).length;
			summary.doctors_to_remove += (doctorsByHospital.get(hospital.id) || []).length;
			summary.service_pricing_to_remove += (servicePricingByHospital.get(hospital.id) || []).length;
			summary.room_pricing_to_remove += (roomPricingByHospital.get(hospital.id) || []).length;
		});
	});

	console.log(JSON.stringify({ apply: APPLY, summary }, null, 2));

	plan.forEach((group) => {
		console.log(
			JSON.stringify(
				{
					group: group.key,
					canonical: {
						id: group.canonical.id,
						name: group.canonical.name,
						address: group.canonical.address,
						place_id: group.canonical.place_id,
						demo: isDemoHospital(group.canonical),
						live_verified: isLiveVerifiedHospital(group.canonical),
						pending_provider: isPendingProviderHospital(group.canonical),
						refs: refCounts.get(group.canonical.id),
					},
					donors: group.donors.map((hospital) => ({
						id: hospital.id,
						name: hospital.name,
						place_id: hospital.place_id,
						demo: isDemoHospital(hospital),
						live_verified: isLiveVerifiedHospital(hospital),
						pending_provider: isPendingProviderHospital(hospital),
						refs: refCounts.get(hospital.id),
					})),
					seed_from: group.seedDonor ? group.seedDonor.id : null,
				},
				null,
				2
			)
		);
	});

	if (!APPLY) return;

	for (const group of plan) {
		const donorHospitalIds = group.donors.map((row) => row.id);
		if (donorHospitalIds.length === 0) continue;

		const seedResult = await seedCanonicalHospital({
			canonical: group.canonical,
			donor: group.seedDonor,
			doctorsByHospital,
			ambulancesByHospital,
			servicePricingByHospital,
			roomPricingByHospital,
			refCounts,
		});

		const donorRequestRows = donorHospitalIds.flatMap((hospitalId) => requestsByHospital.get(hospitalId) || []);
		const donorVisitRows = donorHospitalIds.flatMap((hospitalId) => visitsByHospital.get(hospitalId) || []);
		const donorAmbulanceRows = donorHospitalIds
			.flatMap((hospitalId) => ambulancesByHospital.get(hospitalId) || [])
			.filter((row) => row.id !== seedResult.movedAmbulanceId);
		const donorDoctorRows = donorHospitalIds
			.flatMap((hospitalId) => doctorsByHospital.get(hospitalId) || [])
			.filter((row) => row.id !== seedResult.movedDoctorId);
		const donorServicePricingRows = donorHospitalIds.flatMap(
			(hospitalId) => servicePricingByHospital.get(hospitalId) || []
		);
		const donorRoomPricingRows = donorHospitalIds.flatMap((hospitalId) => roomPricingByHospital.get(hospitalId) || []);

		if (donorRequestRows.length > 0) {
			const donorRequestIds = donorRequestRows.map((row) => row.id);
			const { error: requestReassignError } = await supabase
				.from(TABLES.EMERGENCY_REQUESTS)
				.update({
					hospital_id: group.canonical.id,
					hospital_name: group.canonical.name,
					updated_at: new Date().toISOString(),
				})
				.in('id', donorRequestIds);
			if (requestReassignError) {
				throw new Error(`emergency request reassignment failed: ${requestReassignError.message}`);
			}
		}

		if (donorVisitRows.length > 0) {
			const donorVisitIds = donorVisitRows.map((row) => row.id);
			const { error: visitReassignError } = await supabase
				.from(TABLES.VISITS)
				.update({
					hospital_id: group.canonical.id,
					hospital_name: group.canonical.name,
					updated_at: new Date().toISOString(),
				})
				.in('id', donorVisitIds);
			if (visitReassignError) {
				throw new Error(`visit reassignment failed: ${visitReassignError.message}`);
			}
		}

		if (donorAmbulanceRows.length > 0) {
			const donorAmbulanceIds = donorAmbulanceRows.map((row) => row.id);
			const { error: profileClearError } = await supabase
				.from(TABLES.PROFILES)
				.update({ assigned_ambulance_id: null, updated_at: new Date().toISOString() })
				.in('assigned_ambulance_id', donorAmbulanceIds);
			if (profileClearError) {
				throw new Error(`ambulance profile clear failed: ${profileClearError.message}`);
			}
		}

		await runDelete(TABLES.ROOM_PRICING, donorRoomPricingRows.map((row) => row.id));
		await runDelete(TABLES.SERVICE_PRICING, donorServicePricingRows.map((row) => row.id));
		await runDelete(TABLES.DOCTORS, donorDoctorRows.map((row) => row.id));
		await runDelete(TABLES.AMBULANCES, donorAmbulanceRows.map((row) => row.id));
		await runDelete(TABLES.HOSPITALS, donorHospitalIds);
	}
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
