import { useCallback, useEffect, useMemo } from "react";
import { Linking } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useMapRoute } from "../../../../hooks/emergency/useMapRoute";
import {
	buildDirectionsUrl,
	buildFeatureList,
	buildHeroBadges,
	buildHospitalDetailSummary,
	buildRoomRows,
	buildStatusItems,
	formatDistanceMeters,
	formatDurationSeconds,
	getDestinationCoordinate,
} from "./mapHospitalDetail.helpers";

export default function useMapHospitalDetailModel({
	visible,
	hospital,
	origin = null,
	onClose,
	onOpenHospitals,
	onUseHospital,
}) {
	const { isDarkMode } = useTheme();
	const { routeCoordinates, routeInfo, isCalculatingRoute, calculateRoute, clearRoute } =
		useMapRoute();

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const subtleColor = isDarkMode ? "#94A3B8" : "#64748B";
	const cardSurface = isDarkMode ? "rgba(16,24,38,0.94)" : "rgba(255,255,255,0.96)";
	const rowSurface = isDarkMode ? "rgba(255,255,255,0.07)" : "#EEF2F7";

	const destination = useMemo(() => getDestinationCoordinate(hospital), [hospital]);
	const heroBadges = useMemo(() => buildHeroBadges(hospital), [hospital]);
	const statusItems = useMemo(
		() => buildStatusItems(hospital, routeInfo),
		[hospital, routeInfo],
	);
	const roomRows = useMemo(() => buildRoomRows(hospital), [hospital]);
	const featureList = useMemo(() => buildFeatureList(hospital), [hospital]);
	const canCallHospital =
		typeof hospital?.phone === "string" && hospital.phone.trim().length > 0;
	const canUseHospital = typeof onUseHospital === "function";
	const routeEtaLabel =
		(typeof hospital?.eta === "string" && hospital.eta.trim()) ||
		formatDurationSeconds(routeInfo?.durationSec) ||
		"Live route";
	const routeDistanceLabel =
		(typeof hospital?.distance === "string" && hospital.distance.trim()) ||
		formatDistanceMeters(routeInfo?.distanceMeters) ||
		null;
	const quickFacts = useMemo(
		() => statusItems.filter((item) => item.label !== "Distance").slice(0, 3),
		[statusItems],
	);

	useEffect(() => {
		if (!visible || !origin?.latitude || !origin?.longitude || !destination) {
			clearRoute();
			return undefined;
		}

		calculateRoute(origin, destination);
		return undefined;
	}, [
		calculateRoute,
		clearRoute,
		destination,
		origin?.latitude,
		origin?.longitude,
		visible,
	]);

	const handleUseHospital = useCallback(() => {
		onUseHospital?.(hospital);
		onClose?.();
	}, [hospital, onClose, onUseHospital]);

	const handleCallHospital = useCallback(async () => {
		if (!canCallHospital) return;
		const cleanPhone = hospital.phone.replace(/[^\d+]/g, "");
		if (!cleanPhone) return;
		await Linking.openURL(`tel:${cleanPhone}`);
	}, [canCallHospital, hospital?.phone]);

	const handleOpenDirections = useCallback(async () => {
		const url = buildDirectionsUrl(destination, hospital);
		if (!url) return;
		await Linking.openURL(url);
	}, [destination, hospital]);

	const handleBrowseHospitals = useCallback(() => {
		onClose?.();
		onOpenHospitals?.();
	}, [onClose, onOpenHospitals]);

	const dockAction = canUseHospital
		? { label: "Use hospital", onPress: handleUseHospital }
		: typeof onOpenHospitals === "function"
			? { label: "See all hospitals", onPress: handleBrowseHospitals }
			: destination
				? { label: "Open in Maps", onPress: handleOpenDirections }
				: { label: "Done", onPress: onClose };

	const collapsedAction = canUseHospital
		? { onPress: handleUseHospital, icon: "arrow-forward", accessibilityLabel: "Use hospital" }
		: typeof onOpenHospitals === "function"
			? { onPress: handleBrowseHospitals, icon: "arrow-forward", accessibilityLabel: "See all hospitals" }
			: destination
				? { onPress: handleOpenDirections, icon: "navigate-outline", accessibilityLabel: "Open directions" }
				: canCallHospital
					? { onPress: handleCallHospital, icon: "call-outline", accessibilityLabel: "Call hospital" }
					: { onPress: onClose, icon: "close", accessibilityLabel: "Close hospital" };

	const collapsedDistanceLabel = routeDistanceLabel
		? `${routeDistanceLabel} away`
		: summary.subtitle
			? `${summary.subtitle} away`
			: "Nearby";

	return {
		cardSurface,
		collapsedAction,
		collapsedDistanceLabel,
		quickFacts,
		routeCoordinates,
		routeInfo,
		isCalculatingRoute,
		routeEtaLabel,
		routeDistanceLabel,
		rowSurface,
		titleColor,
		subtleColor,
		heroBadges,
		featureList,
		roomRows,
		canCallHospital,
		destination,
		dockAction,
		handleBrowseHospitals,
		handleCallHospital,
		handleOpenDirections,
		handleUseHospital,
		hospital,
		isDarkMode,
		onClose,
		origin,
		summary: buildHospitalDetailSummary(hospital, routeInfo),
	};
}
