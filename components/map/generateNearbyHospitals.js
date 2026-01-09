import { HOSPITALS } from "../../data/hospitals";

export default function generateNearbyHospitals(userLat, userLng, count = 6) {
	const shuffled = [...HOSPITALS].sort(() => Math.random() - 0.5);
	const selected = shuffled.slice(0, Math.min(count, HOSPITALS.length));

	const generated = selected.map((hospital) => {
		const latOffset = (Math.random() - 0.5) * 0.03;
		const lngOffset = (Math.random() - 0.5) * 0.03;

		const distanceKm = Math.sqrt(latOffset ** 2 + lngOffset ** 2) * 111;
		const etaMins = Math.max(2, Math.ceil(distanceKm * 3));

		return {
			...hospital,
			id: `nearby-${hospital.id}`,
			coordinates: {
				latitude: userLat + latOffset,
				longitude: userLng + lngOffset,
			},
			distance: `${distanceKm.toFixed(1)} km`,
			eta: `${etaMins} mins`,
			availableBeds: hospital.availableBeds ?? Math.floor(Math.random() * 8) + 1,
			waitTime: hospital.waitTime ?? `${Math.floor(Math.random() * 15) + 5} mins`,
			ambulances: hospital.ambulances ?? Math.floor(Math.random() * 4) + 1,
			status: hospital.status ?? (Math.random() > 0.2 ? "available" : "busy"),
		};
	});

	return generated.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
}
