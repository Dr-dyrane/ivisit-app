import { COLORS } from "../../../../constants/colors";

export function getHospitalDetailTheme(isDarkMode) {
	return {
		titleColor: isDarkMode ? "#F8FAFC" : "#0F172A",
		subtleColor: isDarkMode ? "#94A3B8" : "#64748B",
		cardSurface: isDarkMode ? "rgba(16,24,38,0.72)" : "rgba(255,255,255,0.66)",
		rowSurface: isDarkMode ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.055)",
		actionSurface: isDarkMode ? "rgba(134,16,14,0.16)" : "rgba(134,16,14,0.075)",
		actionTint: isDarkMode ? "rgba(248,113,113,0.82)" : "rgba(134,16,14,0.72)",
	};
}

export function getHospitalWebsiteUrl(hospital) {
	return (
		(typeof hospital?.googleWebsite === "string" && hospital.googleWebsite.trim()) ||
		(typeof hospital?.google_website === "string" && hospital.google_website.trim()) ||
		(typeof hospital?.website === "string" && hospital.website.trim()) ||
		null
	);
}

export function getHospitalWebsiteBrowserOptions() {
	return {
		controlsColor: COLORS.brandPrimary,
		enableBarCollapsing: true,
		showTitle: true,
	};
}

export function buildHospitalDockAction({
	canUseHospital,
	onUseHospital,
	onOpenHospitals,
	destination,
	onOpenDirections,
	onClose,
}) {
	if (canUseHospital) {
		return { label: "Use hospital", onPress: onUseHospital };
	}
	if (typeof onOpenHospitals === "function") {
		return { label: "See all hospitals", onPress: onOpenHospitals };
	}
	if (destination) {
		return { label: "Open in Maps", onPress: onOpenDirections };
	}
	return { label: "Done", onPress: onClose };
}

export function buildHospitalPlaceActions({
	arrivalLabel,
	dockAction,
	canCallHospital,
	onCallHospital,
	canOpenWebsite,
	onOpenWebsite,
}) {
	return [
		{
			key: "arrival",
			label: arrivalLabel,
			icon: "ambulance",
			iconType: "material",
			primary: true,
			onPress: dockAction.onPress,
			accessibilityLabel: dockAction.label,
		},
		{
			key: "call",
			label: "Call",
			icon: "call-outline",
			iconType: "ion",
			onPress: canCallHospital ? onCallHospital : undefined,
			disabled: !canCallHospital,
			accessibilityLabel: "Call hospital",
		},
		{
			key: "website",
			label: "Website",
			icon: "globe-outline",
			iconType: "ion",
			onPress: canOpenWebsite ? onOpenWebsite : undefined,
			disabled: !canOpenWebsite,
			accessibilityLabel: "Open hospital website",
		},
		{
			key: "schedule",
			label: "Schedule",
			icon: "calendar-outline",
			iconType: "ion",
			disabled: true,
			accessibilityLabel: "Schedule visit",
		},
	].filter(Boolean);
}

export function buildHospitalCollapsedAction({
	canUseHospital,
	onUseHospital,
	destination,
	onOpenDirections,
	onOpenHospitals,
	canCallHospital,
	onCallHospital,
	onClose,
}) {
	if (canUseHospital) {
		return {
			onPress: onUseHospital,
			icon: "ambulance",
			iconType: "material",
			primary: true,
			accessibilityLabel: "Use hospital",
		};
	}
	if (destination) {
		return {
			onPress: onOpenDirections,
			icon: "navigate-outline",
			accessibilityLabel: "Open directions",
		};
	}
	if (typeof onOpenHospitals === "function") {
		return {
			onPress: onOpenHospitals,
			icon: "arrow-forward",
			accessibilityLabel: "See all hospitals",
		};
	}
	if (canCallHospital) {
		return {
			onPress: onCallHospital,
			icon: "call-outline",
			accessibilityLabel: "Call hospital",
		};
	}
	return {
		onPress: onClose,
		icon: "close",
		accessibilityLabel: "Close hospital",
	};
}

export function buildHospitalCollapsedDistanceLabel({
	arrivalLabel,
	routeDistanceLabel,
	summarySubtitle,
}) {
	if (arrivalLabel) return `${arrivalLabel} away`;
	if (routeDistanceLabel) return `${routeDistanceLabel} away`;
	if (summarySubtitle) return `${summarySubtitle} away`;
	return "Nearby";
}
