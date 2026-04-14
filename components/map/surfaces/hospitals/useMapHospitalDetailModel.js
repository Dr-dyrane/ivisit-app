import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useMapRoute } from "../../../../hooks/emergency/useMapRoute";
import { hospitalsService } from "../../../../services/hospitalsService";
import { getHospitalHeroSource, prefetchCachedRemoteImage } from "../../mapHospitalImage";
import {
	buildAmbulanceServiceCards,
	buildDirectionsUrl,
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
import {
	buildHospitalCollapsedAction,
	buildHospitalCollapsedDistanceLabel,
	buildHospitalDockAction,
	buildHospitalPlaceActions,
	getHospitalDetailTheme,
	getHospitalWebsiteBrowserOptions,
	getHospitalWebsiteUrl,
} from "./mapHospitalDetail.model";

export default function useMapHospitalDetailModel({
	visible,
	hospital,
	origin = null,
	onClose,
	onOpenHospitals,
	onUseHospital,
}) {
	const { isDarkMode } = useTheme();
	const { routeInfo, calculateRoute, clearRoute } = useMapRoute();
	const [servicePricingRows, setServicePricingRows] = useState([]);
	const [hydratedRoomRows, setHydratedRoomRows] = useState([]);
	const [isLoadingServiceRails, setIsLoadingServiceRails] = useState(false);

	const { titleColor, subtleColor, cardSurface, rowSurface, actionSurface, actionTint } =
		useMemo(() => getHospitalDetailTheme(isDarkMode), [isDarkMode]);

	const destination = useMemo(() => getDestinationCoordinate(hospital), [hospital]);
	const heroBadges = useMemo(() => buildHeroBadges(hospital), [hospital]);
	const roomRows = useMemo(() => buildRoomRows(hospital), [hospital]);
	const galleryPhotos = useMemo(() => buildPhotoGallery(hospital), [hospital]);
	const heroSource = useMemo(() => getHospitalHeroSource(hospital), [hospital]);
	const placeStats = useMemo(() => buildPlaceStats(hospital, routeInfo), [hospital, routeInfo]);
	const summary = useMemo(
		() => buildHospitalDetailSummary(hospital, routeInfo),
		[hospital, routeInfo],
	);
	const canCallHospital =
		typeof hospital?.phone === "string" && hospital.phone.trim().length > 0;
	const canUseHospital = typeof onUseHospital === "function";
	const websiteUrl = useMemo(() => getHospitalWebsiteUrl(hospital), [hospital]);
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
	useEffect(() => {
		if (!visible) return;
		const heroUri = typeof heroSource?.uri === "string" ? heroSource.uri : null;
		const uris = [heroUri, ...galleryPhotos].filter(
			(uri, index, items) =>
				typeof uri === "string" && uri.trim().length > 0 && items.indexOf(uri) === index,
		);

		uris.forEach((uri) => {
			prefetchCachedRemoteImage(uri, Image);
		});
	}, [galleryPhotos, heroSource, visible]);

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
				...getHospitalWebsiteBrowserOptions(),
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

	const dockAction = useMemo(
		() =>
			buildHospitalDockAction({
				canUseHospital,
				onUseHospital: handleUseHospital,
				onOpenHospitals: handleBrowseHospitals,
				destination,
				onOpenDirections: handleOpenDirections,
				onClose,
			}),
		[
			canUseHospital,
			handleBrowseHospitals,
			handleOpenDirections,
			handleUseHospital,
			destination,
			onClose,
		],
	);

	const placeActions = useMemo(
		() =>
			buildHospitalPlaceActions({
				arrivalLabel,
				dockAction,
				canCallHospital,
				onCallHospital: handleCallHospital,
				canOpenWebsite,
				onOpenWebsite: handleOpenWebsite,
			}),
		[
			arrivalLabel,
			canCallHospital,
			canOpenWebsite,
			dockAction,
			handleCallHospital,
			handleOpenWebsite,
		],
	);

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

	const collapsedAction = useMemo(
		() =>
			buildHospitalCollapsedAction({
				canUseHospital,
				onUseHospital: handleUseHospital,
				destination,
				onOpenDirections: handleOpenDirections,
				onOpenHospitals: handleBrowseHospitals,
				canCallHospital,
				onCallHospital: handleCallHospital,
				onClose,
			}),
		[
			canCallHospital,
			canUseHospital,
			handleBrowseHospitals,
			handleCallHospital,
			handleOpenDirections,
			handleUseHospital,
			destination,
			onClose,
		],
	);

	const collapsedDistanceLabel = useMemo(
		() =>
			buildHospitalCollapsedDistanceLabel({
				arrivalLabel,
				routeDistanceLabel,
				summarySubtitle: summary.subtitle,
			}),
		[arrivalLabel, routeDistanceLabel, summary.subtitle],
	);

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
		rowSurface,
		titleColor,
		subtleColor,
		heroBadges,
		hospital,
		isDarkMode,
		summary,
		onClose,
	};
}
