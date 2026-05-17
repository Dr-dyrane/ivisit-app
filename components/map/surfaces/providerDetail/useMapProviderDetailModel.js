// components/map/surfaces/providerDetail/useMapProviderDetailModel.js
//
// Model hook for PROVIDER_DETAIL sheet phase.
// Mirrors useMapHospitalDetailModel shape — returns a flat model object
// consumed by MapProviderDetailBody and the stage parts.

import { useCallback, useMemo } from "react";
import { Linking } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import {
	EXPLORE_CATEGORY_META,
	PROVIDER_TYPES,
} from "../../../../constants/providerTypes";
import { openRideToProvider } from "../../../../utils/bookRideUtils";

// ─── Theme ───────────────────────────────────────────────────────────────────

function getProviderDetailTheme(isDarkMode) {
	return {
		titleColor:   isDarkMode ? "#F8FAFC" : "#0F172A",
		subtleColor:  isDarkMode ? "#94A3B8" : "#64748B",
		cardSurface:  isDarkMode ? "rgba(8,15,27,0.92)" : "#FFFFFF",
		rowSurface:   isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)",
	};
}

function getActionSurface(tintColor, isDarkMode) {
	return isDarkMode ? `${tintColor}28` : `${tintColor}14`;
}

function getActionTint(tintColor, isDarkMode) {
	return isDarkMode ? `${tintColor}D0` : tintColor;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPrimaryActionLabel(providerType) {
	switch (providerType) {
		case PROVIDER_TYPES.PHARMACY:      return "Call pharmacy";
		case PROVIDER_TYPES.LAB:           return "Call lab";
		case PROVIDER_TYPES.RADIOLOGY:     return "Call centre";
		case PROVIDER_TYPES.URGENT_CARE:   return "Call urgent care";
		case PROVIDER_TYPES.MENTAL_HEALTH: return "Call clinic";
		case PROVIDER_TYPES.WOMENS_CARE:   return "Call clinic";
		case PROVIDER_TYPES.PEDIATRICS:    return "Call clinic";
		default:                           return "Call clinic";
	}
}

function buildDistanceLabel(distanceKm) {
	if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
	const rounded = Math.round(distanceKm * 10) / 10;
	return `${rounded} km away`;
}

function buildProviderSummary(provider, meta) {
	const name         = provider?.name ?? "Provider";
	const address      = provider?.address ?? null;
	const categoryLine = meta?.label ?? "Healthcare provider";
	const distanceKm   = provider?.distanceKm ?? null;
	const distLabel    = buildDistanceLabel(distanceKm);
	const contextLine  = distLabel ?? address ?? categoryLine;
	return { title: name, subtitle: categoryLine, addressLine: address, contextLine };
}

function buildProviderPlaceStats(provider, meta) {
	const stats = [];
	const distanceKm = provider?.distanceKm;
	const distLabel  = buildDistanceLabel(distanceKm);
	if (distLabel) stats.push({ label: "Distance", value: distLabel.replace(" away", ""), icon: "navigate", iconType: "ionicon", tone: "neutral" });
	const rating = provider?.rating > 0 ? Number(provider.rating).toFixed(1) : null;
	if (rating) stats.push({ label: "Rating", value: rating, icon: "star", iconType: "ionicon", tone: "rating" });
	const status = provider?.status ?? null;
	if (status) stats.push({ label: "Status", value: status === "available" ? "Open" : status, icon: null, tone: "neutral" });
	return stats;
}

function buildProviderHeroBadges(provider, meta) {
	const badges = [];
	const label = meta?.label;
	if (label) badges.push({ label, icon: meta?.iconName ?? "medical-bag", iconType: "material", tone: "neutral" });
	const status = provider?.status ?? null;
	if (status === "available") badges.push({ label: "Open", icon: "checkmark-circle", iconType: "ionicon", tone: "verified" });
	return badges;
}

function buildProviderCollapsedAction(provider, meta, onDirections) {
	const hasCoords = Number.isFinite(provider?.coordinates?.latitude);
	return {
		icon: hasCoords ? "directions" : meta?.iconName ?? "medical-bag",
		iconType: "material",
		label: hasCoords ? "Directions" : (meta?.label ?? "View"),
		primary: false,
		accessibilityLabel: hasCoords ? "Get directions to provider" : "View provider",
		onPress: hasCoords ? onDirections : undefined,
	};
}

// ─── Model hook ───────────────────────────────────────────────────────────────

export default function useMapProviderDetailModel({
	provider,
	userLocation,
	onClose,
}) {
	const { isDarkMode } = useTheme();

	const providerType = provider?.providerType ?? PROVIDER_TYPES.CLINIC;
	const meta         = EXPLORE_CATEGORY_META[providerType] ?? EXPLORE_CATEGORY_META[PROVIDER_TYPES.CLINIC];
	const tintColor    = meta?.markerTint ?? "#64748B";

	const { titleColor, subtleColor, cardSurface, rowSurface } = useMemo(
		() => getProviderDetailTheme(isDarkMode),
		[isDarkMode],
	);
	const actionSurface = useMemo(() => getActionSurface(tintColor, isDarkMode), [tintColor, isDarkMode]);
	const actionTint    = useMemo(() => getActionTint(tintColor, isDarkMode), [tintColor, isDarkMode]);

	const phone    = provider?.phone ?? null;
	const website  = provider?.googleWebsite ?? provider?.website ?? null;
	const address  = provider?.address ?? null;
	const hasCoords = Number.isFinite(provider?.coordinates?.latitude) &&
	                  Number.isFinite(provider?.coordinates?.longitude);

	const handleCall = useCallback(() => {
		if (!phone) return;
		Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`).catch(() => {});
	}, [phone]);

	const handleDirections = useCallback(() => {
		if (!hasCoords) return;
		const { latitude, longitude } = provider.coordinates;
		Linking.openURL(`https://maps.apple.com/?daddr=${latitude},${longitude}`).catch(() => {
			Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`).catch(() => {});
		});
	}, [hasCoords, provider?.coordinates]);

	const handleWebsite = useCallback(() => {
		if (!website) return;
		const url = website.startsWith("http") ? website : `https://${website}`;
		Linking.openURL(url).catch(() => {});
	}, [website]);

	const handleBookRide = useCallback(() => {
		openRideToProvider(provider, userLocation);
	}, [provider, userLocation]);

	const placeActions = useMemo(() => {
		const list = [];
		if (phone) list.push({
			key: "call", icon: "phone", iconType: "material",
			label: getPrimaryActionLabel(providerType),
			onPress: handleCall, primary: true,
			accessibilityLabel: "Call provider",
		});
		if (hasCoords) list.push({
			key: "ride", icon: "car", iconType: "material",
			label: "Book Ride", onPress: handleBookRide, primary: !phone,
			accessibilityLabel: "Book a ride to this provider",
		});
		if (hasCoords) list.push({
			key: "directions", icon: "directions", iconType: "material",
			label: "Directions", onPress: handleDirections, primary: false,
			accessibilityLabel: "Get directions",
		});
		if (website) list.push({
			key: "website", icon: "web", iconType: "material",
			label: "Website", onPress: handleWebsite, primary: false,
			accessibilityLabel: "Open website",
		});
		return list;
	}, [phone, hasCoords, website, providerType, handleCall, handleBookRide, handleDirections, handleWebsite]);

	const summary = useMemo(() => buildProviderSummary(provider, meta), [provider, meta]);
	const placeStats = useMemo(() => buildProviderPlaceStats(provider, meta), [provider, meta]);
	const heroBadges = useMemo(() => buildProviderHeroBadges(provider, meta), [provider, meta]);
	const collapsedAction = useMemo(() => buildProviderCollapsedAction(provider, meta, handleDirections), [provider, meta, handleDirections]);
	const collapsedDistanceLabel = useMemo(() => buildDistanceLabel(provider?.distanceKm) ?? (address ?? meta?.label ?? "Nearby"), [provider?.distanceKm, address, meta]);

	const infoRows = useMemo(() => {
		const rows = [];
		if (address) rows.push({ icon: "map-marker-outline", text: address });
		if (phone)   rows.push({ icon: "phone-outline",      text: phone,   onPress: handleCall });
		if (website) rows.push({ icon: "web",                text: website, onPress: handleWebsite });
		return rows;
	}, [address, phone, website, handleCall, handleWebsite]);

	return {
		// identity
		provider,
		providerType,
		meta,
		tintColor,
		// theme
		isDarkMode,
		titleColor,
		subtleColor,
		cardSurface,
		rowSurface,
		actionSurface,
		actionTint,
		// display
		summary,
		heroBadges,
		placeActions,
		placeStats,
		infoRows,
		// collapsed slot
		collapsedAction,
		collapsedDistanceLabel,
		// flags
		hasCoords,
		phone,
		address,
		website,
	};
}
