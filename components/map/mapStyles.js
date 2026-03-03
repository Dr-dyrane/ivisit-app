const MAP_THEME = {
	light: {
		base: "#F2F4F7",
		land: "#ECEFF3",
		poi: "#E6EBF2",
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
		poi: "#1A212D",
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
};

const buildMapStyle = (theme) => [
	{ elementType: "geometry", stylers: [{ color: theme.base }] },
	{ elementType: "labels.text.fill", stylers: [{ color: theme.label }] },
	{
		elementType: "labels.text.stroke",
		stylers: [{ color: theme.labelStroke }, { weight: 1.5 }],
	},
	{ elementType: "labels.icon", stylers: [{ visibility: "on" }] },

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
		featureType: "poi",
		elementType: "geometry",
		stylers: [{ color: theme.poi }],
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
