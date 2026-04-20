import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useEmergency } from "../../../../contexts/EmergencyContext";
import { formatDistanceMeters } from "../../surfaces/hospitals/mapHospitalDetail.helpers";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useMapStageResponsiveMetrics from "../shared/useMapStageResponsiveMetrics";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import { useTripProgress } from "../../../../hooks/emergency/useTripProgress";
import { useBedBookingProgress } from "../../../../hooks/emergency/useBedBookingProgress";
import TriageIntakeModal from "../../../emergency/triage/TriageIntakeModal";
import styles from "./mapTracking.styles";

function formatClockArrival(remainingSeconds, nowMs = Date.now()) {
	if (!Number.isFinite(remainingSeconds)) return "--";
	const arrivalDate = new Date(nowMs + remainingSeconds * 1000);
	return arrivalDate.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatRemainingShort(remainingSeconds) {
	if (!Number.isFinite(remainingSeconds)) return "--";
	const minutes = Math.max(1, Math.ceil(remainingSeconds / 60));
	return `${minutes} min`;
}

function formatHospitalDistanceLabel(hospital) {
	if (typeof hospital?.distance === "string" && hospital.distance.trim()) {
		return hospital.distance.trim();
	}

	const distanceKm = Number(hospital?.distanceKm);
	if (Number.isFinite(distanceKm) && distanceKm > 0) {
		return distanceKm < 1
			? `${Math.round(distanceKm * 1000)} m`
			: `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
	}

	return "--";
}

function resolveDistanceLabel(routeInfo, hospital) {
	if (Number.isFinite(routeInfo?.distanceMeters) && routeInfo.distanceMeters > 0) {
		return formatDistanceMeters(routeInfo.distanceMeters) || "--";
	}
	return formatHospitalDistanceLabel(hospital);
}

function resolveHospitalPhone(hospital) {
	const source =
		hospital?.phone ||
		hospital?.phone_number ||
		hospital?.phoneNumber ||
		null;
	if (typeof source !== "string" || !source.trim()) return null;
	const normalized = source.replace(/[^\d+]/g, "");
	return normalized || null;
}

function resolveHospitalAddress(hospital) {
	return (
		hospital?.formattedAddress ||
		hospital?.address ||
		hospital?.full_address ||
		[hospital?.street, hospital?.city, hospital?.state]
			.filter(Boolean)
			.join(", ") ||
		""
	);
}

function getTrackingTone(telemetryHealth, kind, status) {
	if (kind === "ambulance") {
		const telemetryState = telemetryHealth?.state ?? "inactive";
		if (telemetryState === "lost") return "critical";
		if (telemetryState === "stale") return "warning";
		if (status === "arrived") return "success";
		return "live";
	}
	if (kind === "bed") {
		return status === "arrived" ? "success" : "live";
	}
	return "neutral";
}

function getToneColors({ tone, isDarkMode }) {
	switch (tone) {
		case "critical":
			return {
				surface: isDarkMode ? "rgba(127,29,29,0.32)" : "rgba(254,226,226,0.92)",
				text: isDarkMode ? "#FECACA" : "#991B1B",
				icon: isDarkMode ? "#FCA5A5" : "#B91C1C",
			};
		case "warning":
			return {
				surface: isDarkMode ? "rgba(120,53,15,0.30)" : "rgba(254,243,199,0.94)",
				text: isDarkMode ? "#FDE68A" : "#92400E",
				icon: isDarkMode ? "#FBBF24" : "#B45309",
			};
		case "success":
			return {
				surface: isDarkMode ? "rgba(20,83,45,0.34)" : "rgba(220,252,231,0.95)",
				text: isDarkMode ? "#BBF7D0" : "#166534",
				icon: isDarkMode ? "#4ADE80" : "#16A34A",
			};
		case "live":
			return {
				surface: isDarkMode ? "rgba(29,78,216,0.28)" : "rgba(219,234,254,0.92)",
				text: isDarkMode ? "#DBEAFE" : "#1D4ED8",
				icon: isDarkMode ? "#93C5FD" : "#2563EB",
			};
		default:
			return {
				surface: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.86)",
				text: isDarkMode ? "#E2E8F0" : "#334155",
				icon: isDarkMode ? "#CBD5E1" : "#475569",
			};
	}
}

function TrackingMetric({ label, value, titleColor, mutedColor, metricStyle }) {
	return (
		<View style={[styles.metricCell, metricStyle]}>
			<Text style={[styles.metricLabel, { color: mutedColor }]}>{label}</Text>
			<Text numberOfLines={1} style={[styles.metricValue, { color: titleColor }]}>
				{value}
			</Text>
		</View>
	);
}

function TrackingUtilityButton({
	action,
	backgroundColor,
	iconColor,
	labelColor,
}) {
	return (
		<Pressable
			onPress={action.onPress}
			style={({ pressed }) => [
				styles.utilityButton,
				{ backgroundColor },
				pressed ? styles.utilityButtonPressed : null,
			]}
		>
			<Ionicons name={action.iconName} size={16} color={iconColor} />
			<Text style={[styles.utilityLabel, { color: labelColor }]}>
				{action.label}
			</Text>
		</Pressable>
	);
}

export default function MapTrackingStageBase({
	sheetHeight,
	snapState,
	hospital,
	payload = null,
	currentLocation = null,
	routeInfo = null,
	onSnapStateChange,
}) {
	const { isDarkMode } = useTheme();
	const {
		hospitals = [],
		allHospitals = [],
		activeAmbulanceTrip,
		ambulanceTelemetryHealth,
		activeBedBooking,
		pendingApproval,
	} = useEmergency();
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const stageMetrics = useMapStageResponsiveMetrics({ presentationMode });
	const [triageVisible, setTriageVisible] = useState(false);
	const [nowMs, setNowMs] = useState(Date.now());

	useEffect(() => {
		setNowMs(Date.now());
		const intervalId = setInterval(() => {
			setNowMs(Date.now());
		}, 1000);
		return () => clearInterval(intervalId);
	}, []);

	const allKnownHospitals =
		Array.isArray(allHospitals) && allHospitals.length > 0 ? allHospitals : hospitals;
	const trackedHospitalId =
		activeAmbulanceTrip?.hospitalId ||
		activeBedBooking?.hospitalId ||
		pendingApproval?.hospitalId ||
		payload?.hospital?.id ||
		hospital?.id ||
		null;
	const resolvedHospital =
		hospital ||
		payload?.hospital ||
		allKnownHospitals.find((entry) => entry?.id === trackedHospitalId) ||
		null;
	const hospitalName =
		resolvedHospital?.name ||
		activeAmbulanceTrip?.hospitalName ||
		activeBedBooking?.hospitalName ||
		pendingApproval?.hospitalName ||
		"Hospital";
	const hospitalAddress = resolveHospitalAddress(resolvedHospital);
	const pickupLabel = currentLocation?.primaryText || "My location";
	const pickupDetail =
		currentLocation?.secondaryText ||
		currentLocation?.formattedAddress ||
		"";
	const hospitalPhone = resolveHospitalPhone(resolvedHospital);

	const {
		remainingSeconds: ambulanceRemainingSeconds,
		computedStatus: ambulanceComputedStatus,
	} = useTripProgress({
		activeAmbulanceTrip,
		nowMs,
	});
	const {
		remainingBedSeconds,
		bedStatus,
	} = useBedBookingProgress({
		activeBedBooking,
		nowMs,
	});

	const trackingKind = activeAmbulanceTrip?.requestId
		? "ambulance"
		: activeBedBooking?.requestId
			? "bed"
			: pendingApproval?.requestId
				? "pending"
				: "idle";
	const resolvedStatus = String(
		(activeAmbulanceTrip?.status ||
			activeBedBooking?.status ||
			pendingApproval?.status ||
			"").toLowerCase(),
	);
	const canToggleSnapState =
		presentationMode === "sheet" &&
		(snapState === MAP_SHEET_SNAP_STATES.HALF ||
			snapState === MAP_SHEET_SNAP_STATES.EXPANDED);
	const effectiveSnapState =
		presentationMode === "sheet"
			? snapState
			: MAP_SHEET_SNAP_STATES.EXPANDED;

	const allowedSnapStates = useMemo(
		() =>
			presentationMode === "sheet"
				? [MAP_SHEET_SNAP_STATES.HALF, MAP_SHEET_SNAP_STATES.EXPANDED]
				: [MAP_SHEET_SNAP_STATES.EXPANDED],
		[presentationMode],
	);
	const {
		allowScrollDetents,
		bodyScrollEnabled,
		bodyScrollRef,
		handleBodyScroll,
		handleBodyScrollBeginDrag,
		handleBodyScrollEndDrag,
		handleBodyWheel,
	} = useMapSheetDetents({
		snapState: effectiveSnapState,
		onSnapStateChange,
		presentationMode,
		allowedSnapStates,
	});
	const {
		androidExpandedBodyGesture,
		androidExpandedBodyStyle,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
	} = useMapAndroidExpandedCollapse({
		snapState: effectiveSnapState,
		onSnapStateChange,
		bodyScrollRef,
		onScroll: handleBodyScroll,
		onScrollBeginDrag: handleBodyScrollBeginDrag,
	});
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;

	const remainingSeconds =
		trackingKind === "ambulance"
			? Number.isFinite(ambulanceRemainingSeconds)
				? ambulanceRemainingSeconds
				: routeInfo?.durationSec ?? null
			: trackingKind === "bed"
				? Number.isFinite(remainingBedSeconds)
					? remainingBedSeconds
					: routeInfo?.durationSec ?? null
				: routeInfo?.durationSec ?? null;
	const arrivalLabel =
		trackingKind === "pending"
			? "Pending"
			: formatClockArrival(remainingSeconds, nowMs);
	const etaLabel =
		trackingKind === "pending"
			? "Pending"
			: formatRemainingShort(remainingSeconds);
	const distanceLabel = resolveDistanceLabel(routeInfo, resolvedHospital);
	const serviceLabel =
		trackingKind === "ambulance"
			? activeAmbulanceTrip?.ambulanceType || "Transport"
			: trackingKind === "bed"
				? activeBedBooking?.bedType || "Admission"
				: pendingApproval?.serviceType === "bed"
					? pendingApproval?.bedType || "Admission"
					: pendingApproval?.ambulanceType || "Transport";
	const requestLabel =
		pendingApproval?.displayId ||
		activeAmbulanceTrip?.requestId ||
		activeBedBooking?.requestId ||
		pendingApproval?.requestId ||
		"";
	const telemetryLabel =
		ambulanceTelemetryHealth?.state === "lost"
			? "Tracking lost"
			: ambulanceTelemetryHealth?.state === "stale"
				? "Tracking delayed"
				: trackingKind === "ambulance"
					? ambulanceComputedStatus
					: trackingKind === "bed"
						? bedStatus
						: "Awaiting approval";
	const trackingTone = getTrackingTone(
		ambulanceTelemetryHealth,
		trackingKind,
		resolvedStatus,
	);
	const toneColors = getToneColors({ tone: trackingTone, isDarkMode });
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "rgba(226,232,240,0.78)" : "#64748B";
	const surfaceColor = isDarkMode ? "rgba(15,23,42,0.74)" : "rgba(255,255,255,0.88)";
	const elevatedSurfaceColor = isDarkMode
		? "rgba(8,15,27,0.88)"
		: "rgba(255,255,255,0.96)";
	const dividerColor = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
	const routeGradientColors = isDarkMode
		? ["rgba(255,255,255,0.04)", "rgba(255,255,255,0.00)", "rgba(255,255,255,0.02)"]
		: ["rgba(15,23,42,0.02)", "rgba(15,23,42,0.00)", "rgba(15,23,42,0.03)"];
	const detailGradientColors = isDarkMode
		? ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"]
		: ["rgba(248,250,252,0.92)", "rgba(255,255,255,0.82)"];
	const routeFadeColors = isDarkMode
		? ["rgba(15,23,42,0.00)", "rgba(15,23,42,0.92)"]
		: ["rgba(255,255,255,0.00)", "rgba(255,255,255,0.98)"];
	const utilitySurfaceColor = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(255,255,255,0.9)";
	const metricsSurfaceColor = isDarkMode
		? "rgba(8,15,27,0.88)"
		: "rgba(255,255,255,0.94)";
	const metricsAccentSurface = isDarkMode
		? "rgba(134,16,14,0.16)"
		: "rgba(134,16,14,0.08)";
	const stopIconSurface = isDarkMode
		? "rgba(255,255,255,0.07)"
		: "rgba(248,250,252,0.92)";
	const requestSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(255,255,255,0.88)";
	const connectorColor = isDarkMode
		? "rgba(255,255,255,0.12)"
		: "rgba(15,23,42,0.10)";

	const metricsCardStyle = stageMetrics?.route?.cardStyle || null;
	const detailCardRadius = stageMetrics?.panel?.cardStyle?.borderRadius || 26;
	const routeCardRadius = stageMetrics?.route?.cardStyle?.borderRadius || 28;

	const handleSheetToggle = useCallback(() => {
		if (!canToggleSnapState || typeof onSnapStateChange !== "function") return;
		onSnapStateChange(
			effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED
				? MAP_SHEET_SNAP_STATES.HALF
				: MAP_SHEET_SNAP_STATES.EXPANDED,
		);
	}, [canToggleSnapState, effectiveSnapState, onSnapStateChange]);

	const handleCallHospital = useCallback(async () => {
		if (!hospitalPhone) return;
		const target = `tel:${hospitalPhone}`;
		try {
			await Linking.openURL(target);
		} catch (_error) {
			// Ignore failed call handoff.
		}
	}, [hospitalPhone]);

	const utilityActions = useMemo(() => {
		const actions = [];
		if (hospitalPhone) {
			actions.push({
				key: "call",
				label: "Call hospital",
				iconName: "call-outline",
				onPress: handleCallHospital,
			});
		}
		if (pendingApproval?.requestId) {
			actions.push({
				key: "triage",
				label: "Continue intake",
				iconName: "chatbubble-ellipses-outline",
				onPress: () => setTriageVisible(true),
			});
		}
		return actions;
	}, [handleCallHospital, hospitalPhone, pendingApproval?.requestId]);

	const detailRows = useMemo(() => {
		if (trackingKind === "idle") return [];
		return [
			{ label: "Service", value: serviceLabel },
			{ label: "Request", value: requestLabel || "Active" },
			{
				label: "Status",
				value:
					trackingKind === "ambulance"
						? telemetryLabel
						: trackingKind === "bed"
							? resolvedStatus === "arrived"
								? "Ready"
								: "Reserved"
							: "Provider confirmation",
			},
			{
				label: "Hospital",
				value:
					hospitalName +
					(hospitalAddress ? ` · ${hospitalAddress}` : ""),
			},
		];
	}, [
		hospitalAddress,
		hospitalName,
		requestLabel,
		resolvedStatus,
		serviceLabel,
		telemetryLabel,
		trackingKind,
	]);

	const pendingRequestContext = useMemo(
		() => ({
			serviceType: pendingApproval?.serviceType || "ambulance",
			specialty: pendingApproval?.specialty || null,
			hospitalId: pendingApproval?.hospitalId || null,
			hospitalName: pendingApproval?.hospitalName || hospitalName,
			requestId: pendingApproval?.requestId || null,
		}),
		[hospitalName, pendingApproval],
	);

	const body =
		trackingKind === "idle" ? (
			<View style={[styles.emptyCard, { backgroundColor: surfaceColor }]}>
				<Text style={[styles.emptyTitle, { color: titleColor }]}>
					No active request
				</Text>
				<Text style={[styles.emptyMeta, { color: mutedColor }]}>
					{hospitalName}
				</Text>
			</View>
		) : (
			<View style={styles.sectionStack}>
				<View
					style={[
						styles.metricsCapsule,
						metricsCardStyle,
						{ backgroundColor: metricsSurfaceColor },
					]}
				>
					<TrackingMetric
						label="Arrival"
						value={arrivalLabel}
						titleColor={titleColor}
						mutedColor={mutedColor}
					/>
					<View style={[styles.metricDivider, { backgroundColor: dividerColor }]} />
					<TrackingMetric
						label={trackingKind === "bed" ? "Ready in" : "ETA"}
						value={etaLabel}
						titleColor={titleColor}
						mutedColor={mutedColor}
						metricStyle={{ backgroundColor: metricsAccentSurface }}
					/>
					<View style={[styles.metricDivider, { backgroundColor: dividerColor }]} />
					<TrackingMetric
						label="Distance"
						value={distanceLabel}
						titleColor={titleColor}
						mutedColor={mutedColor}
					/>
				</View>

				<View
					style={[
						styles.routeCard,
						{ backgroundColor: elevatedSurfaceColor, borderRadius: routeCardRadius },
					]}
				>
					<LinearGradient
						pointerEvents="none"
						colors={routeGradientColors}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.routeCardGradient}
					/>

					<View style={styles.routeHeader}>
						<View style={[styles.servicePill, { backgroundColor: toneColors.surface }]}>
							<Ionicons
								name={trackingKind === "bed" ? "bed-outline" : "car-outline"}
								size={15}
								color={toneColors.icon}
							/>
							<Text style={[styles.servicePillText, { color: toneColors.text }]}>
								{serviceLabel}
							</Text>
						</View>
						{requestLabel ? (
							<View style={[styles.requestPill, { backgroundColor: requestSurfaceColor }]}>
								<Text style={[styles.requestPillText, { color: titleColor }]}>
									{requestLabel}
								</Text>
							</View>
						) : null}
					</View>

					<View style={styles.stopList}>
						<View style={[styles.stopConnector, { backgroundColor: connectorColor }]} />

						<View style={styles.stopRow}>
							<View style={[styles.stopIconWrap, { backgroundColor: stopIconSurface }]}>
								<Ionicons name="navigate" size={18} color={toneColors.icon} />
							</View>
							<View style={styles.stopCopyWrap}>
								<View style={styles.stopCopy}>
									<Text style={[styles.stopLabel, { color: mutedColor }]}>Pickup</Text>
									<Text numberOfLines={1} style={[styles.stopTitle, { color: titleColor }]}>
										{pickupLabel}
									</Text>
									{pickupDetail ? (
										<Text
											numberOfLines={1}
											style={[styles.stopSubtitle, { color: mutedColor }]}
										>
											{pickupDetail}
										</Text>
									) : null}
								</View>
								<LinearGradient
									pointerEvents="none"
									colors={routeFadeColors}
									start={{ x: 0, y: 0.5 }}
									end={{ x: 1, y: 0.5 }}
									style={styles.stopFade}
								/>
							</View>
						</View>

						<View style={styles.stopRow}>
							<View style={[styles.stopIconWrap, { backgroundColor: stopIconSurface }]}>
								<Ionicons name="business-outline" size={18} color={titleColor} />
							</View>
							<View style={styles.stopCopyWrap}>
								<View style={styles.stopCopy}>
									<Text style={[styles.stopLabel, { color: mutedColor }]}>Hospital</Text>
									<Text numberOfLines={1} style={[styles.stopTitle, { color: titleColor }]}>
										{hospitalName}
									</Text>
									{hospitalAddress ? (
										<Text
											numberOfLines={1}
											style={[styles.stopSubtitle, { color: mutedColor }]}
										>
											{hospitalAddress}
										</Text>
									) : null}
								</View>
								<LinearGradient
									pointerEvents="none"
									colors={routeFadeColors}
									start={{ x: 0, y: 0.5 }}
									end={{ x: 1, y: 0.5 }}
									style={styles.stopFade}
								/>
							</View>
						</View>
					</View>

					<View style={styles.statusRow}>
						<View style={[styles.statusPill, { backgroundColor: toneColors.surface }]}>
							<Ionicons
								name={
									trackingTone === "critical"
										? "alert-circle-outline"
										: trackingTone === "warning"
											? "time-outline"
											: trackingTone === "success"
												? "checkmark-circle-outline"
												: "pulse-outline"
								}
								size={15}
								color={toneColors.icon}
							/>
							<Text style={[styles.statusPillText, { color: toneColors.text }]}>
								{telemetryLabel}
							</Text>
						</View>
						<View style={[styles.statusPill, { backgroundColor: requestSurfaceColor }]}>
							<Ionicons name="location-outline" size={15} color={titleColor} />
							<Text style={[styles.statusPillText, { color: titleColor }]}>
								{distanceLabel}
							</Text>
						</View>
					</View>
				</View>

				{utilityActions.length ? (
					<View style={styles.utilityRow}>
						{utilityActions.map((action) => (
							<TrackingUtilityButton
								key={action.key}
								action={action}
								backgroundColor={utilitySurfaceColor}
								iconColor={titleColor}
								labelColor={titleColor}
							/>
						))}
					</View>
				) : null}

				{effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED ? (
					<View
						style={[
							styles.detailCard,
							{ backgroundColor: surfaceColor, borderRadius: detailCardRadius },
						]}
					>
						<LinearGradient
							pointerEvents="none"
							colors={detailGradientColors}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={styles.detailCardGradient}
						/>
						<Text style={[styles.detailHeader, { color: mutedColor }]}>
							Details
						</Text>
						<View style={styles.detailList}>
							{detailRows.map((detail, index) => (
								<View key={`${detail.label}-${index}`}>
									{index > 0 ? (
										<View
											style={[styles.detailDivider, { backgroundColor: dividerColor }]}
										/>
									) : null}
									<View style={styles.detailRow}>
										<Text style={[styles.detailLabel, { color: mutedColor }]}>
											{detail.label}
										</Text>
										<Text style={[styles.detailValue, { color: titleColor }]}>
											{detail.value}
										</Text>
									</View>
								</View>
							))}
						</View>
					</View>
				) : null}
			</View>
		);

	return (
		<>
			<MapSheetShell
				sheetHeight={sheetHeight}
				snapState={effectiveSnapState}
				presentationMode={presentationMode}
				shellWidth={shellWidth}
				allowedSnapStates={allowedSnapStates}
				onHandlePress={handleSheetToggle}
			>
				<MapStageBodyScroll
					bodyScrollRef={bodyScrollRef}
					viewportStyle={sheetStageStyles.bodyScrollViewport}
					contentContainerStyle={[
						sheetStageStyles.bodyScrollContent,
						sheetStageStyles.bodyScrollContentSheet,
						presentationMode === "modal"
							? sheetStageStyles.bodyScrollContentModal
							: null,
						isSidebarPresentation
							? sheetStageStyles.bodyScrollContentPanel
							: null,
						isSidebarPresentation
							? sheetStageStyles.bodyScrollContentSidebar
							: null,
						modalContainedStyle,
						styles.bodyContent,
					]}
					isSidebarPresentation={isSidebarPresentation}
					allowScrollDetents={allowScrollDetents}
					handleBodyWheel={handleBodyWheel}
					onScrollBeginDrag={handleAndroidCollapseScrollBeginDrag}
					onScroll={handleAndroidCollapseScroll}
					onScrollEndDrag={handleBodyScrollEndDrag}
					scrollEnabled={bodyScrollEnabled}
					androidExpandedBodyGesture={androidExpandedBodyGesture}
					androidExpandedBodyStyle={androidExpandedBodyStyle}
				>
					{body}
				</MapStageBodyScroll>
			</MapSheetShell>

			{pendingApproval?.requestId ? (
				<TriageIntakeModal
					visible={triageVisible}
					onClose={() => setTriageVisible(false)}
					phase="waiting"
					requestId={pendingApproval.requestId}
					requestContext={pendingRequestContext}
					hospitals={allKnownHospitals}
					selectedHospitalId={pendingApproval?.hospitalId || null}
					initialDraft={
						pendingApproval?.triageSnapshot?.signals?.userCheckin ||
						pendingApproval?.initiatedData?.triageCheckin ||
						null
					}
					isDarkMode={isDarkMode}
				/>
			) : null}
		</>
	);
}
