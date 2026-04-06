import { COLORS } from "../../constants/colors";

const MAP_THEME = {
	light: {
		base: "#F8FAFC",
		land: "#F1F4F8",
		landcover: "#E3EBDD",
		building: "#E7ECF2",
		buildingStroke: "#DCE3EB",
		poi: "#E6EBF2",
		poiLabel: "#8A95A7",
		roadLocal: "#FFFFFF",
		roadArterial: "#F4F6FA",
		roadHighway: "#E7ECF4",
		roadStroke: "#D5DCE6",
		roadLabel: "#5B6577",
		label: "#4A5568",
		labelStroke: "#FFFFFF",
		water: "#DCE5F2",
		waterLabel: "#5F708C",
		park: "#DDE4DB",
		medicalFill: "#F5E7E9",
		medicalLabel: "#86100E",
	},
	dark: {
		base: "#0F131A",
		land: "#151B24",
		landcover: "#1A2420",
		building: "#1C2430",
		buildingStroke: "#273141",
		poi: "#1A212D",
		poiLabel: "#6F7E94",
		roadLocal: "#202734",
		roadArterial: "#2A3444",
		roadHighway: "#3A4458",
		roadStroke: "#4B5870",
		roadLabel: "#A5B0C2",
		label: "#98A3B6",
		labelStroke: "#0F131A",
		water: "#1A2535",
		waterLabel: "#8BA1C2",
		park: "#1A2420",
		medicalFill: "#2A1A1F",
		medicalLabel: "#E48A93",
	},
	androidLight: {
		base: COLORS.bgLight,
		land: "#FCFCFA",
		landcover: "#F3F5EF",
		building: "#F4F6F0",
		buildingStroke: "#EEF1EA",
		poi: "#F6F7F2",
		poiLabel: "#8A9088",
		roadLocal: "#FFFFFF",
		roadArterial: "#FAFBF8",
		roadHighway: "#F1F3ED",
		roadStroke: "#DEE3DC",
		roadLabel: "#626860",
		label: "#5C635A",
		labelStroke: "#FFFFFF",
		water: "#E2EBF4",
		waterLabel: "#607189",
		park: "#E4ECD9",
		medicalFill: "#F5E7E9",
		medicalLabel: "#86100E",
	},
	androidDark: {
		base: COLORS.bgDark,
		land: COLORS.bgDarkAlt,
		landcover: "#141B28",
		building: "#202735",
		buildingStroke: "#2B3646",
		poi: "#18202B",
		poiLabel: "#8A97A9",
		roadLocal: "#202734",
		roadArterial: "#2A3444",
		roadHighway: "#394555",
		roadStroke: "#4A586A",
		roadLabel: "#A6B1C3",
		label: "#97A4B7",
		labelStroke: COLORS.bgDark,
		water: "#1A2535",
		waterLabel: "#8BA1C2",
		park: "#18211B",
		medicalFill: "#2A1A1F",
		medicalLabel: "#E48A93",
	},
};

const buildMapStyle = (theme) => [
	{ elementType: "geometry", stylers: [{ color: theme.base }] },
	{ elementType: "labels.text.fill", stylers: [{ color: theme.label }] },
	{
		elementType: "labels.text.stroke",
		stylers: [{ color: theme.labelStroke }, { weight: 1.5 }],
	},
	{
		elementType: "labels.icon",
		stylers: [{ visibility: "on" }, { saturation: -100 }, { lightness: 18 }],
	},

	{
		featureType: "administrative",
		elementType: "geometry.stroke",
		stylers: [{ color: theme.roadStroke }],
	},
	{
		featureType: "landscape.natural",
		elementType: "geometry",
		stylers: [{ color: theme.land }],
	},
	{
		featureType: "landscape.natural.landcover",
		elementType: "geometry",
		stylers: [{ color: theme.landcover || theme.land }],
	},
	{
		featureType: "landscape.man_made",
		elementType: "geometry.fill",
		stylers: [{ color: theme.building }],
	},
	{
		featureType: "landscape.man_made",
		elementType: "geometry.stroke",
		stylers: [{ color: theme.buildingStroke }],
	},
	{
		featureType: "poi",
		elementType: "geometry",
		stylers: [{ color: theme.poi }],
	},
	{
		featureType: "poi",
		elementType: "labels.text",
		stylers: [{ visibility: "on" }],
	},
	{
		featureType: "poi",
		elementType: "labels.text.fill",
		stylers: [{ color: theme.poiLabel }],
	},
	{
		featureType: "poi",
		elementType: "labels.text.stroke",
		stylers: [{ color: theme.labelStroke }, { weight: 1 }],
	},
	{
		featureType: "poi",
		elementType: "labels.icon",
		stylers: [{ visibility: "on" }, { saturation: -100 }, { lightness: 20 }],
	},
	{
		featureType: "poi.park",
		elementType: "geometry",
		stylers: [{ color: theme.park }],
	},
	{
		featureType: "poi.medical",
		elementType: "geometry",
		stylers: [{ color: theme.medicalFill }],
	},
	{
		featureType: "poi.medical",
		elementType: "labels.text.fill",
		stylers: [{ color: theme.medicalLabel }],
	},
	{
		featureType: "road",
		elementType: "labels.text.fill",
		stylers: [{ color: theme.roadLabel }],
	},
	{
		featureType: "road.local",
		elementType: "geometry.fill",
		stylers: [{ color: theme.roadLocal }],
	},
	{
		featureType: "road.local",
		elementType: "geometry.stroke",
		stylers: [{ color: theme.roadStroke }],
	},
	{
		featureType: "road.arterial",
		elementType: "geometry.fill",
		stylers: [{ color: theme.roadArterial }],
	},
	{
		featureType: "road.arterial",
		elementType: "geometry.stroke",
		stylers: [{ color: theme.roadStroke }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry.fill",
		stylers: [{ color: theme.roadHighway }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry.stroke",
		stylers: [{ color: theme.roadStroke }],
	},
	{
		featureType: "road.highway",
		elementType: "labels.text.fill",
		stylers: [{ color: theme.roadLabel }],
	},

	{
		featureType: "transit",
		elementType: "geometry",
		stylers: [{ color: theme.poi }],
	},
	{
		featureType: "transit.line",
		elementType: "geometry",
		stylers: [{ color: theme.roadStroke }],
	},
	{
		featureType: "transit.station",
		elementType: "labels",
		stylers: [{ visibility: "on" }],
	},
	{
		featureType: "transit.station",
		elementType: "labels.text.fill",
		stylers: [{ color: theme.poiLabel }],
	},

	{
		featureType: "water",
		elementType: "geometry",
		stylers: [{ color: theme.water }],
	},
	{
		featureType: "water",
		elementType: "labels.text.fill",
		stylers: [{ color: theme.waterLabel }],
	},
];

export const lightMapStyle = buildMapStyle(MAP_THEME.light);
export const darkMapStyle = buildMapStyle(MAP_THEME.dark);
export const lightAndroidMapStyle = buildMapStyle(MAP_THEME.androidLight);
export const darkAndroidMapStyle = buildMapStyle(MAP_THEME.androidDark);
