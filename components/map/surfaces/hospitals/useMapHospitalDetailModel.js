import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { COLORS } from "../../../../constants/colors";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useMapRoute } from "../../../../hooks/emergency/useMapRoute";
import { hospitalsService } from "../../../../services/hospitalsService";
import {
	buildAmbulanceServiceCards,
	buildDirectionsUrl,
	buildFeatureList,
	buildHeroBadges,
	buildHospitalDetailSummary,
	buildPhotoGallery,
	buildPlaceStats,
	buildRoomServiceCards,
	buildRoomRows,
	formatDistanceMeters,
	formatDurationSeconds,
	getDestinationCoordinate,
	normalizeTimeLabel,
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
	const [servicePricingRows, setServicePricingRows] = useState([]);
	const [hydratedRoomRows, setHydratedRoomRows] = useState([]);
	const [isLoadingServiceRails, setIsLoadingServiceRails] = useState(false);

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const subtleColor = isDarkMode ? "#94A3B8" : "#64748B";
	const cardSurface = isDarkMode ? "rgba(16,24,38,0.72)" : "rgba(255,255,255,0.66)";
	const rowSurface = isDarkMode ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.055)";
	const actionSurface = isDarkMode ? "rgba(134,16,14,0.16)" : "rgba(134,16,14,0.075)";
	const actionTint = isDarkMode ? "rgba(248,113,113,0.82)" : "rgba(134,16,14,0.72)";

	const destination = useMemo(() => getDestinationCoordinate(hospital), [hospital]);
	const heroBadges = useMemo(() => buildHeroBadges(hospital), [hospital]);
	const roomRows = useMemo(() => buildRoomRows(hospital), [hospital]);
	const featureList = useMemo(() => buildFeatureList(hospital), [hospital]);
	const galleryPhotos = useMemo(() => buildPhotoGallery(hospital), [hospital]);
	const placeStats = useMemo(() => buildPlaceStats(hospital, routeInfo), [hospital, routeInfo]);
	const summary = useMemo(
		() => buildHospitalDetailSummary(hospital, routeInfo),
		[hospital, routeInfo],
	);
	const canCallHospital =
		typeof hospital?.phone === "string" && hospital.phone.trim().length > 0;
	const canUseHospital = typeof onUseHospital === "function";
	const websiteUrl =
		(typeof hospital?.googleWebsite === "string" && hospital.googleWebsite.trim()) ||
		(typeof hospital?.google_website === "string" && hospital.google_website.trim()) ||
		(typeof hospital?.website === "string" && hospital.website.trim()) ||
		null;
	const canOpenWebsite = Boolean(websiteUrl);
	const routeEtaLabel =
		(typeof hospital?.eta === "string" && hospital.eta.trim()) ||
		formatDurationSeconds(routeInfo?.durationSec) ||
		"Live route";
	const arrivalLabel = normalizeTimeLabel(routeEtaLabel) || "Soon";
	const routeDistanceLabel =
		(typeof hospital?.distance === "string" && hospital.distance.trim()) ||
		formatDistanceMeters(routeInfo?.distanceMeters) ||
		null;

	useEffect(() => {
		let cancelled = false;
		const hospitalId = hospital?.id;
		if (!visible || !hospitalId) {
			setServicePricingRows([]);
			setHydratedRoomRows([]);
			setIsLoadingServiceRails(false);
			return () => {
				cancelled = true;
			};
		}

		setIsLoadingServiceRails(true);
		Promise.all([
			hospitalsService.getServicePricing(
				hospitalId,
				hospital?.organization_id || hospital?.organizationId,
			),
			hospitalsService.getRooms(hospitalId),
		])
			.then(([serviceRows, roomRows]) => {
				if (cancelled) return;
				setServicePricingRows(Array.isArray(serviceRows) ? serviceRows : []);
				setHydratedRoomRows(Array.isArray(roomRows) ? roomRows : []);
			})
			.catch(() => {
				if (cancelled) return;
				setServicePricingRows([]);
				setHydratedRoomRows([]);
			})
			.finally(() => {
				if (!cancelled) setIsLoadingServiceRails(false);
			});

		return () => {
			cancelled = true;
		};
	}, [
		hospital?.id,
		hospital?.organizationId,
		hospital?.organization_id,
		visible,
	]);
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

	const handleOpenWebsite = useCallback(async () => {
		if (!websiteUrl) return;
		const normalizedUrl = /^https?:\/\//i.test(websiteUrl)
			? websiteUrl
			: `https://${websiteUrl}`;
		try {
			await WebBrowser.openBrowserAsync(normalizedUrl, {
				controlsColor: COLORS.brandPrimary,
				enableBarCollapsing: true,
				showTitle: true,
				presentationStyle:
					WebBrowser.WebBrowserPresentationStyle?.PAGE_SHEET ??
					WebBrowser.WebBrowserPresentationStyle?.FORM_SHEET,
			});
		} catch {
			await Linking.openURL(normalizedUrl);
		}
	}, [websiteUrl]);

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

	const primaryTravelLabel = arrivalLabel;
	const placeActions = [
		{
			key: "arrival",
			label: primaryTravelLabel,
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
			onPress: canCallHospital ? handleCallHospital : undefined,
			disabled: !canCallHospital,
			accessibilityLabel: "Call hospital",
		},
		{
			key: "website",
			label: "Website",
			icon: "globe-outline",
			iconType: "ion",
			onPress: canOpenWebsite ? handleOpenWebsite : undefined,
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

	const roomServiceCards = useMemo(
		() =>
			buildRoomServiceCards(
				hospital,
				hydratedRoomRows.length > 0 ? hydratedRoomRows : roomRows,
				isLoadingServiceRails,
			),
		[hospital, hydratedRoomRows, isLoadingServiceRails, roomRows],
	);
	const ambulanceServiceCards = useMemo(
		() => buildAmbulanceServiceCards(hospital, servicePricingRows, isLoadingServiceRails),
		[hospital, isLoadingServiceRails, servicePricingRows],
	);

	const collapsedAction = canUseHospital
		? { onPress: handleUseHospital, icon: "ambulance", iconType: "material", accessibilityLabel: "Use hospital" }
		: destination
			? { onPress: handleOpenDirections, icon: "navigate-outline", accessibilityLabel: "Open directions" }
			: typeof onOpenHospitals === "function"
				? { onPress: handleBrowseHospitals, icon: "arrow-forward", accessibilityLabel: "See all hospitals" }
				: canCallHospital
					? { onPress: handleCallHospital, icon: "call-outline", accessibilityLabel: "Call hospital" }
					: { onPress: onClose, icon: "close", accessibilityLabel: "Close hospital" };

	const collapsedDistanceLabel = arrivalLabel
		? `${arrivalLabel} away`
		: routeDistanceLabel
			? `${routeDistanceLabel} away`
			: summary.subtitle
				? `${summary.subtitle} away`
				: "Nearby";

	return {
		cardSurface,
		actionSurface,
		actionTint,
		collapsedAction,
		collapsedDistanceLabel,
		galleryPhotos,
		placeActions,
		placeStats,
		roomServiceCards,
		ambulanceServiceCards,
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
		handleOpenWebsite,
		handleUseHospital,
		hospital,
		isDarkMode,
		onClose,
		origin,
		summary,
	};
}
