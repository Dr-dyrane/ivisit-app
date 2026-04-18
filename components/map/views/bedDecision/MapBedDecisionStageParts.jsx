import React from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import EntryActionButton from "../../../entry/EntryActionButton";
import { getAmbulanceVisualProfile } from "../../../emergency/requestModal/ambulanceTierVisuals";
import { COLORS } from "../../../../constants/colors";
import { getHospitalDetailServiceImageSource } from "../../surfaces/hospitals/mapHospitalDetail.content";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import MapStageGlassPanel from "../shared/MapStageGlassPanel";
import { MAP_BED_DECISION_COPY } from "./mapBedDecision.content";
import styles from "./mapBedDecision.styles";

function toAccentRgba(color, alpha) {
	if (typeof color !== "string" || !color.startsWith("#")) {
		return `rgba(134,16,14,${alpha})`;
	}

	const hex = color.slice(1);
	const normalized =
		hex.length === 3
			? hex
					.split("")
					.map((char) => char + char)
					.join("")
			: hex;
	const red = parseInt(normalized.slice(0, 2), 16);
	const green = parseInt(normalized.slice(2, 4), 16);
	const blue = parseInt(normalized.slice(4, 6), 16);
	if (![red, green, blue].every(Number.isFinite)) {
		return `rgba(134,16,14,${alpha})`;
	}

	return `rgba(${red},${green},${blue},${alpha})`;
}

function getRoomDecisionVisual(item) {
	const raw = String(item?.title || item?.room_type || "").toLowerCase();
	if (/high-support|icu/.test(raw)) {
		return {
			accent: "#B91C1C",
			activeIconName: "pulse",
			inactiveIconName: "pulse-outline",
		};
	}
	if (/private/.test(raw)) {
		return {
			accent: "#0F766E",
			activeIconName: "shield-checkmark",
			inactiveIconName: "shield-checkmark-outline",
		};
	}
	if (/maternity/.test(raw)) {
		return {
			accent: "#BE185D",
			activeIconName: "heart",
			inactiveIconName: "heart-outline",
		};
	}
	if (/children|pediatric/.test(raw)) {
		return {
			accent: "#2563EB",
			activeIconName: "happy",
			inactiveIconName: "happy-outline",
		};
	}
	return {
		accent: "#64748B",
		activeIconName: "bed",
		inactiveIconName: "bed-outline",
	};
}

function getRoomIconName(roomVisual, isActive = false) {
	return isActive ? roomVisual.activeIconName : roomVisual.inactiveIconName;
}

function formatRoomMeta(option, fallbackPrice) {
	return [option?.metaText, option?.priceText || fallbackPrice].filter(Boolean).join(", ");
}

function MetaSkeleton({ style }) {
	return <View style={[styles.metaSkeleton, style]} />;
}

function RouteMetaLine({ text, color, fadeColor }) {
	return (
		<View style={styles.routeStopMetaWrap}>
			<Text
				style={[styles.routeStopMeta, { color }]}
				numberOfLines={1}
				ellipsizeMode="clip"
			>
				{text}
			</Text>
			<LinearGradient
				pointerEvents="none"
				colors={["rgba(255,255,255,0)", fadeColor]}
				start={{ x: 0, y: 0.5 }}
				end={{ x: 1, y: 0.5 }}
				style={styles.routeStopMetaFade}
			/>
		</View>
	);
}

export function MapBedDecisionTopSlot({
	modalContainedStyle,
	contentInsetStyle,
	stageMetrics,
	titleColor,
	subtitleColor,
	closeSurfaceColor,
	onClose,
	showToggle = true,
	onToggle,
	toggleAccessibilityLabel = "Toggle sheet size",
	hospitalName,
	hospitalSubtext,
	toggleIconName = "chevron-up",
}) {
	return (
		<View
			style={[
				styles.topSlot,
				stageMetrics?.topSlot?.containerStyle,
				contentInsetStyle,
				modalContainedStyle,
			]}
		>
			{showToggle ? (
				<MapHeaderIconButton
					onPress={onToggle}
					accessibilityLabel={toggleAccessibilityLabel}
					backgroundColor={closeSurfaceColor}
					color={titleColor}
					iconName={toggleIconName}
					style={styles.closeButton}
				/>
			) : (
				<View style={styles.headerActionSpacer} />
			)}
			<View style={styles.topSlotCopy}>
				<Text
					numberOfLines={1}
					style={[styles.topSlotTitle, stageMetrics?.topSlot?.titleStyle, { color: titleColor }]}
				>
					{hospitalName || "Hospital"}
				</Text>
				{hospitalSubtext ? (
					<Text
						numberOfLines={1}
						style={[
							styles.topSlotSubtitle,
							stageMetrics?.topSlot?.subtitleStyle,
							{ color: subtitleColor },
						]}
					>
						{hospitalSubtext}
					</Text>
				) : null}
			</View>
			<MapHeaderIconButton
				onPress={onClose}
				accessibilityLabel="Close bed decision"
				backgroundColor={closeSurfaceColor}
				color={titleColor}
				style={styles.closeButton}
			/>
		</View>
	);
}

export function MapBedDecisionHero({
	decision,
	glassTokens,
	isDarkMode,
	stageMetrics,
	titleColor,
	surfaceColor,
	onOpenRoomDetails,
}) {
	const imageSource = decision?.recommendedRoom
		? getHospitalDetailServiceImageSource(decision.recommendedRoom, "room")
		: null;
	const heroPillSurfaceColor = isDarkMode
		? "rgba(8,15,27,0.58)"
		: "rgba(255,255,255,0.86)";

	return (
		<View style={styles.heroPressable}>
			<MapStageGlassPanel
				style={[styles.heroCard, stageMetrics?.hero?.cardStyle]}
				backgroundColor={surfaceColor}
				glassTokens={glassTokens}
				isDarkMode={isDarkMode}
			>
				<View style={[styles.heroArtworkLayer, stageMetrics?.hero?.artworkStyle]}>
					{imageSource ? (
						<Image
							source={imageSource}
							resizeMode="contain"
							fadeDuration={0}
							style={styles.heroImage}
						/>
					) : null}
				</View>
				<View style={styles.heroHeader}>
					{typeof onOpenRoomDetails === "function" ? (
						<Pressable
							onPress={onOpenRoomDetails}
							style={[styles.heroDetailChip, stageMetrics?.hero?.detailChipStyle]}
						>
							<Ionicons name="information-circle-outline" size={26} color={COLORS.brandPrimary} />
						</Pressable>
					) : null}
				</View>
				<View style={styles.heroRow}>
					<View style={styles.heroCopy}>
						<Text style={[styles.heroTitle, stageMetrics?.hero?.titleStyle, { color: titleColor }]}>
							{decision.roomTitle}
						</Text>
						<View style={[styles.heroMetaRow, stageMetrics?.hero?.metaRowStyle]}>
							<View
								style={[
									styles.metaPill,
									stageMetrics?.hero?.metaPillStyle,
									{ backgroundColor: heroPillSurfaceColor },
								]}
							>
								<Ionicons name="bed-outline" size={14} color={COLORS.brandPrimary} />
								{decision.availabilityShowsSkeleton ? (
									<MetaSkeleton style={styles.metaSkeletonShort} />
								) : decision.availabilityLabel ? (
										<Text
											style={[
												styles.metaLabel,
												stageMetrics?.hero?.metaLabelStyle,
												{ color: titleColor },
											]}
											numberOfLines={1}
										>
											{decision.availabilityLabel}
										</Text>
								) : null}
							</View>
							<View
								style={[
									styles.metaPill,
									stageMetrics?.hero?.metaPillStyle,
									{ backgroundColor: heroPillSurfaceColor },
								]}
							>
								<Ionicons name="cash-outline" size={14} color={COLORS.brandPrimary} />
								{decision.priceShowsSkeleton ? (
									<MetaSkeleton style={styles.metaSkeletonMedium} />
								) : decision.priceLabel ? (
										<Text
											style={[
												styles.metaLabel,
												stageMetrics?.hero?.metaLabelStyle,
												{ color: titleColor },
											]}
											numberOfLines={1}
										>
											{decision.priceLabel}
										</Text>
								) : null}
							</View>
						</View>
					</View>
				</View>
			</MapStageGlassPanel>
		</View>
	);
}

export function MapBedDecisionRoomSwitchRow({
	roomOptions = [],
	selectedRoomServiceId = null,
	stageMetrics,
	isDarkMode = false,
	onSelectRoom,
	onAdvanceSelectedRoom,
}) {
	if (!Array.isArray(roomOptions) || roomOptions.length < 2) {
		return null;
	}
	const { width } = useWindowDimensions();
	const switchPillWidth =
		stageMetrics?.switch?.bedPillWidth ||
		Math.min(114, Math.max(82, Math.floor((width - 46) / 3.38)));
	const disabledColor = "rgba(148,163,184,0.92)";
	const disabledSurfaceColor = isDarkMode
		? "rgba(148,163,184,0.12)"
		: "rgba(148,163,184,0.14)";

	return (
		<View style={styles.switchRail}>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				directionalLockEnabled
				nestedScrollEnabled
				keyboardShouldPersistTaps="handled"
				style={styles.switchScroller}
				contentContainerStyle={[styles.switchRailContent, stageMetrics?.switch?.railContentStyle]}
			>
			{roomOptions.map((option) => {
				const isActive = option?.id === selectedRoomServiceId;
				const isEnabled = option?.enabled !== false;
				const roomVisual = getRoomDecisionVisual(option);
				const inactiveSurfaceColor = toAccentRgba(
					roomVisual.accent,
					isDarkMode ? 0.18 : 0.12,
				);

				return (
					<Pressable
						key={option?.id || option?.title}
						onPress={
							isEnabled
								? () =>
										isActive
											? onAdvanceSelectedRoom?.(option)
											: onSelectRoom?.(option)
								: undefined
						}
						disabled={!isEnabled}
						style={({ pressed }) => [
							styles.switchPill,
							stageMetrics?.switch?.pillStyle,
							{
								width: switchPillWidth,
								backgroundColor: isActive
									? COLORS.brandPrimary
									: isEnabled
										? inactiveSurfaceColor
										: disabledSurfaceColor,
								opacity: isEnabled ? (pressed ? 0.92 : 1) : 0.48,
							},
						]}
					>
						<Ionicons
							name={getRoomIconName(roomVisual, isActive)}
							size={14}
							color={isActive ? "#FFFFFF" : isEnabled ? roomVisual.accent : disabledColor}
						/>
						<Text
							style={[
								styles.switchPillLabel,
								stageMetrics?.switch?.labelStyle,
								{
									color: isActive
										? "#FFFFFF"
										: isEnabled
											? roomVisual.accent
											: disabledColor,
								},
							]}
							numberOfLines={1}
						>
							{option?.title || "Room"}
						</Text>
					</Pressable>
				);
			})}
			</ScrollView>
		</View>
	);
}

export function MapBedDecisionRouteCard({
	decision,
	glassTokens,
	isDarkMode,
	stageMetrics,
	titleColor,
	mutedColor,
	surfaceColor,
	pillSurfaceColor,
}) {
	const routePanel = decision?.routePanel;
	const connectorColor = isDarkMode
		? "rgba(255,255,255,0.14)"
		: "rgba(15,23,42,0.12)";
	const routeFadeColor =
		surfaceColor || (isDarkMode ? "rgba(18,24,38,0.60)" : "rgba(255,255,255,0.44)");

	return (
		<MapStageGlassPanel
			style={[styles.routeCard, stageMetrics?.route?.cardStyle]}
			backgroundColor={surfaceColor}
			glassTokens={glassTokens}
			isDarkMode={isDarkMode}
		>
			<View style={styles.routeRow}>
				<View style={styles.routeTrack}>
					<View style={[styles.routeNode, { backgroundColor: pillSurfaceColor }]}>
						<MaterialCommunityIcons
							name="hospital-building"
							size={18}
							color={COLORS.brandPrimary}
						/>
					</View>
					<View
						style={[
							styles.routeConnector,
							stageMetrics?.route?.connectorStyle,
							{ backgroundColor: connectorColor },
						]}
					/>
					<View style={[styles.routeNode, { backgroundColor: pillSurfaceColor }]}>
						<Ionicons name="navigate" size={16} color={COLORS.brandPrimary} />
					</View>
				</View>
				<View style={styles.routeStops}>
					<View style={styles.routeStop}>
						<Text
							style={[
								styles.routeStopTitle,
								stageMetrics?.route?.titleStyle,
								{ color: titleColor },
							]}
							numberOfLines={1}
						>
							{routePanel?.originTitle || "Hospital"}
						</Text>
						<RouteMetaLine
							text={routePanel?.originSubtitle || "Receiving hospital"}
							color={mutedColor}
							fadeColor={routeFadeColor}
						/>
					</View>
					<View style={[styles.routeStopGap, stageMetrics?.route?.stopGapStyle]} />
					<View style={styles.routeStop}>
						<Text
							style={[
								styles.routeStopTitle,
								stageMetrics?.route?.titleStyle,
								{ color: titleColor },
							]}
							numberOfLines={1}
						>
							{routePanel?.destinationTitle || "My location"}
						</Text>
						<RouteMetaLine
							text={routePanel?.destinationSubtitle || "Current pickup point"}
							color={mutedColor}
							fadeColor={routeFadeColor}
						/>
					</View>
				</View>
				<View style={styles.routeMetrics}>
					<Text
						style={[
							styles.routeMetricPrimary,
							stageMetrics?.route?.metricPrimaryStyle,
							{ color: titleColor },
						]}
						numberOfLines={1}
					>
						{routePanel?.primaryMetric || decision.etaLabel}
					</Text>
					{routePanel?.secondaryMetric ? (
						<Text
							style={[
								styles.routeMetricSecondary,
								stageMetrics?.route?.metricSecondaryStyle,
								{ color: mutedColor },
							]}
							numberOfLines={1}
						>
							{routePanel.secondaryMetric}
						</Text>
					) : null}
				</View>
			</View>
		</MapStageGlassPanel>
	);
}

export function MapBedDecisionSavedTransportCard({
	savedTransport,
	glassTokens,
	isDarkMode,
	stageMetrics,
	titleColor,
	mutedColor,
	surfaceColor,
	pillSurfaceColor,
}) {
	const visualProfile = getAmbulanceVisualProfile({
		tierKey: savedTransport?.tierKey,
		service_type: savedTransport?.serviceType,
		title: savedTransport?.title,
		service_name: savedTransport?.title,
	});

	return (
		<MapStageGlassPanel
			style={[styles.savedTransportCard, stageMetrics?.panel?.cardStyle]}
			backgroundColor={surfaceColor}
			glassTokens={glassTokens}
			isDarkMode={isDarkMode}
		>
			<View style={styles.savedTransportHeader}>
				<View style={[styles.savedTransportPill, { backgroundColor: pillSurfaceColor }]}>
					<Text style={styles.savedTransportPillText}>
						{MAP_BED_DECISION_COPY.SAVED_TRANSPORT_STEP}
					</Text>
				</View>
			</View>
			<View style={styles.savedTransportRow}>
				<View
					style={[
						styles.savedTransportIconWrap,
						{ backgroundColor: toAccentRgba(visualProfile.accent, 0.12) },
					]}
				>
					<Ionicons name="checkmark-circle" size={18} color={visualProfile.accent} />
				</View>
				<View style={styles.savedTransportCopy}>
					<Text
						style={[styles.savedTransportTitle, stageMetrics?.expanded?.titleStyle, { color: titleColor }]}
					>
						{MAP_BED_DECISION_COPY.SAVED_TRANSPORT_TITLE}
					</Text>
					<Text
						style={[
							styles.savedTransportMeta,
							stageMetrics?.expanded?.metaStyle,
							{ color: mutedColor },
						]}
						numberOfLines={1}
					>
						{[
							savedTransport?.title || MAP_BED_DECISION_COPY.SAVED_TRANSPORT_FALLBACK,
							savedTransport?.priceText || null,
						]
							.filter(Boolean)
							.join(", ")}
					</Text>
				</View>
			</View>
		</MapStageGlassPanel>
	);
}

export function MapBedDecisionExpandedRoomChoices({
	decision,
	stageMetrics,
	titleColor,
	mutedColor,
	isDarkMode = false,
	onSelectRoom,
}) {
	const alternativeOptions = Array.isArray(decision?.roomOptions)
		? decision.roomOptions.filter(
				(option) => option?.id !== decision?.recommendedRoom?.id,
			)
		: [];
	if (alternativeOptions.length === 0) {
		return null;
	}

	return (
		<View style={styles.expandedList}>
			{alternativeOptions.map((option) => {
				const isEnabled = option?.enabled !== false;
				const roomVisual = getRoomDecisionVisual(option);
				const imageSource = getHospitalDetailServiceImageSource(option, "room");
				const inactiveSurfaceColor = toAccentRgba(
					roomVisual.accent,
					isDarkMode ? 0.14 : 0.1,
				);
				const metaText = formatRoomMeta(option, null);

				return (
					<Pressable
						key={option?.id || option?.title}
						onPress={isEnabled ? () => onSelectRoom?.(option) : undefined}
						disabled={!isEnabled}
						style={({ pressed }) => [
							styles.expandedRow,
							stageMetrics?.expanded?.rowStyle,
							{
								backgroundColor: inactiveSurfaceColor,
								opacity: isEnabled ? (pressed ? 0.94 : 1) : 0.48,
							},
						]}
					>
						<View style={styles.expandedLead}>
							<View
								style={[
									styles.expandedIconWrap,
									stageMetrics?.expanded?.iconWrapStyle,
									{ backgroundColor: toAccentRgba(roomVisual.accent, 0.12) },
								]}
							>
								<Ionicons
									name={getRoomIconName(roomVisual)}
									size={18}
									color={roomVisual.accent}
								/>
							</View>
							<View style={styles.expandedCopy}>
								<Text
								style={[
									styles.expandedTitle,
									stageMetrics?.expanded?.titleStyle,
									{ color: titleColor },
								]}
									numberOfLines={1}
								>
									{option?.title || "Room"}
								</Text>
								{metaText ? (
									<Text
										style={[
											styles.expandedMeta,
											stageMetrics?.expanded?.metaStyle,
											{ color: mutedColor },
										]}
										numberOfLines={2}
									>
										{metaText}
									</Text>
								) : option?.showMetaSkeleton || option?.showPriceSkeleton ? (
									<View style={styles.expandedMetaSkeletonRow}>
										{option?.showMetaSkeleton ? (
											<MetaSkeleton style={styles.expandedMetaSkeletonShort} />
										) : null}
										{option?.showPriceSkeleton ? (
											<MetaSkeleton style={styles.expandedMetaSkeletonMedium} />
										) : null}
									</View>
								) : null}
							</View>
						</View>
						{imageSource ? (
							<Image
								source={imageSource}
								resizeMode="contain"
								fadeDuration={0}
								style={[styles.expandedImage, stageMetrics?.expanded?.imageStyle]}
							/>
						) : null}
						<View style={styles.expandedActionWrap}>
							<Ionicons
								name="chevron-forward"
								size={18}
								color={roomVisual.accent}
							/>
						</View>
					</Pressable>
				);
			})}
		</View>
	);
}

export function MapBedDecisionDetailsCard({
	decision,
	glassTokens,
	isDarkMode,
	stageMetrics,
	titleColor,
	mutedColor,
	surfaceColor,
	pillSurfaceColor,
}) {
	const features = Array.isArray(decision?.roomFeatures) ? decision.roomFeatures : [];
	if (!decision?.roomSummary && features.length === 0) {
		return null;
	}

	return (
		<MapStageGlassPanel
			style={[styles.detailsCard, stageMetrics?.panel?.cardStyle]}
			backgroundColor={surfaceColor}
			glassTokens={glassTokens}
			isDarkMode={isDarkMode}
		>
			<View style={styles.detailsHeader}>
				<View style={[styles.detailsPill, { backgroundColor: pillSurfaceColor }]}>
					<Text style={styles.detailsPillText}>{decision.confidenceLabel}</Text>
				</View>
			</View>
			{decision.roomSummary ? (
				<Text
					style={[styles.detailsSummary, stageMetrics?.panel?.summaryStyle, { color: titleColor }]}
				>
					{decision.roomSummary}
				</Text>
			) : null}
			{features.map((feature) => (
				<View key={feature} style={styles.detailsFeatureRow}>
					<View style={styles.detailsFeatureDot} />
					<Text
						style={[
							styles.detailsFeatureText,
							stageMetrics?.panel?.featureStyle,
							{ color: mutedColor },
						]}
					>
						{feature}
					</Text>
				</View>
			))}
		</MapStageGlassPanel>
	);
}

export function MapBedDecisionEmptyState({
	titleColor,
	mutedColor,
	surfaceColor,
	glassTokens,
	isDarkMode,
}) {
	return (
		<MapStageGlassPanel
			style={styles.emptyCard}
			backgroundColor={surfaceColor}
			glassTokens={glassTokens}
			isDarkMode={isDarkMode}
		>
			<Text style={[styles.emptyTitle, { color: titleColor }]}>
				{MAP_BED_DECISION_COPY.NO_HOSPITAL_TITLE}
			</Text>
			<Text style={[styles.emptyBody, { color: mutedColor }]}>
				{MAP_BED_DECISION_COPY.NO_HOSPITAL_BODY}
			</Text>
		</MapStageGlassPanel>
	);
}

export function MapBedDecisionFooter({
	modalContainedStyle,
	canConfirm = true,
	canBrowseHospitals,
	careIntent = "bed",
	isAdvancing = false,
	stageMetrics,
	onConfirm,
	onOpenHospitals,
}) {
	return (
		<View style={[styles.footerDock, stageMetrics?.footer?.dockStyle, modalContainedStyle]}>
			<EntryActionButton
				label={
					isAdvancing
						? MAP_BED_DECISION_COPY.CONTINUING_CTA
						: MAP_BED_DECISION_COPY.CONFIRM_BED_CTA
				}
				onPress={onConfirm}
				variant="primary"
				height={stageMetrics?.footer?.buttonHeight || 50}
				radius={stageMetrics?.footer?.buttonRadius || 24}
				fullWidth
				disabled={!canConfirm}
				loading={isAdvancing}
				style={styles.primaryButton}
			/>
			{canBrowseHospitals ? (
				<Pressable
					onPress={onOpenHospitals}
					style={({ pressed }) => [
						styles.secondaryAction,
						{
							opacity: pressed ? 0.88 : 1,
							backgroundColor: "rgba(134,16,14,0.08)",
						},
					]}
				>
					<Text style={styles.secondaryActionText}>
						{MAP_BED_DECISION_COPY.OTHER_HOSPITALS_CTA}
					</Text>
					<Ionicons name="chevron-forward" size={16} color={COLORS.brandPrimary} />
				</Pressable>
			) : null}
		</View>
	);
}
