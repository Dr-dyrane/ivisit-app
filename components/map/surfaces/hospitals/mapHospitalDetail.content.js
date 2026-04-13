const BED_SERVICE_IMAGE = require("../../../../assets/features/bed.png");
const ROOM_SERVICE_IMAGES = {
	standard: require("../../../../assets/features/rooms/room-standard.png"),
	general: require("../../../../assets/features/rooms/room-standard.png"),
	private: require("../../../../assets/features/rooms/room-private.png"),
	icu: require("../../../../assets/features/rooms/room-icu.png"),
	maternity: require("../../../../assets/features/rooms/room-maternity.png"),
	pediatric: require("../../../../assets/features/rooms/room-pediatric.png"),
	isolation: require("../../../../assets/features/rooms/room-standard.png"),
};

const AMBULANCE_SERVICE_IMAGES = {
	basic: require("../../../../assets/emergency/transport/ambulance-bls.png"),
	advanced: require("../../../../assets/emergency/transport/ambulance-als.png"),
	critical: require("../../../../assets/emergency/transport/ambulance-icu.png"),
};

export function getHospitalDetailServiceImageSource(item, type) {
	return type === "ambulance"
		? AMBULANCE_SERVICE_IMAGES[item.tierKey] ||
			AMBULANCE_SERVICE_IMAGES[item.id] ||
			AMBULANCE_SERVICE_IMAGES.basic
		: ROOM_SERVICE_IMAGES[item.room_type] ||
			ROOM_SERVICE_IMAGES[item.id] ||
			BED_SERVICE_IMAGE;
}
