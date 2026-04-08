import React, { useEffect, useMemo } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMapRoute } from "../../../../../hooks/emergency/useMapRoute";
import EmergencyHospitalRoutePreview from "../../../intake/EmergencyHospitalRoutePreview";
import AmbulanceTierProductGraphic from "../../AmbulanceTierProductGraphic";
import { getAmbulanceVisualProfile } from "../../ambulanceTierVisuals";
import { useTheme } from "../../../../../contexts/ThemeContext";
import createEmergencyChooseResourceTheme from "./EmergencyChooseResourceStageBase.styles";
import { CHOOSE_RESOURCE_COPY, FLOW_STEPS } from "./EmergencyChooseResourceStageBase.content";

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

function toPlainServiceLabel(value, visualProfile) {
	const raw = String(value || "").trim();
	const lookup = raw.toLowerCase();

	if (/critical|icu|intensive|critical care|cct/.test(lookup)) {
		return "Critical care ambulance";
	}
	if (/advanced|als|cardiac|life support/.test(lookup)) {
		return "Ambulance with extra support";
	}
	if (/basic|bls|standard/.test(lookup)) {
		return "Standard ambulance";
	}
	if (!raw || /dispatch|ambulance/.test(lookup)) {
		return visualProfile.label || CHOOSE_RESOURCE_COPY.serviceFallback;
	}

	return raw;
}

function toPlainCrewLabel(value) {
	const raw = String(value || CHOOSE_RESOURCE_COPY.crewFallback).trim();
	const lookup = raw.toLowerCase();

	if (/critical/.test(lookup)) return "Critical care crew";
	if (/advanced|als/.test(lookup)) return "Medical crew with extra support";
	if (/paramedic|bls|basic/.test(lookup)) return "2-person medical crew";
	return raw;
}

export default function EmergencyChooseResourceStageBase({
	variant = "ios-mobile",
	requestColors,
	requestHospital,
	intakeDraft,
	primaryEtaText = CHOOSE_RESOURCE_COPY.etaFallback,
	formattedPaymentAmount,
	recommendedDispatchOption,
	triageCard,
	onOpenServiceDetails,
	selectFlowStep = "triage",
	onSelectFlowStepChange,
	hasSignedInUser = false,
	requesterLabel = "Account confirmed",
	onContinueWithGoogle,
	onAdvanceFlow,
	isSigningIn = false,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const { routeCoordinates, routeInfo, isCalculatingRoute, calculateRoute, clearRoute } = useMapRoute();
	const visualProfile = getAmbulanceVisualProfile(recommendedDispatchOption);
	const {
		tuning,
		surfaces: { heroGlassBackground, mapTintColors },
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
	const serviceLabel = toPlainServiceLabel(rawServiceLabel, visualProfile);
	const crewLabel = toPlainCrewLabel(recommendedDispatchOption?.crew);
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
	const summaryLine = [crewLabel, costLine].filter(Boolean).join(" • ");
	const flowCopy = CHOOSE_RESOURCE_COPY.flow[selectFlowStep] || CHOOSE_RESOURCE_COPY.flow.dispatch;
	const activeStepIndex = Math.max(0, FLOW_STEPS.indexOf(selectFlowStep));
	const stageHeight = Math.max(
		tuning.stageMinHeight,
		Math.min(windowHeight + insets.top + insets.bottom + 12, tuning.stageMaxHeight),
	);
	const mapHudTop = Math.max(12, insets.top + 78);
	const solidSheetBackground = isDarkMode ? "rgba(2,6,23,0.92)" : "rgba(243,246,250,0.92)";
	const sheetPanelBackground = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.78)";
	const sheetIconBackground = isDarkMode ? "rgba(255,255,255,0.09)" : "rgba(15,23,42,0.06)";
	const sheetHeight = Math.max(320, Math.min(Math.round(stageHeight * 0.5), 460));
	const fixedMapBottomPadding = Math.max(250, Math.round(sheetHeight * 1.12));
	const shouldShowPrimaryAction = selectFlowStep !== "triage";
	const primaryActionLabel =
		selectFlowStep === "identity"
			? hasSignedInUser
				? "Select payment"
				: isSigningIn
					? "Connecting..."
					: CHOOSE_RESOURCE_COPY.signInCta
			: selectFlowStep === "dispatch"
				? "Confirm and continue"
				: "Continue";
	const primaryActionIcon =
		selectFlowStep === "identity" && !hasSignedInUser ? "logo-google" : "arrow-forward";
	const primaryActionHandler =
		selectFlowStep === "identity" && !hasSignedInUser ? onContinueWithGoogle : onAdvanceFlow;

	return (
		<View style={[styles.shell, { gap: tuning.gap, maxWidth: tuning.maxWidth }]}>
			<View style={[styles.mapShell, { height: stageHeight }]}>
				<View style={[styles.flatMapStage, { height: stageHeight }]}>
					{showMapPreview ? (
						<EmergencyHospitalRoutePreview
							origin={originCoordinate}
							hospital={normalizedHospitalForMap}
							routeCoordinates={previewRouteCoordinates}
							routeInfo={routeInfo}
							isCalculatingRoute={isCalculatingRoute}
							bottomPadding={fixedMapBottomPadding}
							showLoadingBadge={false}
							visible
						/>
					) : null}

					<LinearGradient pointerEvents="none" colors={mapTintColors} style={styles.mapTint} />

					<View style={[styles.mapHud, { top: mapHudTop }]}> 
						<View style={[styles.mapHudPill, { backgroundColor: heroGlassBackground }]}> 
							<Ionicons name="checkmark-circle" size={13} color={visualProfile.accent} />
							<Text style={[styles.mapHudText, { color: requestColors.text }]} numberOfLines={1}>
								{CHOOSE_RESOURCE_COPY.selectedBadge}
							</Text>
						</View>
						<View style={[styles.mapHudPill, { backgroundColor: heroGlassBackground }]}> 
							<Ionicons name="time-outline" size={13} color={visualProfile.accent} />
							<Text style={[styles.mapHudText, { color: requestColors.text }]} numberOfLines={1}>
								{routeMetaLabel || CHOOSE_RESOURCE_COPY.routePreview}
							</Text>
						</View>
					</View>

					{!showMapPreview ? (
						<View style={styles.mapPlaceholder}>
							<Ionicons name="map-outline" size={18} color={visualProfile.accent} />
							<Text style={[styles.mapPlaceholderText, { color: requestColors.textMuted }]}>
								{CHOOSE_RESOURCE_COPY.mapPlaceholder}
							</Text>
						</View>
					) : null}
				</View>

				<View
					style={[
						styles.bottomSheet,
						{
							backgroundColor: solidSheetBackground,
							borderColor: requestColors.border,
							paddingTop: 12,
							paddingHorizontal: tuning.padding,
							paddingBottom: tuning.padding + Math.max(insets.bottom, 10),
							height: sheetHeight,
							minHeight: sheetHeight,
							maxHeight: sheetHeight,
						},
					]}
				>
					<View style={[styles.sheetHandle, { backgroundColor: requestColors.border }]} />
					<View
						style={[
							styles.sheetHeaderSurface,
							{ backgroundColor: sheetPanelBackground },
						]}
					>
						<View style={styles.sheetHeaderRow}>
							<View style={styles.sheetCopy}>
								<Text style={[styles.sheetEyebrow, { color: visualProfile.accent }]}>{flowCopy.eyebrow}</Text>
								<Text style={[styles.sheetTitle, { color: requestColors.text }]}>{flowCopy.title}</Text>
								{flowCopy.description ? (
									<Text style={[styles.sheetSubtitle, { color: requestColors.textMuted }]}>{flowCopy.description}</Text>
								) : null}
							</View>
						</View>
					</View>

					<View style={styles.sheetBody}>
						{selectFlowStep === "triage" ? triageCard : null}

						{selectFlowStep === "dispatch" ? (
							<Pressable
								onPress={() => onOpenServiceDetails?.(recommendedDispatchOption)}
								style={[
									styles.dispatchCard,
									{ backgroundColor: sheetPanelBackground },
								]}
							>
								<View style={styles.dispatchArtwork}>
									<AmbulanceTierProductGraphic
										type={recommendedDispatchOption}
										width={96}
										height={72}
										showBackdrop={false}
									/>
								</View>
								<View style={styles.dispatchCopy}>
									<Text style={[styles.dispatchTitle, { color: requestColors.text }]}>{serviceLabel}</Text>
									<Text style={[styles.dispatchEta, { color: requestColors.text }]}>{routeEtaLabel}</Text>
									<Text style={[styles.dispatchMeta, { color: requestColors.textMuted }]}>{summaryLine}</Text>
								</View>
								<View style={[styles.previewIconButton, { backgroundColor: sheetIconBackground }]}> 
									<Ionicons name="chevron-forward" size={15} color={visualProfile.accent} />
								</View>
							</Pressable>
						) : null}

						{selectFlowStep === "route" ? (
							<View
								style={[
									styles.routeDetailsSurface,
									{ backgroundColor: sheetPanelBackground },
								]}
							>
								<View style={styles.routeHeaderInline}>
									<Text style={[styles.routeHeaderTitle, { color: requestColors.text }]}>{CHOOSE_RESOURCE_COPY.routeTitle}</Text>
									<Text style={[styles.routeHeaderMeta, { color: requestColors.textMuted }]}>{routeMetaLabel || CHOOSE_RESOURCE_COPY.routePreview}</Text>
								</View>

								<View style={styles.addressStack}>
									<View style={styles.addressRow}>
										<View style={[styles.addressIconWrap, { backgroundColor: sheetIconBackground }]}> 
											<Ionicons name="navigate" size={14} color={visualProfile.accent} />
										</View>
										<View style={styles.addressCopy}>
											<Text style={[styles.addressLabel, { color: requestColors.textMuted }]}>{CHOOSE_RESOURCE_COPY.pickupLabel}</Text>
											<Text style={[styles.addressValue, { color: requestColors.text }]}>{pickupLine}</Text>
										</View>
									</View>
									<View style={styles.addressRow}>
										<View style={[styles.addressIconWrap, { backgroundColor: sheetIconBackground }]}> 
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
						) : null}

						{selectFlowStep === "identity" ? (
							<View
								style={[
									styles.identityCard,
									{ backgroundColor: sheetPanelBackground },
								]}
							>
								<View style={styles.addressRow}>
									<View style={[styles.addressIconWrap, { backgroundColor: sheetIconBackground }]}> 
										<Ionicons
											name={hasSignedInUser ? "checkmark-circle" : "logo-google"}
											size={14}
											color={visualProfile.accent}
										/>
									</View>
									<View style={styles.addressCopy}>
										<Text style={[styles.addressLabel, { color: requestColors.textMuted }]}>
											{hasSignedInUser ? CHOOSE_RESOURCE_COPY.signedInLabel : CHOOSE_RESOURCE_COPY.signInCta}
										</Text>
										<Text style={[styles.addressValue, { color: requestColors.text }]}>
											{hasSignedInUser ? requesterLabel : "Use Google so the hospital can identify the requester."}
										</Text>
										<Text style={[styles.addressSubvalue, { color: requestColors.textMuted }]}>
											{hasSignedInUser ? "You’ll choose payment next." : CHOOSE_RESOURCE_COPY.signInHelp}
										</Text>
									</View>
								</View>
							</View>
						) : null}
					</View>

					<View style={styles.sheetFooter}>
						{shouldShowPrimaryAction ? (
							<Pressable
								onPress={primaryActionHandler}
								disabled={!primaryActionHandler || isSigningIn}
								style={[
									styles.primaryActionButton,
									{
										backgroundColor: visualProfile.accent,
										opacity: !primaryActionHandler || isSigningIn ? 0.6 : 1,
									},
								]}
							>
								<Text style={styles.primaryActionText}>{primaryActionLabel}</Text>
								<Ionicons name={primaryActionIcon} size={16} color="#FFFFFF" />
							</Pressable>
						) : null}

						<View style={styles.progressRow}>
							{FLOW_STEPS.map((step, index) => (
								<Pressable
									key={step}
									hitSlop={8}
									onPress={() => onSelectFlowStepChange?.(step)}
									style={styles.progressButton}
								>
									<View
										style={[
											styles.progressDot,
											{ backgroundColor: visualProfile.accent },
											index === activeStepIndex ? styles.progressDotActive : null,
										]}
									/>
								</Pressable>
							))}
						</View>
					</View>
				</View>
			</View>
		</View>
	);
}


