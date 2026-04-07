import React, { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMapRoute } from "../../../../../hooks/emergency/useMapRoute";
import EmergencyHospitalRoutePreview from "../../../intake/EmergencyHospitalRoutePreview";
import AmbulanceTierProductGraphic from "../../AmbulanceTierProductGraphic";
import { getAmbulanceTierKey, getAmbulanceVisualProfile } from "../../ambulanceTierVisuals";
import { useTheme } from "../../../../../contexts/ThemeContext";
import createEmergencyChooseResourceTheme from "./EmergencyChooseResourceStageBase.styles";
import { CHOOSE_RESOURCE_COPY, TIER_ORDER } from "./EmergencyChooseResourceStageBase.content";

function normalizeEtaLabel(value) {
	const text = String(value || CHOOSE_RESOURCE_COPY.etaFallback).trim();
	return text.replace(/mins\b/i, "min");
}

function toCoordinate(source) {
	if (!source || typeof source !== "object") return null;

	const geoPair = Array.isArray(source?.coordinates?.coordinates)
		? source.coordinates.coordinates
		: Array.isArray(source?.geometry?.coordinates)
			? source.geometry.coordinates
			: null;
	const latitude = Number(
		source.latitude ??
			source.lat ??
			source?.coords?.latitude ??
			source?.coordinates?.latitude ??
			(geoPair ? geoPair[1] : NaN),
	);
	const longitude = Number(
		source.longitude ??
			source.lng ??
			source.lon ??
			source?.coords?.longitude ??
			source?.coordinates?.longitude ??
			(geoPair ? geoPair[0] : NaN),
	);

	if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
		return { latitude, longitude };
	}

	return null;
}

function formatRouteDuration(routeInfo, fallbackText) {
	const durationSec = Number(routeInfo?.durationSec);
	if (Number.isFinite(durationSec) && durationSec > 0) {
		const minutes = Math.max(1, Math.round(durationSec / 60));
		return `${minutes} min away`;
	}
	return normalizeEtaLabel(fallbackText);
}

function formatRouteDistance(routeInfo) {
	const distanceMeters = Number(routeInfo?.distanceMeters);
	if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return null;
	const km = distanceMeters / 1000;
	return `${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km`;
}

export default function EmergencyChooseResourceStageBase({
	variant = "ios-mobile",
	requestColors,
	requestHospital,
	intakeDraft,
	primaryEtaText = CHOOSE_RESOURCE_COPY.etaFallback,
	formattedPaymentAmount,
	recommendedDispatchOption,
	availableDispatchOptions = [],
	selectedDispatchOptionId = null,
	triageCard,
	onOpenServiceDetails,
	onSelectDispatchOption,
}) {
	const { isDarkMode } = useTheme();
	const { routeCoordinates, routeInfo, isCalculatingRoute, calculateRoute, clearRoute } = useMapRoute();
	const visualProfile = getAmbulanceVisualProfile(recommendedDispatchOption);
	const {
		tuning,
		showExpandedContext,
		showCompactRowLayout,
		surfaces: {
			heroArtworkBackground,
			heroOverlayColors,
			heroGlassBackground,
			tierBaseSurface,
			tierSelectedSurface,
			tierUnavailableSurface,
			mapTintColors,
		},
		styles,
	} = useMemo(
		() =>
			createEmergencyChooseResourceTheme({
				variant,
				isDarkMode,
				accent: visualProfile.accent,
			}),
		[variant, isDarkMode, visualProfile.accent],
	);
	const rawServiceLabel =
		recommendedDispatchOption?.name ||
		recommendedDispatchOption?.service_name ||
		recommendedDispatchOption?.title ||
		"";
	const serviceLabel = /dispatch/i.test(rawServiceLabel)
		? visualProfile.label
		: rawServiceLabel || visualProfile.label || CHOOSE_RESOURCE_COPY.serviceFallback;
	const crewLabel = recommendedDispatchOption?.crew || CHOOSE_RESOURCE_COPY.crewFallback;
	const pickupLine =
		typeof intakeDraft?.locationLabel === "string" && intakeDraft.locationLabel.trim().length > 0
			? intakeDraft.locationLabel.trim()
			: typeof requestHospital?.address === "string" && requestHospital.address.trim().length > 0
				? requestHospital.address.trim()
				: CHOOSE_RESOURCE_COPY.locationConfirmed;
	const costLine = formattedPaymentAmount || recommendedDispatchOption?.price || CHOOSE_RESOURCE_COPY.priceFallback;
	const facilityLine = requestHospital?.name || CHOOSE_RESOURCE_COPY.facilityFallback;
	const facilityAddress =
		typeof requestHospital?.address === "string" && requestHospital.address.trim().length > 0
			? requestHospital.address.trim()
			: facilityLine;
	const originCoordinate = useMemo(
		() => toCoordinate(intakeDraft?.patientLocation || intakeDraft?.location || intakeDraft?.selectedLocation),
		[intakeDraft],
	);
	const hospitalCoordinate = useMemo(() => toCoordinate(requestHospital), [requestHospital]);
	const normalizedHospitalForMap = useMemo(
		() =>
			hospitalCoordinate
				? {
					...requestHospital,
					latitude: hospitalCoordinate.latitude,
					longitude: hospitalCoordinate.longitude,
				}
				: requestHospital,
		[hospitalCoordinate, requestHospital],
	);
	const selectedOptionId = selectedDispatchOptionId || recommendedDispatchOption?.id || null;

	useEffect(() => {
		if (originCoordinate && hospitalCoordinate) {
			calculateRoute(originCoordinate, hospitalCoordinate);
			return;
		}
		clearRoute();
	}, [
		calculateRoute,
		clearRoute,
		hospitalCoordinate?.latitude,
		hospitalCoordinate?.longitude,
		originCoordinate?.latitude,
		originCoordinate?.longitude,
	]);

	const previewRouteCoordinates = useMemo(() => {
		if (routeCoordinates.length >= 2) return routeCoordinates;
		return [originCoordinate, hospitalCoordinate].filter(Boolean);
	}, [hospitalCoordinate, originCoordinate, routeCoordinates]);
	const showMapPreview = previewRouteCoordinates.length > 0;
	const routeEtaLabel = formatRouteDuration(routeInfo, primaryEtaText);
	const routeDistanceLabel = formatRouteDistance(routeInfo);
	const routeMetaLabel = [routeEtaLabel, routeDistanceLabel].filter(Boolean).join(" • ");
	const summaryLine = [crewLabel, costLine, routeDistanceLabel].filter(Boolean).join(" • ");
	const tierCards = useMemo(
		() =>
			TIER_ORDER.map((key) => {
				const service = availableDispatchOptions.find((option) => getAmbulanceTierKey(option) === key) || null;
				const meta = getAmbulanceVisualProfile(service || { id: key, title: key });
				return {
					key,
					meta,
					service,
					available: Boolean(service),
					selected: service ? service.id === selectedOptionId : visualProfile.key === key,
				};
			}),
		[availableDispatchOptions, selectedOptionId, visualProfile.key],
	);

	return (
		<View style={[styles.shell, { gap: tuning.gap, maxWidth: tuning.maxWidth }]}>
			<View
				style={[
					styles.primarySurface,
					{
						backgroundColor: requestColors.card,
						paddingHorizontal: tuning.padding,
						paddingTop: tuning.padding,
						paddingBottom: Math.max(8, tuning.padding - 2),
					},
				]}
			>
				<Pressable
					onPress={() => onOpenServiceDetails?.(recommendedDispatchOption)}
					style={({ pressed }) => [
						styles.previewHeroCard,
						{ minHeight: showCompactRowLayout ? 196 : 184 },
						pressed ? { opacity: 0.97 } : null,
					]}
				>
					<View
						style={[
							styles.previewHeroArtwork,
							{
								backgroundColor: heroArtworkBackground,
							},
						]}
					>
						<AmbulanceTierProductGraphic
							type={recommendedDispatchOption}
							width={showExpandedContext ? 282 : showCompactRowLayout ? 230 : 214}
							height={showExpandedContext ? 170 : showCompactRowLayout ? 138 : 124}
							showBackdrop={false}
						/>
					</View>

					<LinearGradient
						pointerEvents="none"
						colors={heroOverlayColors}
						start={{ x: 0, y: 0.15 }}
						end={{ x: 1, y: 0.8 }}
						style={styles.previewOverlayGradient}
					/>

					<View style={styles.previewOverlayContent}>
						<View style={styles.previewHeaderRow}>
							<View
								style={[
									styles.previewBadge,
									{
										backgroundColor: heroGlassBackground,
									},
								]}
							>
								<Text style={[styles.previewBadgeText, { color: visualProfile.accent }]}>{CHOOSE_RESOURCE_COPY.selectedBadge}</Text>
							</View>
							<View
								style={[
									styles.previewIconButton,
									{
										backgroundColor: heroGlassBackground,
									},
								]}
							>
								<Ionicons name="chevron-forward" size={15} color={visualProfile.accent} />
							</View>
						</View>

						<View style={styles.previewInfoStack}>
							<Text style={[styles.previewTitle, { color: requestColors.text }]} numberOfLines={2}>
								{serviceLabel}
							</Text>
							<Text style={[styles.previewEta, { color: requestColors.text }]} numberOfLines={2}>
								{routeEtaLabel}
							</Text>
							<Text style={[styles.previewSummaryText, { color: requestColors.textMuted }]} numberOfLines={2}>
								{summaryLine}
							</Text>
						</View>
					</View>
				</Pressable>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					decelerationRate="fast"
					snapToInterval={200}
					snapToAlignment="start"
					onMomentumScrollEnd={(event) => {
						const nextIndex = Math.round((event?.nativeEvent?.contentOffset?.x || 0) / 200);
						const nextTier = tierCards[nextIndex];
						if (nextTier?.available && nextTier.service?.id !== selectedOptionId) {
							onSelectDispatchOption?.(nextTier.service);
						}
					}}
					contentContainerStyle={styles.tierRailContent}
					style={styles.tierRailScroll}
				>
					{tierCards.map((item) => (
						<Pressable
							key={item.key}
							disabled={!item.available}
							onPress={() => item.available && onSelectDispatchOption?.(item.service)}
							style={[
								styles.tierCard,
								{
									backgroundColor: item.selected
										? tierSelectedSurface
										: item.available
											? tierBaseSurface
											: tierUnavailableSurface,
								},
								!item.available ? styles.tierCardUnavailable : null,
							]}
						>
							<View style={styles.tierCardHeader}>
								<Text style={[styles.tierChip, { color: item.meta.accent }]}>{item.meta.shortLabel || item.meta.label}</Text>
								{item.selected ? <Ionicons name="checkmark-circle" size={16} color={item.meta.accent} /> : null}
							</View>
							<Text style={[styles.tierCardTitle, { color: requestColors.text }]}>{item.meta.label}</Text>
							<Text style={[styles.tierCardSubtitle, { color: requestColors.textMuted }]} numberOfLines={2}>
								{item.available ? item.meta.marketingLine : CHOOSE_RESOURCE_COPY.unavailableAtHospital}
							</Text>
						</Pressable>
					))}
				</ScrollView>
			</View>

			<View style={[styles.routeDetailsSurface, { backgroundColor: requestColors.card, padding: tuning.padding }]}>
				<View style={styles.routeHeaderInline}>
					<Text style={[styles.routeHeaderTitle, { color: requestColors.text }]}>{CHOOSE_RESOURCE_COPY.routeTitle}</Text>
					<Text style={[styles.routeHeaderMeta, { color: requestColors.textMuted }]}>{routeMetaLabel || CHOOSE_RESOURCE_COPY.routePreview}</Text>
				</View>

				<View style={styles.addressStack}>
					<View style={styles.addressRow}>
						<View style={[styles.addressIconWrap, { backgroundColor: `${visualProfile.accent}18` }]}>
							<Ionicons name="navigate" size={14} color={visualProfile.accent} />
						</View>
						<View style={styles.addressCopy}>
							<Text style={[styles.addressLabel, { color: requestColors.textMuted }]}>{CHOOSE_RESOURCE_COPY.pickupLabel}</Text>
							<Text style={[styles.addressValue, { color: requestColors.text }]}>{pickupLine}</Text>
						</View>
					</View>
					<View style={styles.addressRow}>
						<View style={[styles.addressIconWrap, { backgroundColor: `${visualProfile.accent}18` }]}>
							<Ionicons name="medical-outline" size={14} color={visualProfile.accent} />
						</View>
						<View style={styles.addressCopy}>
							<Text style={[styles.addressLabel, { color: requestColors.textMuted }]}>{CHOOSE_RESOURCE_COPY.hospitalLabel}</Text>
							<Text style={[styles.addressValue, { color: requestColors.text }]}>{facilityLine}</Text>
							<Text style={[styles.addressSubvalue, { color: requestColors.textMuted }]}>{facilityAddress}</Text>
						</View>
					</View>
				</View>
			</View>

			<View style={[styles.flatMapStage, { height: tuning.routeHeight }]}>
				{showMapPreview ? (
					<EmergencyHospitalRoutePreview
						origin={originCoordinate}
						hospital={normalizedHospitalForMap}
						routeCoordinates={previewRouteCoordinates}
						routeInfo={routeInfo}
						isCalculatingRoute={isCalculatingRoute}
						bottomPadding={16}
						showLoadingBadge={false}
						visible
					/>
				) : null}
				<LinearGradient
					pointerEvents="none"
					colors={mapTintColors}
					style={styles.mapTint}
				/>
				{!showMapPreview ? (
					<View style={styles.mapPlaceholder}>
						<Ionicons name="map-outline" size={18} color={visualProfile.accent} />
						<Text style={[styles.mapPlaceholderText, { color: requestColors.textMuted }]}>{CHOOSE_RESOURCE_COPY.mapPlaceholder}</Text>
					</View>
				) : null}
			</View>

			{triageCard}
		</View>
	);
}


