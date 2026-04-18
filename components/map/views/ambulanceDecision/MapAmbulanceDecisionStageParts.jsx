import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import EntryActionButton from "../../../entry/EntryActionButton";
import AmbulanceTierProductGraphic from "../../../emergency/requestModal/AmbulanceTierProductGraphic";
import { getAmbulanceVisualProfile } from "../../../emergency/requestModal/ambulanceTierVisuals";
import { COLORS } from "../../../../constants/colors";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import MapStageGlassPanel from "../shared/MapStageGlassPanel";
import { MAP_AMBULANCE_DECISION_COPY } from "./mapAmbulanceDecision.content";
import styles from "./mapAmbulanceDecision.styles";

function getAmbulanceTierIconName(visualProfile, isActive = false) {
	if (visualProfile?.key === "critical") {
		return isActive ? "alert-circle" : "alert-circle-outline";
	}
	if (visualProfile?.key === "advanced") {
		return isActive ? "pulse" : "pulse-outline";
	}
	return isActive ? "medkit" : "medkit-outline";
}

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

function formatExpandedChoiceSubtext(option, fallbackPrice) {
	return [option?.metaText, option?.priceText || fallbackPrice]
		.filter(Boolean)
		.join(", ");
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

export function MapAmbulanceDecisionTopSlot({
	modalContainedStyle,
	contentInsetStyle,
	titleColor,
	subtitleColor,
	closeSurfaceColor,
	onClose,
	onToggle,
	toggleAccessibilityLabel = "Toggle sheet size",
	hospitalName,
	hospitalSubtext,
	toggleIconName = "chevron-up",
}) {
	return (
		<View style={[styles.topSlot, contentInsetStyle, modalContainedStyle]}>
			<MapHeaderIconButton
				onPress={onToggle}
				accessibilityLabel={toggleAccessibilityLabel}
				backgroundColor={closeSurfaceColor}
				color={titleColor}
				iconName={toggleIconName}
				style={styles.closeButton}
			/>
			<View style={styles.topSlotCopy}>
				<Text numberOfLines={1} style={[styles.topSlotTitle, { color: titleColor }]}>
					{hospitalName || "Hospital"}
				</Text>
				{hospitalSubtext ? (
					<Text numberOfLines={1} style={[styles.topSlotSubtitle, { color: subtitleColor }]}>
						{hospitalSubtext}
					</Text>
				) : null}
			</View>
			<MapHeaderIconButton
				onPress={onClose}
				accessibilityLabel="Close ambulance decision"
				backgroundColor={closeSurfaceColor}
				color={titleColor}
				style={styles.closeButton}
			/>
		</View>
	);
}

export function MapAmbulanceDecisionHero({
	decision,
	glassTokens,
	isDarkMode,
	titleColor,
	surfaceColor,
	pillSurfaceColor,
	onOpenServiceDetails,
}) {
	const canOpenServiceDetails = typeof onOpenServiceDetails === "function";
	const heroPillSurfaceColor = isDarkMode
		? "rgba(8,15,27,0.58)"
		: "rgba(255,255,255,0.86)";

	return (
		<View style={styles.heroPressable}>
			<MapStageGlassPanel
				style={styles.heroCard}
				backgroundColor={surfaceColor}
				glassTokens={glassTokens}
				isDarkMode={isDarkMode}
			>
				<View style={styles.heroArtworkLayer}>
					<AmbulanceTierProductGraphic
						type={decision.recommendedService}
						width={232}
						height={154}
						showBackdrop={false}
					/>
				</View>
				<View style={styles.heroCopyScrim} />
				<View style={styles.heroHeader}>
					{canOpenServiceDetails ? (
					<Pressable
						onPress={onOpenServiceDetails}
						style={({ pressed }) => [
							styles.heroDetailChip,
							{
								opacity: pressed ? 0.88 : 1,
							},
						]}
					>
						<Ionicons
							name="information-circle-outline"
							size={26}
							color={decision.visualProfile.accent}
						/>
					</Pressable>
				) : null}
				</View>

				<View style={styles.heroRow}>
					<View style={styles.heroCopy}>
						<Text style={[styles.heroTitle, { color: titleColor }]}>
							{decision.serviceTitle}
						</Text>
						<View style={styles.heroMetaRow}>
							<View style={[styles.metaPill, { backgroundColor: heroPillSurfaceColor }]}>
								<Ionicons
									name="people"
									size={14}
									color={decision.visualProfile.accent}
								/>
								<Text style={[styles.metaLabel, { color: titleColor }]}>
									{decision.crewPillLabel}
								</Text>
							</View>
							<View style={[styles.metaPill, { backgroundColor: heroPillSurfaceColor }]}>
								<Ionicons
									name="cash"
									size={14}
									color={decision.visualProfile.accent}
								/>
								<Text style={[styles.metaLabel, { color: titleColor }]}>
									{decision.priceLabel}
								</Text>
							</View>
						</View>
					</View>

				</View>
			</MapStageGlassPanel>
		</View>
	);
}

export function MapAmbulanceDecisionSwitchRow({
	serviceOptions = [],
	selectedServiceId = null,
	titleColor,
	mutedColor,
	pillSurfaceColor,
	isDarkMode = false,
	onSelectService,
	onAdvanceSelectedService,
}) {
	if (!Array.isArray(serviceOptions) || serviceOptions.length < 2) {
		return null;
	}

	return (
		<View style={styles.switchRow}>
			{serviceOptions.map((option) => {
				const isActive = option?.id === selectedServiceId;
				const isEnabled = option?.enabled !== false;
				const visualProfile = getAmbulanceVisualProfile(option);
				const inactiveSurfaceColor = toAccentRgba(
					visualProfile.accent,
					isDarkMode ? 0.18 : 0.12,
				);
				return (
					<Pressable
						key={option?.id || option?.title}
						onPress={
							isEnabled
								? () =>
										isActive
											? onAdvanceSelectedService?.(option)
											: onSelectService?.(option)
								: undefined
						}
						style={({ pressed }) => [
							styles.switchPill,
							{
								backgroundColor: isActive
									? COLORS.brandPrimary
									: inactiveSurfaceColor || pillSurfaceColor,
								opacity: isEnabled ? (pressed ? 0.9 : 1) : 0.45,
							},
						]}
						disabled={!isEnabled}
					>
						<Ionicons
							name={getAmbulanceTierIconName(visualProfile, isActive)}
							size={14}
							color={isActive ? "#FFFFFF" : visualProfile.accent}
						/>
						<Text
							style={[
								styles.switchPillLabel,
								{
									color: isActive ? "#FFFFFF" : visualProfile.accent,
								},
							]}
							numberOfLines={1}
						>
							{option?.title || visualProfile.shortLabel}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

export function MapAmbulanceDecisionRouteCard({
	decision,
	glassTokens,
	isDarkMode,
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
			style={styles.routeCard}
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
							color={decision.visualProfile.accent}
						/>
					</View>
					<View style={[styles.routeConnector, { backgroundColor: connectorColor }]} />
					<View style={[styles.routeNode, { backgroundColor: pillSurfaceColor }]}>
						<Ionicons name="navigate" size={16} color={decision.visualProfile.accent} />
					</View>
				</View>
				<View style={styles.routeStops}>
					<View style={styles.routeStop}>
						<Text style={[styles.routeStopTitle, { color: titleColor }]} numberOfLines={1}>
							{routePanel?.originTitle || "Hospital"}
						</Text>
						<RouteMetaLine
							text={routePanel?.originSubtitle || "Dispatch origin"}
							color={mutedColor}
							fadeColor={routeFadeColor}
						/>
					</View>
					<View style={styles.routeStopGap} />
					<View style={styles.routeStop}>
						<Text style={[styles.routeStopTitle, { color: titleColor }]} numberOfLines={1}>
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
					<Text style={[styles.routeMetricPrimary, { color: titleColor }]} numberOfLines={1}>
						{routePanel?.primaryMetric || decision.etaLabel}
					</Text>
					{routePanel?.secondaryMetric ? (
						<Text
							style={[styles.routeMetricSecondary, { color: mutedColor }]}
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

export function MapAmbulanceDecisionExpandedChoices({
	decision,
	titleColor,
	mutedColor,
	pillSurfaceColor,
	isDarkMode = false,
	onSelectService,
}) {
	const alternativeOptions = Array.isArray(decision?.serviceOptions)
		? decision.serviceOptions.filter(
				(option) => option?.id !== decision?.recommendedService?.id,
			)
		: [];
	if (alternativeOptions.length === 0) {
		return null;
	}
	const renderChoice = (option, indexKey) => {
		const isEnabled = option?.enabled !== false;
		const visualProfile = getAmbulanceVisualProfile(option);
		const subtext = formatExpandedChoiceSubtext(
			option,
			MAP_AMBULANCE_DECISION_COPY.PRICE_FALLBACK,
		);
		return (
			<Pressable
				key={option?.id || option?.title || indexKey}
				onPress={isEnabled ? () => onSelectService?.(option) : undefined}
				disabled={!isEnabled}
				style={({ pressed }) => [
					styles.expandedChoiceCard,
					{
						backgroundColor: toAccentRgba(
							visualProfile.accent,
							isDarkMode ? 0.14 : 0.1,
						),
						opacity: isEnabled ? (pressed ? 0.94 : 1) : 0.48,
					},
				]}
			>
				<View style={styles.expandedChoiceInfo}>
					<View
						style={[
							styles.expandedChoiceIconWrap,
							{ backgroundColor: toAccentRgba(visualProfile.accent, 0.12) },
						]}
					>
						<Ionicons
							name={getAmbulanceTierIconName(visualProfile)}
							size={18}
							color={visualProfile.accent}
						/>
					</View>
					<View style={styles.expandedChoiceCopy}>
						<Text
							style={[styles.expandedChoiceTitle, { color: titleColor }]}
							numberOfLines={1}
						>
							{option?.title || visualProfile.shortLabel}
						</Text>
						<Text
							style={[styles.expandedChoiceMeta, { color: mutedColor }]}
							numberOfLines={2}
						>
							{subtext}
						</Text>
					</View>
				</View>
				<View style={styles.expandedChoiceArtworkWrap}>
					<AmbulanceTierProductGraphic
						type={option}
						width={84}
						height={58}
						showBackdrop={false}
					/>
				</View>
				<View style={styles.expandedChoiceActionWrap}>
					<Ionicons name="chevron-forward" size={18} color={visualProfile.accent} />
				</View>
			</Pressable>
		);
	};

	return (
		<View style={styles.expandedChoicesWrap}>
			{alternativeOptions.map((option, index) => renderChoice(option, index))}
		</View>
	);
}

export function MapAmbulanceDecisionDetailsCard({
	decision,
	glassTokens,
	isDarkMode,
	titleColor,
	mutedColor,
	surfaceColor,
	pillSurfaceColor,
}) {
	const features = Array.isArray(decision?.features) ? decision.features : [];
	if (!decision?.serviceSummary && features.length === 0) {
		return null;
	}

	return (
		<MapStageGlassPanel
			style={styles.detailsCard}
			backgroundColor={surfaceColor}
			glassTokens={glassTokens}
			isDarkMode={isDarkMode}
		>
			<View style={styles.detailsHeader}>
				<View style={[styles.detailsConfidencePill, { backgroundColor: pillSurfaceColor }]}>
					<Text style={styles.detailsConfidenceText}>{decision.confidenceLabel}</Text>
				</View>
				{decision.distanceLabel ? (
					<View style={[styles.detailsConfidencePill, { backgroundColor: pillSurfaceColor }]}>
						<Text style={[styles.detailsConfidenceText, { color: titleColor }]}>
							{decision.distanceLabel}
						</Text>
					</View>
				) : null}
			</View>
			{decision.serviceSummary ? (
				<Text style={[styles.detailsSummary, { color: titleColor }]}>
					{decision.serviceSummary}
				</Text>
			) : null}
			{features.map((feature) => (
				<View key={feature} style={styles.detailsFeatureRow}>
					<View style={styles.detailsFeatureDot} />
					<Text style={[styles.detailsFeatureText, { color: mutedColor }]}>
						{feature}
					</Text>
				</View>
			))}
		</MapStageGlassPanel>
	);
}

export function MapAmbulanceDecisionEmptyState({
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
				{MAP_AMBULANCE_DECISION_COPY.NO_HOSPITAL_TITLE}
			</Text>
			<Text style={[styles.emptyBody, { color: mutedColor }]}>
				{MAP_AMBULANCE_DECISION_COPY.NO_HOSPITAL_BODY}
			</Text>
		</MapStageGlassPanel>
	);
}

export function MapAmbulanceDecisionFooter({
	modalContainedStyle,
	canConfirm = true,
	canBrowseHospitals,
	isAdvancing = false,
	onConfirm,
	onOpenHospitals,
}) {
	return (
		<View style={[styles.footerDock, modalContainedStyle]}>
			<EntryActionButton
				label={
					isAdvancing
						? MAP_AMBULANCE_DECISION_COPY.CONTINUING_CTA
						: MAP_AMBULANCE_DECISION_COPY.CONFIRM_CTA
				}
				onPress={onConfirm}
				variant="primary"
				height={50}
				radius={24}
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
					{MAP_AMBULANCE_DECISION_COPY.OTHER_HOSPITALS_CTA}
					</Text>
					<Ionicons name="chevron-forward" size={16} color={COLORS.brandPrimary} />
				</Pressable>
			) : null}
		</View>
	);
}
