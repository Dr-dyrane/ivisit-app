// components/map/surfaces/providerDetail/MapProviderDetailBody.jsx
//
// Provider detail body. Mirrors MapHospitalDetailBody's chassis exactly
// (animated hero + detail panel + place header + action row + place stats),
// then replaces hospital-specific service rails with stacked info section
// cards rendered by the shared TrackingDetailsCard primitive.
//
// Architecture references:
//   - components/map/surfaces/hospitals/MapHospitalDetailBody.jsx (chassis source of truth)
//   - components/map/views/tracking/parts/MapTrackingParts.jsx → TrackingDetailsCard
//   - docs/.../EXP-8_PROVIDER_DETAIL_VIEWS.md
//   - docs/.../MAP_SHEET_IMPLEMENTATION_NOTES_V1.md §11
//
// Provider tint is used as a SMALL accent only:
//   - hero fallback wash (very low opacity)
//   - hero badge "category" pill background
//   - place-mark icon color
//   - primary action button background
// Cards, typography and sheet surfaces stay neutral per the iVisit calm rule.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	ImageBackground,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	UIManager,
	View,
} from "react-native";
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS } from "../../../../constants/colors";
import { getCachedRemoteImageSource, isStableRemoteImageUrl } from "../../mapHospitalImage";
import { TrackingDetailsCard } from "../../views/tracking/parts/MapTrackingParts";
import FadeEndText from "../../../ui/FadeEndText";
import { styles } from "./mapProviderDetail.styles";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Layout offsets (mirror MapHospitalDetailBody) ───────────────────────────
const HALF_PANEL_OVERLAY_OFFSET = -16;
const EXPANDED_PANEL_OVERLAY_OFFSET = -76;
const HALF_PANEL_TOP_PADDING = 20;
const EXPANDED_PANEL_TOP_PADDING = 46;
const HALF_ACTION_ROW_HEADER_CLEARANCE = 46;
const EXPANDED_ACTION_ROW_HEADER_CLEARANCE = 0;
const PROVIDER_HERO_IMAGE_SOURCES = new Set([
	"provider_photo",
	"provider_image",
	"official_website_image",
	"seed_image",
	"deterministic_fallback",
]);

// ── Icon renderer (mirrors hospital body) ────────────────────────────────────
function renderIcon(item, color, size = 14) {
	if (!item?.icon) return null;
	if (item.iconType === "material") {
		return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
	}
	// PULLBACK NOTE: Provider Details — explicit Uber brand icon for Book ride
	// OLD: only "material" (MCI) and default (Ionicons) branches
	// NEW: "fa5brand" branch so action row can render FontAwesome5 brand glyphs
	//      (e.g. `uber`) — matches the deep-link target wired in bookRideUtils.js.
	if (item.iconType === "fa5brand") {
		return <FontAwesome5 name={item.icon} size={size} color={color} brand />;
	}
	return <Ionicons name={item.icon} size={size} color={color} />;
}

function getProviderHeroSource(provider) {
	const source = typeof provider?.imageSource === "string" ? provider.imageSource : "";
	const confidence = Number(provider?.imageConfidence ?? 0);
	const canUseImage =
		PROVIDER_HERO_IMAGE_SOURCES.has(source) &&
		(source === "deterministic_fallback" || confidence >= 0.35);
	if (canUseImage) {
		const candidates = [
			provider?.image,
			...(Array.isArray(provider?.googlePhotos) ? provider.googlePhotos : []),
		];
		const uri = candidates.find(
			(v) => isStableRemoteImageUrl(v),
		);
		return uri ? getCachedRemoteImageSource(uri) : null;
	}

	// Only honor REAL provider imagery. hospitalsService._mapHospital always
	// emits an `image` URL — when a real photo is missing it substitutes a
	// deterministic *hospital-flavored* fallback, which is the wrong identity
	// for pharmacies / labs / etc. The service tags this via `imageSource`
	// and `imageConfidence`; we treat the fallback as "no image" and let the
	// hero render the neutral wash + provider category tint instead.
	const isReal =
		provider?.imageSource === "provider_image" &&
		Number(provider?.imageConfidence ?? 0) >= 0.5;
	if (!isReal) return null;

	const candidates = [
		provider?.image,
		...(Array.isArray(provider?.googlePhotos) ? provider.googlePhotos : []),
	];
	const uri = candidates.find(
		(v) => isStableRemoteImageUrl(v),
	);
	return uri ? getCachedRemoteImageSource(uri) : null;
}

// ── Section row → TrackingDetailsCard row mapping ────────────────────────────
// TrackingDetailsCard expects rows of { label, value, icon, kind?, ratingValue?, valueNumberOfLines? }.
// Our model emits the same shape plus an extra `muted` flag for missing-data rows.
// We translate `muted` into a lower-contrast value color via valueNumberOfLines + color override.
function ProviderVisitSignals({
	signals,
	tintColor,
	titleColor,
	mutedColor,
	rowSurface,
	isDarkMode,
}) {
	if (!Array.isArray(signals) || signals.length === 0) return null;

	return (
		<View style={styles.visitSignalRail}>
			{signals.map((item) => {
				const isReady = item.tone === "ready";
				const isAttention = item.tone === "attention";
				const iconColor = isReady ? "#10B981" : isAttention ? tintColor : mutedColor;
				const tileBg = isReady
					? (isDarkMode ? "rgba(16,185,129,0.14)" : "rgba(16,185,129,0.10)")
					: isAttention
						? `${tintColor}14`
						: rowSurface;
				return (
					<View key={item.key} style={[styles.visitSignalTile, { backgroundColor: tileBg }]}>
						<View style={styles.visitSignalIconWrap}>
							<Ionicons name={item.icon} size={15} color={iconColor} />
						</View>
						<Text numberOfLines={1} style={[styles.visitSignalLabel, { color: mutedColor }]}>
							{item.label}
						</Text>
						<Text numberOfLines={2} style={[styles.visitSignalValue, { color: titleColor }]}>
							{item.value}
						</Text>
					</View>
				);
			})}
		</View>
	);
}

function ProviderInfoSection({
	section,
	titleColor,
	mutedColor,
	surfaceColor,
	requestSurfaceColor,
	detailGradientColors,
	detailCardRadius,
	isDarkMode,
}) {
	const [collapsed, setCollapsed] = useState(section.defaultCollapsed === true);

	const rows = useMemo(
		() => section.rows.map((r) => ({
			label: r.label,
			value: r.value,
			icon: r.icon,
			valueNumberOfLines: r.valueNumberOfLines,
			valueColor: r.muted ? mutedColor : undefined,
		})),
		[mutedColor, section.rows],
	);

	const hasAnyData = section.rows.some((r) => !r.muted);
	const headerLabel = section.headerLabel;

	return (
		<TrackingDetailsCard
			headerLabel={headerLabel}
			surfaceColor={surfaceColor}
			detailCardRadius={detailCardRadius}
			detailGradientColors={detailGradientColors}
			mutedColor={mutedColor}
			requestSurfaceColor={requestSurfaceColor}
			trackingDetailRows={rows}
			isDarkMode={isDarkMode}
			titleColor={hasAnyData ? titleColor : mutedColor}
			collapsible={section.collapsible === true}
			collapsed={collapsed}
			onToggleCollapsed={() => setCollapsed((v) => !v)}
		/>
	);
}

function ProviderDetailNotice({
	detailStatus,
	titleColor,
	mutedColor,
	rowSurface,
	tintColor,
}) {
	if (!detailStatus?.isError) return null;

	return (
		<View style={[styles.detailNotice, { backgroundColor: rowSurface }]}>
			<View style={styles.detailNoticeCopy}>
				<Ionicons name="information-circle-outline" size={17} color={mutedColor} />
				<View style={styles.detailNoticeTextBlock}>
					<Text style={[styles.detailNoticeTitle, { color: titleColor }]}>
						Latest details unavailable
					</Text>
					<Text style={[styles.detailNoticeBody, { color: mutedColor }]}>
						Showing the provider details already found on the map.
					</Text>
				</View>
			</View>
			{detailStatus?.canRetry && typeof detailStatus?.onRetry === "function" ? (
				<Pressable
					onPress={() => detailStatus.onRetry()}
					accessibilityRole="button"
					accessibilityLabel="Retry provider details"
					hitSlop={8}
					style={({ pressed }) => [
						styles.detailNoticeRetry,
						{ backgroundColor: `${tintColor}18`, opacity: pressed ? 0.86 : 1 },
					]}
				>
					<Ionicons name="refresh-outline" size={14} color={tintColor} />
					<Text style={[styles.detailNoticeRetryText, { color: tintColor }]}>Retry</Text>
				</Pressable>
			) : null}
		</View>
	);
}

// ── Skeleton (used when provider is null/loading) ────────────────────────────
function ProviderDetailSkeleton({ skeletonColor }) {
	return (
		<View style={styles.scrollContent}>
			<View style={[styles.skeletonHero, { backgroundColor: skeletonColor }]} />
			<View style={styles.skeletonPanel}>
				<View style={[styles.skeletonPlaceMark, { backgroundColor: skeletonColor }]} />
				<View style={[styles.skeletonTitleBar, { backgroundColor: skeletonColor }]} />
				<View style={[styles.skeletonSubtitleBar, { backgroundColor: skeletonColor }]} />
				<View style={styles.skeletonActionRow}>
					{[0, 1, 2, 3].map((i) => (
						<View key={i} style={[styles.skeletonActionTile, { backgroundColor: skeletonColor }]} />
					))}
				</View>
				<View style={[styles.skeletonSectionCard, { backgroundColor: skeletonColor }]} />
				<View style={[styles.skeletonSectionCard, { backgroundColor: skeletonColor }]} />
			</View>
		</View>
	);
}

// ── Body ─────────────────────────────────────────────────────────────────────
export default function MapProviderDetailBody({
	model,
	revealHero = false,
	onExpandedHeaderLayout,
}) {
	const provider = model?.provider ?? null;

	// All hooks must run unconditionally — defer the empty/loading branch
	// until *after* every hook is registered to satisfy Rules of Hooks.
	const heroSource = useMemo(() => getProviderHeroSource(provider), [provider]);
	const heroRevealProgress = useRef(new Animated.Value(revealHero ? 1 : 0)).current;
	useEffect(() => {
		Animated.spring(heroRevealProgress, {
			toValue: revealHero ? 1 : 0,
			tension: 64,
			friction: 11,
			useNativeDriver: false,
		}).start();
	}, [heroRevealProgress, revealHero]);

	if (!model || !provider) {
		return <ProviderDetailSkeleton skeletonColor={"rgba(148,163,184,0.16)"} />;
	}

	const {
		meta,
		tintColor,
		isDarkMode,
		titleColor,
		subtleColor,
		mutedColor,
		cardSurface,
		requestSurfaceColor,
		detailGradientColors,
		detailCardRadius,
		actionSurface,
		actionTint,
		summary,
		heroBadges,
		placeActions,
		placeStats,
		visitSignals,
		infoSections,
		detailStatus,
	} = model;

	const headerSubtitle = summary.addressLine || summary.subtitle || meta?.label || "Nearby provider";

	const placeMarkSurface = isDarkMode ? "rgba(15,23,42,0.52)" : cardSurface;
	const placeMarkIconColor = tintColor;
	const placeMarkBorderColor = "transparent";

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

	const heroFallbackColors = isDarkMode
		? ["#0F172A", "#1E293B", "#0F172A"]
		: ["#F1F5F9", "#FFFFFF", "#E2E8F0"];
	const heroImageOpacity = isDarkMode ? 0.92 : 0.9;

	// Resolved opaque surface beneath the place title — used by FadeEndText
	// so the trailing fade reads as a continuation of the chrome, not a strip.
	const titleFadeColor = isDarkMode ? "#0F172A" : "#FFFFFF";

	const heroHeight = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 270] });
	const heroOpacity = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
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
	const placeHeaderHeight = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 132] });
	const placeHeaderOpacity = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
	const placeHeaderMarginTop = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -64] });

	// ─ Shared sections renderer ────────────────────────────────────────────────
	const sectionsNode = (
		<View style={styles.sectionsStack}>
			{infoSections.map((section) => (
				<ProviderInfoSection
					key={section.key}
					section={section}
					titleColor={titleColor}
					mutedColor={mutedColor}
					surfaceColor={cardSurface}
					requestSurfaceColor={requestSurfaceColor}
					detailGradientColors={detailGradientColors}
					detailCardRadius={detailCardRadius}
					isDarkMode={isDarkMode}
				/>
			))}
		</View>
	);

	// ─ Hero block (image or fallback wash) ───────────────────────────────────
	const renderHeroContent = (badgeRowStyle) => (
		<>
			{heroBadges.length > 0 ? (
				<View style={badgeRowStyle}>
					{heroBadges.map((item, index) => {
						const badgeBg =
							item.tone === "verified"
								? "rgba(16,185,129,0.18)"
								: item.tone === "alert"
									? "rgba(225,29,72,0.18)"
									: `${tintColor}33`;
						return (
							<View
								key={`${item.label}-${index}`}
								style={[styles.heroBadge, { backgroundColor: badgeBg }]}
							>
								{renderIcon(item, "#F8FAFC")}
								<Text style={styles.heroBadgeText}>{item.label}</Text>
							</View>
						);
					})}
				</View>
			) : null}
		</>
	);

	// ─ EXPANDED HERO ────────────────────────────────────────────────────────
	if (revealHero) {
		return (
			<View style={styles.scrollContent}>
				<View style={styles.expandedCardWrap}>
					{heroSource ? (
						<ImageBackground
							source={heroSource}
							resizeMode="cover"
							fadeDuration={0}
							style={styles.expandedHero}
							imageStyle={{
								borderTopLeftRadius: 34,
								borderTopRightRadius: 34,
								borderCurve: "continuous",
								opacity: heroImageOpacity,
							}}
						>
							<LinearGradient pointerEvents="none" colors={expandedHeroShadeColors} style={StyleSheet.absoluteFillObject} />
							<LinearGradient pointerEvents="none" colors={expandedHeroTopMaskColors} style={styles.expandedHeroTopMask} />
							<LinearGradient pointerEvents="none" colors={expandedHeroBottomMergeColors} style={styles.expandedHeroBottomMerge} />
							{renderHeroContent(styles.expandedHeroBadgeRow)}
							<View style={styles.expandedHeaderBlock}>
								<View onLayout={onExpandedHeaderLayout} style={styles.expandedHeaderMeasure}>
									<View
										style={[
											styles.expandedPlaceMark,
											{ backgroundColor: placeMarkSurface, borderColor: placeMarkBorderColor },
										]}
									>
										<MaterialCommunityIcons
											name={meta?.iconName ?? "medical-bag"}
											size={24}
											color={placeMarkIconColor}
										/>
									</View>
									<FadeEndText
										text={summary.title}
										numberOfLines={2}
										fadeColor={titleFadeColor}
										fadeWidth={34}
										fadeRadius={14}
										containerStyle={styles.heroTitleFade}
										textStyle={[styles.expandedPlaceTitle, { color: titleColor }]}
									/>
									{headerSubtitle ? (
										<FadeEndText
											text={headerSubtitle}
											numberOfLines={2}
											fadeColor={titleFadeColor}
											fadeWidth={30}
											fadeRadius={12}
											containerStyle={styles.heroTitleFade}
											textStyle={[styles.expandedPlaceSubtitle, { color: subtleColor }]}
										/>
									) : null}
								</View>
							</View>
						</ImageBackground>
					) : (
						<View style={[styles.expandedHero, { overflow: "hidden", borderTopLeftRadius: 34, borderTopRightRadius: 34, borderCurve: "continuous" }]}>
							<LinearGradient pointerEvents="none" colors={heroFallbackColors} style={StyleSheet.absoluteFillObject} />
							<View style={[styles.heroTintWash, { backgroundColor: tintColor }]} />
							<LinearGradient pointerEvents="none" colors={expandedHeroShadeColors} style={StyleSheet.absoluteFillObject} />
							<LinearGradient pointerEvents="none" colors={expandedHeroBottomMergeColors} style={styles.expandedHeroBottomMerge} />
							{renderHeroContent(styles.expandedHeroBadgeRow)}
							<View style={styles.expandedHeaderBlock}>
								<View onLayout={onExpandedHeaderLayout} style={styles.expandedHeaderMeasure}>
									<View
										style={[
											styles.expandedPlaceMark,
											{ backgroundColor: placeMarkSurface, borderColor: placeMarkBorderColor },
										]}
									>
										<MaterialCommunityIcons
											name={meta?.iconName ?? "medical-bag"}
											size={24}
											color={placeMarkIconColor}
										/>
									</View>
									<FadeEndText
										text={summary.title}
										numberOfLines={2}
										fadeColor={titleFadeColor}
										fadeWidth={34}
										fadeRadius={14}
										containerStyle={styles.heroTitleFade}
										textStyle={[styles.expandedPlaceTitle, { color: titleColor }]}
									/>
									{headerSubtitle ? (
										<FadeEndText
											text={headerSubtitle}
											numberOfLines={2}
											fadeColor={titleFadeColor}
											fadeWidth={30}
											fadeRadius={12}
											containerStyle={styles.heroTitleFade}
											textStyle={[styles.expandedPlaceSubtitle, { color: subtleColor }]}
										/>
									) : null}
								</View>
							</View>
						</View>
					)}

					<View style={styles.expandedBody}>
						{placeActions.length > 0 ? (
							<View style={styles.placeActionRow}>
								{placeActions.map((item) => (
									<Pressable
										key={item.key}
										onPress={item.onPress}
										disabled={item.disabled || !item.onPress}
										accessibilityRole="button"
										accessibilityLabel={item.accessibilityLabel}
										style={styles.placeActionPressable}
									>
										{({ pressed }) => (
											<View
												style={[
													styles.placeActionButton,
													item.primary
														? [styles.placeActionButtonPrimary, { backgroundColor: tintColor, shadowColor: tintColor }]
														: { backgroundColor: actionSurface },
													item.disabled ? styles.placeActionButtonDisabled : null,
													pressed ? styles.placeActionButtonPressed : null,
												]}
											>
												{renderIcon(item, item.primary ? "#F8FAFC" : actionTint, item.primary ? 19 : 16)}
												<Text
													numberOfLines={1}
													style={[
														styles.placeActionLabel,
														{ color: item.primary ? "#F8FAFC" : actionTint },
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

						{placeStats.length > 0 ? (
							<View style={styles.placeStatsCard}>
								{placeStats.map((item, index) => (
									<View key={`${item.label}-${index}`} style={styles.placeStatItem}>
										<Text numberOfLines={1} style={[styles.placeStatLabel, { color: subtleColor }]}>
											{item.label}
										</Text>
										<View style={styles.placeStatValueRow}>
											{renderIcon(item, item.tone === "rating" ? "#FBBF24" : subtleColor, 15)}
											<Text numberOfLines={1} style={[styles.placeStatValue, { color: titleColor }]}>
												{item.value}
											</Text>
										</View>
									</View>
								))}
							</View>
						) : null}

						<ProviderVisitSignals
							signals={visitSignals}
							tintColor={tintColor}
							titleColor={titleColor}
							mutedColor={mutedColor}
							rowSurface={model.rowSurface}
							isDarkMode={isDarkMode}
						/>

						<ProviderDetailNotice
							detailStatus={detailStatus}
							titleColor={titleColor}
							mutedColor={mutedColor}
							rowSurface={model.rowSurface}
							tintColor={tintColor}
						/>

						{sectionsNode}
					</View>
				</View>
			</View>
		);
	}

	// ─ HALF HERO (default detent) ───────────────────────────────────────────
	return (
		<View style={styles.scrollContent}>
			<Animated.View style={[styles.heroRevealFrame, { height: heroHeight, opacity: heroOpacity }]}>
				{heroSource ? (
					<ImageBackground
						source={heroSource}
						resizeMode="cover"
						fadeDuration={0}
						style={styles.hero}
						imageStyle={{
							borderTopLeftRadius: 34,
							borderTopRightRadius: 34,
							borderCurve: "continuous",
							opacity: heroImageOpacity,
						}}
					>
						<LinearGradient pointerEvents="none" colors={heroBlendColors} style={styles.heroBlend} />
						<LinearGradient pointerEvents="none" colors={heroBottomMergeColors} style={styles.heroBottomMerge} />
						<LinearGradient pointerEvents="none" colors={heroTopMaskColors} style={styles.heroTopMask} />
						{renderHeroContent(styles.heroBadgeRow)}
						<View style={styles.heroFooter} />
					</ImageBackground>
				) : (
					<View style={styles.hero}>
						<LinearGradient pointerEvents="none" colors={heroFallbackColors} style={StyleSheet.absoluteFillObject} />
						<View style={[styles.heroTintWash, { backgroundColor: tintColor }]} />
						<LinearGradient pointerEvents="none" colors={heroBlendColors} style={styles.heroBlend} />
						<LinearGradient pointerEvents="none" colors={heroBottomMergeColors} style={styles.heroBottomMerge} />
						<LinearGradient pointerEvents="none" colors={heroTopMaskColors} style={styles.heroTopMask} />
						{renderHeroContent(styles.heroBadgeRow)}
						<View style={styles.heroFooter} />
					</View>
				)}
			</Animated.View>

			<Animated.View
				style={[styles.detailPanel, { marginTop: detailPanelMarginTop, paddingTop: detailPanelPaddingTop }]}
			>
				<View style={styles.detailPanelContent}>
					<Animated.View
						style={[
							styles.placeHeaderReveal,
							{ height: placeHeaderHeight, opacity: placeHeaderOpacity, marginTop: placeHeaderMarginTop },
						]}
					>
						<View style={styles.placeHeader}>
							<View style={[styles.placeMark, { backgroundColor: placeMarkSurface, borderColor: placeMarkBorderColor }]}>
								<MaterialCommunityIcons
									name={meta?.iconName ?? "medical-bag"}
									size={24}
									color={placeMarkIconColor}
								/>
							</View>
							<FadeEndText
								text={summary.title}
								numberOfLines={2}
								fadeColor={titleFadeColor}
								fadeWidth={34}
								fadeRadius={14}
								containerStyle={styles.heroTitleFade}
								textStyle={[styles.placeTitle, { color: titleColor }]}
							/>
							{headerSubtitle ? (
								<FadeEndText
									text={headerSubtitle}
									numberOfLines={2}
									fadeColor={titleFadeColor}
									fadeWidth={30}
									fadeRadius={12}
									containerStyle={styles.heroTitleFade}
									textStyle={[styles.placeSubtitle, { color: subtleColor }]}
								/>
							) : null}
						</View>
					</Animated.View>

					{placeActions.length > 0 ? (
						<Animated.View style={[styles.placeActionRow, { marginTop: actionRowMarginTop }]}>
							{placeActions.map((item) => (
								<Pressable
									key={item.key}
									onPress={item.onPress}
									disabled={item.disabled || !item.onPress}
									accessibilityRole="button"
									accessibilityLabel={item.accessibilityLabel}
									style={styles.placeActionPressable}
								>
									{({ pressed }) => (
										<View
											style={[
												styles.placeActionButton,
												item.primary
													? [styles.placeActionButtonPrimary, { backgroundColor: tintColor, shadowColor: tintColor }]
													: { backgroundColor: actionSurface },
												item.disabled ? styles.placeActionButtonDisabled : null,
												pressed ? styles.placeActionButtonPressed : null,
											]}
										>
											{renderIcon(item, item.primary ? "#F8FAFC" : actionTint, item.primary ? 19 : 16)}
											<Text
												numberOfLines={1}
												style={[
													styles.placeActionLabel,
													{ color: item.primary ? "#F8FAFC" : actionTint },
												]}
											>
												{item.label}
											</Text>
										</View>
									)}
								</Pressable>
							))}
						</Animated.View>
					) : null}

					{placeStats.length > 0 ? (
						<View style={styles.placeStatsCard}>
							{placeStats.map((item, index) => (
								<View key={`${item.label}-${index}`} style={styles.placeStatItem}>
									<Text numberOfLines={1} style={[styles.placeStatLabel, { color: subtleColor }]}>
										{item.label}
									</Text>
									<View style={styles.placeStatValueRow}>
										{renderIcon(item, item.tone === "rating" ? "#FBBF24" : subtleColor, 15)}
										<Text numberOfLines={1} style={[styles.placeStatValue, { color: titleColor }]}>
											{item.value}
										</Text>
									</View>
								</View>
							))}
						</View>
					) : null}

					<ProviderVisitSignals
						signals={visitSignals}
						tintColor={tintColor}
						titleColor={titleColor}
						mutedColor={mutedColor}
						rowSurface={model.rowSurface}
						isDarkMode={isDarkMode}
					/>

					<ProviderDetailNotice
						detailStatus={detailStatus}
						titleColor={titleColor}
						mutedColor={mutedColor}
						rowSurface={model.rowSurface}
						tintColor={tintColor}
					/>

					{sectionsNode}
				</View>
			</Animated.View>
		</View>
	);
}
