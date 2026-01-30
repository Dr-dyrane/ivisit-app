import { Platform } from 'react-native';

let MapView, Marker, Polyline, PROVIDER_GOOGLE;

if (Platform.OS !== 'web') {
	const maps = require("react-native-maps");
	MapView = maps.default;
	Marker = maps.Marker;
	Polyline = maps.Polyline;
	PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

export { MapView, Marker, Polyline, PROVIDER_GOOGLE };
