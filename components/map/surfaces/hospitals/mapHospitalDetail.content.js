const BED_SERVICE_IMAGE = require("../../../../assets/features/bed.png");

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
		: BED_SERVICE_IMAGE;
}
