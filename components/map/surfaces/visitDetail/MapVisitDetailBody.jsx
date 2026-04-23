import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	ImageBackground,
	LayoutAnimation,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	UIManager,
	View,
} from "react-native";

// Enable LayoutAnimation on Android (no-op on iOS / web). Mirrors the pattern
// used in components/emergency/ContactCard.jsx.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Per-record session memory of the "More details" collapsed state. Lives at
// module scope so reopening the same visit during a single app session
// remembers the user's last choice; it intentionally resets on cold start.
const moreDetailsCollapseMemory = new Map();
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { styles as bodyStyles } from "./mapVisitDetail.styles";
import { HISTORY_DETAILS_COPY } from "../../history/history.content";
import { COLORS } from "../../../../constants/colors";
import trackingStyles from "../../views/tracking/mapTracking.styles";
import {
	TrackingCtaButton,
	TrackingDetailsCard,
	TrackingRouteCard,
} from "../../views/tracking/parts/MapTrackingParts";
import { buildTrackingThemeTokens } from "../../views/tracking/mapTracking.theme";
import { getToneColors } from "../../views/tracking/mapTracking.presentation";
import { useOptionalLocation } from "../../../../contexts/GlobalLocationContext";

function HeroIcon({ iconDescriptor, size, color }) {
	if (!iconDescriptor) {
		return <Ionicons name="medical-outline" size={size} color={color} />;
	}
	if (iconDescriptor.library === "material") {
		return (
			<MaterialCommunityIcons
				name={iconDescriptor.name}
				size={size}
				color={color}
			/>
		);
	}
	return <Ionicons name={iconDescriptor.name} size={size} color={color} />;
}

const HALF_PANEL_OVERLAY_OFFSET = -16;
const EXPANDED_PANEL_OVERLAY_OFFSET = -76;
const HALF_PANEL_TOP_PADDING = 20;
const EXPANDED_PANEL_TOP_PADDING = 46;
const HALF_ACTION_ROW_HEADER_CLEARANCE = 46;
const EXPANDED_ACTION_ROW_HEADER_CLEARANCE = 0;

// Render icon based on iconType (ion or material) - mirrors hospital detail
function renderIcon(item, color, size = 16) {
	if (!item?.icon) return null;
	if (item.iconType === "material") {
		return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
	}
	return <Ionicons name={item.icon} size={size} color={color} />;
}

// 5-star strip for the mid-snap stats slot. Filled / half / outline stars
// using the active color for filled and the muted color for outlines so the
// strip reads cleanly at glanceable size (12px).
function renderStatStars(value, activeColor, mutedColor, size = 12) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) return null;
	const clamped = Math.max(0, Math.min(5, numeric));
	const stars = [];
	for (let i = 1; i <= 5; i += 1) {
		let name = "star-outline";
		let starColor = mutedColor;
		if (clamped >= i) {
			name = "star";
			starColor = activeColor;
		} else if (clamped >= i - 0.5) {
			name = "star-half";
			starColor = activeColor;
		}
		stars.push(<Ionicons key={i} name={name} size={size} color={starColor} />);
	}
	return <View style={bodyStyles.placeStatStars}>{stars}</View>;
}

function SkeletonBlock({ style, color }) {
	return <View style={[bodyStyles.skeletonBlock, { backgroundColor: color }, style]} />;
}

function VisitDetailSkeleton({ theme }) {
	return (
		<View style={bodyStyles.scrollContent}>
			<View
				style={[
					bodyStyles.heroCanvas,
					bodyStyles.skeletonHeroCard,
					{ backgroundColor: theme.heroSurface },
				]}
			>
				<View style={bodyStyles.skeletonHeroInner}>
					<View style={bodyStyles.skeletonHeroBadgeRow}>
						<SkeletonBlock
							color={theme.skeletonSoftColor}
							style={bodyStyles.skeletonHeroBadge}
						/>
						<SkeletonBlock
							color={theme.skeletonBaseColor}
							style={bodyStyles.skeletonHeroStatus}
						/>
					</View>
					<View style={bodyStyles.skeletonHeroCopy}>
						<SkeletonBlock
							color={theme.skeletonBaseColor}
							style={bodyStyles.skeletonHeroTitle}
						/>
						<SkeletonBlock
							color={theme.skeletonSoftColor}
							style={bodyStyles.skeletonHeroSubtitle}
						/>
						<SkeletonBlock
							color={theme.skeletonSoftColor}
							style={bodyStyles.skeletonHeroSupport}
						/>
					</View>
				</View>
			</View>

			<SkeletonBlock
				color={theme.skeletonBaseColor}
				style={bodyStyles.skeletonPrimaryButton}
			/>

			<View style={[bodyStyles.sectionCard, { backgroundColor: theme.groupSurface }]}>
				{Array.from({ length: 3 }).map((_, index) => (
					<View key={`visit-skeleton-row-${index}`}>
						<View style={bodyStyles.skeletonDetailRow}>
							<SkeletonBlock
								color={theme.skeletonSoftColor}
								style={bodyStyles.skeletonDetailIcon}
							/>
							<View style={bodyStyles.skeletonDetailCopy}>
								<SkeletonBlock
									color={theme.skeletonBaseColor}
									style={bodyStyles.skeletonDetailLabel}
								/>
								<SkeletonBlock
									color={theme.skeletonSoftColor}
									style={bodyStyles.skeletonDetailValue}
								/>
							</View>
						</View>
						{index < 2 ? (
							<View
								style={[
									bodyStyles.detailHairline,
									{ backgroundColor: theme.hairlineDivider },
								]}
							/>
						) : null}
					</View>
				))}
			</View>
		</View>
	);
}

function PassportHero({ hero, theme }) {
	if (!hero) return null;

	return (
		<ImageBackground
			source={hero.imageSource}
			resizeMode="cover"
			fadeDuration={0}
			style={bodyStyles.heroCanvas}
			imageStyle={bodyStyles.heroCanvasImage}
		>
			<LinearGradient
				colors={theme.heroImageScrimColors}
				style={StyleSheet.absoluteFillObject}
			/>
			<LinearGradient
				colors={theme.heroImageTopMaskColors}
				style={bodyStyles.heroTopMask}
			/>
			<View style={bodyStyles.heroCanvasInner}>
				<View style={bodyStyles.heroCanvasMetaRow}>
					<View style={bodyStyles.heroBadgeRail}>
						{Array.isArray(hero.badges)
							? hero.badges.slice(0, 2).map((badge, index) => {
									const item =
										badge && typeof badge === "object"
											? badge
											: { label: String(badge || ""), tone: "neutral" };
									if (!item.label) return null;
									const badgeBg =
										item.tone === "verified"
											? "rgba(16,185,129,0.18)"
											: item.tone === "alert"
												? "rgba(225,29,72,0.18)"
												: theme.heroBadgeSurface;
									return (
										<View
											key={`${item.label}-${index}`}
											style={[bodyStyles.heroBadge, { backgroundColor: badgeBg }]}
										>
											{renderIcon(item, theme.heroOnImageBodyColor, 12)}
											<Text
												style={[
													bodyStyles.heroBadgeText,
													{ color: theme.heroOnImageBodyColor },
												]}
											>
												{item.label}
											</Text>
										</View>
									);
								})
							: null}
					</View>
					{hero.statusLabel ? (
						<View
							style={[
								bodyStyles.heroStatusChip,
								{ backgroundColor: theme.tone.chip },
							]}
						>
							<Text
								style={[
									bodyStyles.heroStatusText,
									{ color: theme.tone.chipText },
								]}
							>
								{hero.statusLabel}
							</Text>
						</View>
					) : null}
				</View>

				<View
					style={[
						bodyStyles.heroCanvasBody,
						{ backgroundColor: theme.heroTextPanelSurface },
					]}
				>
					<Text
						numberOfLines={2}
						style={[
							bodyStyles.heroTitle,
							{ color: theme.heroOnImageTitleColor },
						]}
					>
						{hero.title}
					</Text>
					{hero.subtitle ? (
						<Text
							numberOfLines={2}
							style={[
								bodyStyles.heroSubtitle,
								{ color: theme.heroOnImageBodyColor },
							]}
						>
							{hero.subtitle}
						</Text>
					) : null}
					{hero.supportLine ? (
						<Text
							numberOfLines={2}
							style={[
								bodyStyles.heroSupportLine,
								{ color: theme.heroOnImageBodyColor },
							]}
						>
							{hero.supportLine}
						</Text>
					) : null}
					{hero.facilityLine ? (
						<Text
							numberOfLines={2}
							style={[
								bodyStyles.heroFacilityLine,
								{ color: theme.heroOnImageMutedColor },
							]}
						>
							{hero.facilityLine}
						</Text>
					) : null}
				</View>
			</View>
		</ImageBackground>
	);
}

export default function MapVisitDetailBody({
	model,
	onCancelVisit,
	revealHero = false,
	onExpandedHeaderLayout,
}) {
	const {
		recordKey,
		theme,
		hero,
		compactDetails,
		journey,
		expandedDetails,
		paymentRows,
		triageRows,
		preparation,
		actions,
		placeActions,
		placeStats,
		canCancel,
	} = model;

	const isDarkMode = theme?.titleColor === "#F8FAFC";

	// User's actual current location — used by the route card so the "Pickup"
	// stop reflects where the user is now (reverse-geocoded), not the visit's
	// stored pickup destination string.
	const { resolvedPlace } = useOptionalLocation();
	const userLocationLabel = resolvedPlace?.primaryText || null;
	const userLocationDetail = resolvedPlace?.secondaryText || null;

	// Tracking-sheet theme tokens — used for TrackingRouteCard + TrackingCtaButton
	// so the route card and CTA group are pixel-identical to the tracking surface.
	const trackingTokens = useMemo(
		() =>
			buildTrackingThemeTokens({
				isDarkMode,
				stageMetrics: null,
				triageIsComplete: true,
				triageAnsweredCount: 0,
				telemetryHeroTone: null,
				routeVisualProgress: Number(journey?.progressValue) || 0,
				trackingKind: journey?.trackingKind || "ambulance",
				isBottomCompletionAction: false,
			}),
		[isDarkMode, journey?.progressValue, journey?.trackingKind],
	);
	const trackingToneColors = useMemo(
		() => getToneColors({ tone: "live", isDarkMode }),
		[isDarkMode],
	);

	// "More details" defaults to collapsed in the expanded passport so the
	// hero + glanceables read first. The collapsed state is remembered per
	// recordKey for the lifetime of the app session via moreDetailsCollapseMemory,
	// so toggling, closing, and reopening the same visit preserves the choice.
	const [moreDetailsCollapsed, setMoreDetailsCollapsed] = useState(() =>
		recordKey && moreDetailsCollapseMemory.has(recordKey)
			? moreDetailsCollapseMemory.get(recordKey)
			: true,
	);
	useEffect(() => {
		if (!recordKey) return;
		setMoreDetailsCollapsed(
			moreDetailsCollapseMemory.has(recordKey)
				? moreDetailsCollapseMemory.get(recordKey)
				: true,
		);
	}, [recordKey]);
	const handleToggleMoreDetails = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setMoreDetailsCollapsed((prev) => {
			const next = !prev;
			if (recordKey) moreDetailsCollapseMemory.set(recordKey, next);
			return next;
		});
	};

	// CTA group — Book again (positive) + Cancel (destructive). Mirrors the
	// tracking sheet's mid-actions card pattern (TrackingCtaButton, grouped).
	const ctaActions = useMemo(() => {
		const items = [];
		const bookAgainAction = (actions || []).find((a) => a.key === "bookAgain");
		if (bookAgainAction) {
			items.push({
				key: "bookAgain",
				label: bookAgainAction.label,
				iconName: "repeat",
				tone: "info",
				onPress: bookAgainAction.onPress,
			});
		}
		if (canCancel && typeof onCancelVisit === "function") {
			items.push({
				key: "cancel",
				label: HISTORY_DETAILS_COPY.actionLabels.cancel || "Cancel visit",
				iconName: "close-circle",
				tone: "transport",
				onPress: onCancelVisit,
			});
		}
		return items;
	}, [actions, canCancel, onCancelVisit]);

	// Deep "Actions" CTAs (expanded only) — Call / Video / Payment / Directions.
	// Book again is already rendered in the mid-snap CTA group above; filter it out
	// here to avoid duplication. Shaped to feed TrackingCtaButton (1:1 with the
	// tracking sheet's mid-actions card).
	const deepActionCtas = useMemo(
		() =>
			(actions || [])
				.filter((a) => a.key !== "bookAgain")
				.map((a) => ({
					key: a.key,
					label: a.label,
					iconName: a.iconName,
					tone: a.key === "paymentDetails" ? "share" : "info",
					onPress: a.onPress,
				})),
		[actions],
	);

	// Preparation steps mapped onto the TrackingDetailsCard row shape so the
	// "Preparation" section uses the same passport identity as the other detail
	// cards (label / value / icon).
	const preparationRows = useMemo(() => {
		if (!Array.isArray(preparation) || preparation.length === 0) return [];
		return preparation.map((step, index) => ({
			key: `prep-${index}`,
			label: `Step ${index + 1}`,
			value: step,
			icon: "checkmark-circle-outline",
			valueNumberOfLines: 4,
		}));
	}, [preparation]);

	const titleColor = theme?.titleColor || "#0F172A";
	const subtleColor = theme?.mutedColor || "#64748B";
	const actionSurface = theme?.neutralActionSurface || (isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)");
	const actionTint = titleColor;
	const cardSurface = theme?.groupSurface || (isDarkMode ? "rgba(255,255,255,0.06)" : "#FFFFFF");
	const placeMarkSurface = isDarkMode ? "rgba(15,23,42,0.52)" : cardSurface;
	const placeMarkIconColor = isDarkMode ? "#E2E8F0" : COLORS.brandPrimary;

	const heroBlendColors = isDarkMode
		? ["rgba(8,15,27,0)", "rgba(8,15,27,0.14)", "rgba(8,15,27,0.26)", "rgba(8,15,27,0.40)"]
		: ["rgba(248,250,252,0)", "rgba(248,250,252,0.08)", "rgba(248,250,252,0.16)", "rgba(248,250,252,0.32)"];
	const heroBottomMergeColors = isDarkMode
		? ["rgba(8,15,27,0)", "rgba(8,15,27,0.10)", "rgba(8,15,27,0.28)", "rgba(8,15,27,0.58)"]
		: ["rgba(255,255,255,0)", "rgba(255,255,255,0.10)", "rgba(255,255,255,0.24)", "rgba(255,255,255,0.52)"];
	const heroTopMaskColors = ["rgba(8,15,27,0.36)", "rgba(8,15,27,0.18)", "rgba(8,15,27,0)"];
	const expandedHeroShadeColors = isDarkMode
		? ["rgba(8,15,27,0.04)", "rgba(8,15,27,0.16)", "rgba(8,15,27,0.58)", "rgba(8,15,27,0.94)"]
		: ["rgba(248,250,252,0.02)", "rgba(248,250,252,0.06)", "rgba(248,250,252,0.48)", "rgba(255,255,255,0.94)"];
	const expandedHeroBottomMergeColors = isDarkMode
		? ["rgba(8,15,27,0)", "rgba(8,15,27,0.14)", "rgba(8,15,27,0.34)", "rgba(8,15,27,0.74)"]
		: ["rgba(255,255,255,0)", "rgba(255,255,255,0.12)", "rgba(255,255,255,0.30)", "rgba(255,255,255,0.68)"];
	const expandedHeroTopMaskColors = ["rgba(8,15,27,0.42)", "rgba(8,15,27,0.22)", "rgba(8,15,27,0)"];
	const heroImageOpacity = isDarkMode ? 0.92 : 0.9;
	const expandedTitleColor = titleColor;
	const expandedSubtitleColor = subtleColor;

	const heroRevealProgress = useRef(new Animated.Value(revealHero ? 1 : 0)).current;

	useEffect(() => {
		Animated.spring(heroRevealProgress, {
			toValue: revealHero ? 1 : 0,
			tension: 64,
			friction: 11,
			useNativeDriver: false,
		}).start();
	}, [heroRevealProgress, revealHero]);

	const heroHeight = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 270],
	});
	const heroOpacity = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 1],
	});
	const detailPanelMarginTop = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [HALF_PANEL_OVERLAY_OFFSET, EXPANDED_PANEL_OVERLAY_OFFSET],
	});
	const detailPanelPaddingTop = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [HALF_PANEL_TOP_PADDING, EXPANDED_PANEL_TOP_PADDING],
	});
	const actionRowMarginTop = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [HALF_ACTION_ROW_HEADER_CLEARANCE, EXPANDED_ACTION_ROW_HEADER_CLEARANCE],
	});
	const placeHeaderHeight = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 132],
	});
	const placeHeaderOpacity = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 1],
	});
	const placeHeaderMarginTop = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, -64],
	});

	const heroSubtitle = hero?.subtitle || hero?.supportLine || "";

	if (!theme || !hero) {
		return (
			<VisitDetailSkeleton
				theme={
					theme || {
						groupSurface: "rgba(255,255,255,0.08)",
						heroSurface: "rgba(15,23,42,0.72)",
						skeletonBaseColor: "rgba(255,255,255,0.08)",
						skeletonSoftColor: "rgba(255,255,255,0.05)",
						hairlineDivider: "rgba(148,163,184,0.18)",
					}
				}
			/>
		);
	}

	// Shared content rendered inside both paths: action row, stats, route card,
	// CTA group, and (expanded only) detail / payment / triage / preparation
	// sections + deep CTAs. Mirrors mapHospitalDetail.expandedBody composition.
	const bodyContent = (
		<>
			{placeActions?.length > 0 ? (
				<View style={bodyStyles.placeActionRow}>
					{placeActions.map((item) => (
						<Pressable
							key={item.key}
							onPress={item.onPress}
							disabled={item.disabled || !item.onPress}
							accessibilityRole="button"
							accessibilityLabel={item.accessibilityLabel}
							style={bodyStyles.placeActionPressable}
						>
							{({ pressed }) => (
								<View
									style={[
										bodyStyles.placeActionButton,
										item.primary
											? bodyStyles.placeActionButtonPrimary
											: { backgroundColor: actionSurface },
										item.disabled ? bodyStyles.placeActionButtonDisabled : null,
										pressed && !item.disabled ? bodyStyles.placeActionButtonPressed : null,
									]}
								>
									{renderIcon(
										item,
										item.disabled
											? subtleColor
											: item.primary
												? "#F8FAFC"
												: actionTint,
										item.primary ? 19 : 16,
									)}
									<Text
										numberOfLines={1}
										style={[
											bodyStyles.placeActionLabel,
											{
												color: item.disabled
													? subtleColor
													: item.primary
														? "#F8FAFC"
														: actionTint,
											},
										]}
									>
										{item.label}
									</Text>
								</View>
							)}
						</Pressable>
					))}
				</View>
			) : null}

			{placeStats?.length > 0 ? (
				<View style={bodyStyles.placeStatsCard}>
					{placeStats.map((item, index) => {
						const isRating = item.kind === "rating";
						const starsNode = isRating
							? renderStatStars(item.ratingValue, COLORS.brandPrimary, subtleColor, 12)
							: null;
						return (
							<View key={`${item.label}-${index}`} style={bodyStyles.placeStatItem}>
								<Text numberOfLines={1} style={[bodyStyles.placeStatLabel, { color: subtleColor }]}>
									{item.label}
								</Text>
								{starsNode || (
									<View style={bodyStyles.placeStatValueRow}>
										{renderIcon(item, subtleColor, 15)}
										<Text numberOfLines={1} style={[bodyStyles.placeStatValue, { color: titleColor }]}>
											{item.value}
										</Text>
									</View>
								)}
							</View>
						);
					})}
				</View>
			) : null}

			{journey ? (
				<TrackingRouteCard
					elevatedSurfaceColor={trackingTokens.elevatedSurfaceColor}
					routeCardRadius={trackingTokens.routeCardRadius}
					routeGradientColors={trackingTokens.routeGradientColors}
					serviceLabel={journey.serviceLabel || journey.statusLabel || "Transport"}
					trackingKind={journey.trackingKind || "ambulance"}
					toneColors={trackingToneColors}
					requestLabel={journey.requestLabel}
					connectorTrackColor={trackingTokens.connectorTrackColor}
					connectorProgressColor={trackingTokens.connectorProgressColor}
					routeVisualProgress={Number(journey.progressValue) || 0}
					hospitalIconSurfaceColor={trackingTokens.hospitalIconSurfaceColor}
					titleColor={trackingTokens.titleColor}
					hospitalName={journey.originTitle}
					hospitalAddress={journey.originSubtitle}
					routeFadeColors={trackingTokens.routeFadeColors}
					mutedColor={trackingTokens.mutedColor}
					pickupIconSurfaceColor={trackingTokens.pickupIconSurfaceColor}
					pickupLabel={userLocationLabel || journey.destinationTitle}
					pickupDetail={userLocationDetail || journey.destinationSubtitle}
				/>
			) : null}

			{ctaActions.length > 0 ? (
				<View
					style={[
						trackingStyles.ctaGroupCard,
						{ backgroundColor: trackingTokens.secondaryCtaSurface },
					]}
				>
					{ctaActions.map((action, index) => (
						<TrackingCtaButton
							key={`vd-cta-${action.key}`}
							action={action}
							isGrouped
							isDarkMode={isDarkMode}
							showDivider={index < ctaActions.length - 1}
							iconColor={
								action.tone === "transport"
									? trackingTokens.transportActionColor
									: action.tone === "share"
										? trackingTokens.shareActionColor
										: action.tone === "bed"
											? trackingTokens.bedCareBlueColor
											: trackingTokens.infoActionColor
							}
							labelColor={trackingTokens.titleColor}
						/>
					))}
				</View>
			) : null}

			{revealHero ? (
				<>
					{expandedDetails.length > 0 ? (
						<TrackingDetailsCard
							headerLabel={HISTORY_DETAILS_COPY.sectionTitles.moreDetails}
							surfaceColor={trackingTokens.surfaceColor}
							detailCardRadius={trackingTokens.detailCardRadius}
							detailGradientColors={trackingTokens.detailGradientColors}
							mutedColor={trackingTokens.mutedColor}
							requestSurfaceColor={trackingTokens.requestSurfaceColor}
							trackingDetailRows={expandedDetails}
							isDarkMode={isDarkMode}
							titleColor={trackingTokens.titleColor}
							collapsible
							collapsed={moreDetailsCollapsed}
							onToggleCollapsed={handleToggleMoreDetails}
							ratingStarColor={COLORS.brandPrimary}
						/>
					) : null}

					{paymentRows.length > 0 ? (
						<TrackingDetailsCard
							headerLabel={HISTORY_DETAILS_COPY.sectionTitles.payment}
							surfaceColor={trackingTokens.surfaceColor}
							detailCardRadius={trackingTokens.detailCardRadius}
							detailGradientColors={trackingTokens.detailGradientColors}
							mutedColor={trackingTokens.mutedColor}
							requestSurfaceColor={trackingTokens.requestSurfaceColor}
							trackingDetailRows={paymentRows}
							isDarkMode={isDarkMode}
							titleColor={trackingTokens.titleColor}
						/>
					) : null}

					{triageRows.length > 0 ? (
						<TrackingDetailsCard
							headerLabel={HISTORY_DETAILS_COPY.sectionTitles.triage}
							surfaceColor={trackingTokens.surfaceColor}
							detailCardRadius={trackingTokens.detailCardRadius}
							detailGradientColors={trackingTokens.detailGradientColors}
							mutedColor={trackingTokens.mutedColor}
							requestSurfaceColor={trackingTokens.requestSurfaceColor}
							trackingDetailRows={triageRows}
							isDarkMode={isDarkMode}
							titleColor={trackingTokens.titleColor}
						/>
					) : null}

					{preparationRows.length > 0 ? (
						<TrackingDetailsCard
							headerLabel={HISTORY_DETAILS_COPY.sectionTitles.preparation}
							surfaceColor={trackingTokens.surfaceColor}
							detailCardRadius={trackingTokens.detailCardRadius}
							detailGradientColors={trackingTokens.detailGradientColors}
							mutedColor={trackingTokens.mutedColor}
							requestSurfaceColor={trackingTokens.requestSurfaceColor}
							trackingDetailRows={preparationRows}
							isDarkMode={isDarkMode}
							titleColor={trackingTokens.titleColor}
							valueNumberOfLines={4}
						/>
					) : null}

					{deepActionCtas.length > 0 ? (
						<View
							style={[
								trackingStyles.ctaGroupCard,
								{ backgroundColor: trackingTokens.secondaryCtaSurface },
							]}
						>
							{deepActionCtas.map((action, index) => (
								<TrackingCtaButton
									key={`vd-deep-${action.key}`}
									action={action}
									isGrouped
									isDarkMode={isDarkMode}
									showDivider={index < deepActionCtas.length - 1}
									iconColor={
										action.tone === "transport"
											? trackingTokens.transportActionColor
											: action.tone === "share"
												? trackingTokens.shareActionColor
												: action.tone === "bed"
													? trackingTokens.bedCareBlueColor
													: trackingTokens.infoActionColor
									}
									labelColor={trackingTokens.titleColor}
								/>
							))}
						</View>
					) : null}
				</>
			) : null}
		</>
	);

	// Expanded passport — 1:1 with MapHospitalDetailBody. Hero ImageBackground
	// hosts the place header (orb + title + subtitle) overlaid on the image;
	// expandedBody hosts the action row, stats, route, CTAs, and sections.
	if (revealHero) {
		return (
			<View style={bodyStyles.scrollContent}>
				<View style={bodyStyles.expandedCardWrap}>
					<ImageBackground
						source={hero.imageSource}
						resizeMode="cover"
						fadeDuration={0}
						style={bodyStyles.expandedHero}
						imageStyle={[bodyStyles.expandedHeroImage, { opacity: heroImageOpacity }]}
					>
						<LinearGradient
							pointerEvents="none"
							colors={expandedHeroShadeColors}
							style={StyleSheet.absoluteFillObject}
						/>
						<LinearGradient
							pointerEvents="none"
							colors={expandedHeroTopMaskColors}
							style={bodyStyles.expandedHeroTopMask}
						/>
						<LinearGradient
							pointerEvents="none"
							colors={expandedHeroBottomMergeColors}
							style={bodyStyles.expandedHeroBottomMerge}
						/>

						{hero.badges?.length > 0 ? (
							<View style={bodyStyles.expandedHeroBadgeRow}>
								{hero.badges.map((badge, index) => {
									const item =
										badge && typeof badge === "object"
											? badge
											: { label: String(badge || ""), tone: "neutral" };
									if (!item.label) return null;
									const badgeBg =
										item.tone === "verified"
											? "rgba(16,185,129,0.18)"
											: item.tone === "alert"
												? "rgba(225,29,72,0.18)"
												: "rgba(255,255,255,0.12)";
									return (
										<View
											key={`${item.label}-${index}`}
											style={[bodyStyles.heroBadge, { backgroundColor: badgeBg }]}
										>
											{renderIcon(item, "#F8FAFC", 12)}
											<Text style={bodyStyles.heroBadgeText}>{item.label}</Text>
										</View>
									);
								})}
							</View>
						) : null}

						<View style={bodyStyles.expandedHeaderBlock}>
							<View onLayout={onExpandedHeaderLayout} style={bodyStyles.expandedHeaderMeasure}>
								<View
									style={[
										bodyStyles.expandedPlaceMark,
										{ backgroundColor: placeMarkSurface },
									]}
								>
									<HeroIcon
										iconDescriptor={hero.iconDescriptor}
										size={24}
										color={placeMarkIconColor}
									/>
								</View>
								<Text
									numberOfLines={2}
									style={[bodyStyles.expandedPlaceTitle, { color: expandedTitleColor }]}
								>
									{hero.title}
								</Text>
								{heroSubtitle ? (
									<Text
										numberOfLines={2}
										style={[bodyStyles.expandedPlaceSubtitle, { color: expandedSubtitleColor }]}
									>
										{heroSubtitle}
									</Text>
								) : null}
							</View>
						</View>
					</ImageBackground>

					<View style={bodyStyles.expandedBody}>{bodyContent}</View>
				</View>
			</View>
		);
	}

	// Mid-snap — hero is hidden (topSlot owns identity); detailPanel overlaps
	// with placeHeaderReveal at height 0 so the action row clears the topSlot.
	return (
		<View style={bodyStyles.scrollContent}>
			<Animated.View
				style={[
					bodyStyles.heroRevealFrame,
					{ height: heroHeight, opacity: heroOpacity },
				]}
			>
				<ImageBackground
					source={hero.imageSource}
					resizeMode="cover"
					fadeDuration={0}
					style={bodyStyles.hero}
					imageStyle={[bodyStyles.heroImage, { opacity: heroImageOpacity }]}
				>
					<LinearGradient
						pointerEvents="none"
						colors={heroBlendColors}
						style={bodyStyles.heroBlend}
					/>
					<LinearGradient
						pointerEvents="none"
						colors={heroBottomMergeColors}
						style={bodyStyles.heroBottomMerge}
					/>
					<LinearGradient
						pointerEvents="none"
						colors={heroTopMaskColors}
						style={bodyStyles.heroTopMask}
					/>
					<View style={bodyStyles.heroFooter} />
				</ImageBackground>
			</Animated.View>

			<Animated.View
				style={[
					bodyStyles.detailPanel,
					{
						marginTop: detailPanelMarginTop,
						paddingTop: detailPanelPaddingTop,
					},
				]}
			>
				<View style={bodyStyles.detailPanelContent}>
					<Animated.View
						style={[
							bodyStyles.placeHeaderReveal,
							{
								height: placeHeaderHeight,
								opacity: placeHeaderOpacity,
								marginTop: placeHeaderMarginTop,
							},
						]}
					>
						<View style={bodyStyles.placeHeader}>
							<View
								style={[
									bodyStyles.placeMark,
									{ backgroundColor: placeMarkSurface },
								]}
							>
								<HeroIcon
									iconDescriptor={hero.iconDescriptor}
									size={24}
									color={placeMarkIconColor}
								/>
							</View>
							<Text numberOfLines={2} style={[bodyStyles.placeTitle, { color: titleColor }]}>
								{hero.title}
							</Text>
							{heroSubtitle ? (
								<Text numberOfLines={2} style={[bodyStyles.placeSubtitle, { color: subtleColor }]}>
									{heroSubtitle}
								</Text>
							) : null}
						</View>
					</Animated.View>

					<Animated.View
						style={[
							bodyStyles.midBodyContentGroup,
							{ marginTop: actionRowMarginTop },
						]}
					>
						{bodyContent}
					</Animated.View>
				</View>
			</Animated.View>
		</View>
	);
}
