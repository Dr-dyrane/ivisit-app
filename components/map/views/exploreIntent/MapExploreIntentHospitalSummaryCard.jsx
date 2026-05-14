import React, { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { triggerPress } from "../../../../services/hapticService";
import { MAP_EXPLORE_INTENT_COPY, MAP_INTENT_VARIANTS } from "./mapExploreIntent.content";
import styles from "./mapExploreIntent.styles";

function SummaryIconTile({ children, isDarkMode, compact = false, size = null }) {
	const colors = isDarkMode
		? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.06)"]
		: ["#FFFFFF", "#EAF0F7"];
	const resolvedSize = size || (compact ? 30 : 42);
	const resolvedRadius = Math.round(resolvedSize / 2);

	return (
		<View
			style={[
				styles.summaryIconShell,
				compact ? styles.summaryIconShellCompact : null,
				{
					width: resolvedSize,
					height: resolvedSize,
					borderRadius: compact ? resolvedRadius : Math.round(resolvedSize * 0.38),
				},
			]}
		>
			<LinearGradient
				colors={colors}
				start={{ x: 0.08, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[
					styles.summaryIconFill,
					compact ? styles.summaryIconFillCompact : null,
					{ borderRadius: compact ? Math.max(resolvedRadius - 1, 12) : Math.round(resolvedSize * 0.36) },
				]}
			>
				<View pointerEvents="none" style={styles.summaryIconHighlight} />
				{children}
			</LinearGradient>
		</View>
	);
}

function SummaryHeroMetric({ label, value, surfaceColor, tokens }) {
	return (
		<View
			style={[
				styles.summaryHeroMetric,
				{
					backgroundColor: surfaceColor || tokens.mutedCardSurface,
				},
			]}
		>
			<Text numberOfLines={1} style={[styles.summaryHeroMetricLabel, { color: tokens.mutedText }]}>
				{label}
			</Text>
			<Text numberOfLines={1} style={[styles.summaryHeroMetricValue, { color: tokens.titleColor }]}>
				{value}
			</Text>
		</View>
	);
}

function HospitalTitleLine({
	children,
	style,
	color,
	fadeColor,
	isDarkMode,
}) {
	const transparentFade = isDarkMode ? "rgba(15,23,42,0)" : "rgba(255,255,255,0)";
	const isWeb = Platform.OS === "web";
	return (
		<View style={styles.hospitalTitleClip}>
			<Text
				numberOfLines={isWeb ? undefined : 1}
				ellipsizeMode="clip"
				style={[
					styles.hospitalTitle,
					styles.hospitalTitleClippedText,
					isWeb ? styles.hospitalTitleClippedTextWeb : null,
					style,
					{ color },
				]}
			>
				{children}
			</Text>
			<LinearGradient
				pointerEvents="none"
				colors={[transparentFade, fadeColor]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 0 }}
				style={styles.hospitalTitleFade}
			/>
		</View>
	);
}

function SummaryLoadingCopy({ hero = false }) {
	// PULLBACK NOTE: Pass C — 6s timeout fallback when data never arrives (E-2.9)
	// OLD: skeleton rendered indefinitely — no recovery if location denied or network stalls
	// NEW: after 6s, show neutral fallback copy instead of permanent loading bones
	const [timedOut, setTimedOut] = useState(false);
	useEffect(() => {
		const t = setTimeout(() => setTimedOut(true), 6000);
		return () => clearTimeout(t);
	}, []);

	if (timedOut) {
		return (
			<View style={[styles.summaryLoadingCopy, hero ? styles.summaryLoadingCopyHero : null]}>
				<Text style={[styles.hospitalEyebrow, { color: "rgba(100,116,139,0.6)" }]}>
					{MAP_EXPLORE_INTENT_COPY.NEAREST_HOSPITAL}
				</Text>
				<Text style={[styles.hospitalTitle, { color: "rgba(100,116,139,0.54)" }]}>
					{MAP_EXPLORE_INTENT_COPY.TAP_TO_SEE_HOSPITALS}
				</Text>
			</View>
		);
	}

	return (
		<View style={[styles.summaryLoadingCopy, hero ? styles.summaryLoadingCopyHero : null]}>
			<View
				style={[
					styles.summaryLoadingLine,
					styles.summaryLoadingLineKicker,
					hero ? styles.summaryLoadingLineHeroKicker : null,
				]}
			/>
			<View
				style={[
					styles.summaryLoadingLine,
					styles.summaryLoadingLineTitle,
					hero ? styles.summaryLoadingLineHeroTitle : null,
				]}
			/>
			<View
				style={[
					styles.summaryLoadingLine,
					styles.summaryLoadingLineMeta,
					hero ? styles.summaryLoadingLineHeroMeta : null,
				]}
			/>
		</View>
	);
}

export default function MapExploreIntentHospitalSummaryCard({
	variant = MAP_INTENT_VARIANTS.IOS_MOBILE,
	layoutMode = "canonical",
	isCentered = false,
	maxWidth = null,
	tokens,
	isDarkMode,
	nearestHospital,
	nearestHospitalMeta = [],
	currentLocation = null,
	locationControl = null,
	nearbyHospitalCount = 0,
	totalAvailableBeds = 0,
	onOpenHospitals,
	onUseCurrentLocation,
	onOpenLocationSearch,
	responsiveMetrics,
}) {
	const summaryIconSize = responsiveMetrics?.summary?.iconSize || 42;
	const summaryCompactIconSize = responsiveMetrics?.summary?.compactIconSize || 30;
	const canonicalCardResponsiveStyle = responsiveMetrics?.summary?.cardStyle || null;
	const heroCardResponsiveStyle = responsiveMetrics?.summary?.heroCardStyle || null;
	const eyebrowTextStyle = responsiveMetrics?.summary?.eyebrowStyle || null;
	const titleTextStyle = responsiveMetrics?.summary?.titleStyle || null;
	const metaTextStyle = responsiveMetrics?.summary?.metaStyle || null;
	const signalPillStyle = responsiveMetrics?.summary?.signalPillStyle || null;
	const signalTextStyle = responsiveMetrics?.summary?.signalTextStyle || null;
	const isTightViewport = Boolean(responsiveMetrics?.isTight);
	const isWebMobileVariant =
		variant === MAP_INTENT_VARIANTS.WEB_MOBILE ||
		variant === MAP_INTENT_VARIANTS.WEB_SM_WIDE ||
		variant === MAP_INTENT_VARIANTS.WEB_MD;
	const usesCanonicalSummaryLayout =
		layoutMode === "canonical" || layoutMode === "web_canonical";
	const usesHeroSummaryLayout = layoutMode === "hero";
	const isSummaryLoading = !nearestHospital?.name;
	const requiresLocationSelection = Boolean(
		locationControl?.requiresLocationSelection,
	);
	// PULLBACK NOTE (Pass 3): locationActionLabel, manualActionLabel, locationHint were used
	// by the inline location setup card. Kept as dead vars for rollback safety.
	// eslint-disable-next-line no-unused-vars
	const locationActionLabel =
		locationControl?.currentLocationActionLabel || "Use device location";
	// eslint-disable-next-line no-unused-vars
	const manualActionLabel =
		locationControl?.manualEntryActionLabel || "Enter address manually";
	// eslint-disable-next-line no-unused-vars
	const locationHint =
		locationControl?.locationError ||
		currentLocation?.secondaryText ||
		"Turn on location or enter a pickup area manually.";
	const heroMeta = nearestHospitalMeta.filter(Boolean).join(" | ");
	const hasNearbyHospitals = nearbyHospitalCount > 0;
	const summaryEyebrow = hasNearbyHospitals
		? MAP_EXPLORE_INTENT_COPY.NEAREST_HOSPITAL
		: MAP_EXPLORE_INTENT_COPY.WIDER_CARE;
	const summaryMetaText = nearestHospitalMeta.join(" | ");
	// PULLBACK NOTE: UX-B Issue 5 — hospital card data boundary
	// OLD: heroMetrics included network-level "Nearby hospitals" + "Beds open" tiles
	// NEW: hospital cards show only hospital-specific data; network totals belong in orb subtexts
	const heroMetrics = [
		{
			label: "Closest route",
			value: nearestHospitalMeta[0] || "Live route",
			surfaceColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(134,16,14,0.08)",
		},
	];

	// PULLBACK NOTE: Pass D — accessibilityLabel derived from content (E-2.12)
	const cardAccessibilityLabel = nearestHospital?.name
		? `${nearestHospital.name}${nearestHospitalMeta.length > 0 ? `, ${nearestHospitalMeta.join(", ")}` : ""}`
		: MAP_EXPLORE_INTENT_COPY.TAP_TO_SEE_HOSPITALS;

	if (requiresLocationSelection) {
		// PULLBACK NOTE (Pass 3 — Explore Intent Decongestion):
		// OLD: Rendered an inline location setup card with primary/secondary action CTAs.
		// NEW: Return null — useMapLocationIntent auto-transitions the sheet to
		// LOCATION_INTENT phase, which is now the sole owner of pickup location entry.
		// The LocationChrome chip above the sheet remains visible for change affordance.
		return null;
	}

	if (usesCanonicalSummaryLayout)
	if (usesCanonicalSummaryLayout) {
		return (
			<Pressable
				onPress={onOpenHospitals}
				// PULLBACK NOTE: Pass A — Medium haptic on hospital card tap (E-2.2)
				onPressIn={() => triggerPress("medium")}
				accessibilityRole="button"
				accessibilityLabel={cardAccessibilityLabel}
				style={({ pressed }) => [
					styles.hospitalCard,
					isCentered ? styles.hospitalCardCentered : null,
					isCentered && maxWidth ? { maxWidth } : null,
					pressed ? styles.hospitalCardPressed : null,
					{
						borderRadius: tokens.cardRadius,
						borderCurve: "continuous",
						backgroundColor: tokens.strongCardSurface,
					},
					canonicalCardResponsiveStyle,
				]}
			>
				<SummaryIconTile isDarkMode={isDarkMode} size={summaryIconSize}>
					<MaterialCommunityIcons
						name="hospital-building"
						size={isTightViewport ? 16 : 18}
						color={isDarkMode ? "#F8FAFC" : "#86100E"}
					/>
				</SummaryIconTile>
				<View style={styles.hospitalCardCopy}>
					{isSummaryLoading ? (
						<SummaryLoadingCopy />
					) : (
						<>
							<Text style={[styles.hospitalEyebrow, eyebrowTextStyle, { color: tokens.mutedText }]}>
								{summaryEyebrow}
							</Text>
							<HospitalTitleLine
								style={titleTextStyle}
								color={tokens.titleColor}
								fadeColor={tokens.strongCardSurface}
								isDarkMode={isDarkMode}
							>
								{nearestHospital?.name || MAP_EXPLORE_INTENT_COPY.FINDING_NEAREST_HOSPITAL}
							</HospitalTitleLine>
							<Text numberOfLines={1} style={[styles.hospitalMeta, metaTextStyle, { color: tokens.bodyText }]}>
								{summaryMetaText ||
									(hasNearbyHospitals
										? MAP_EXPLORE_INTENT_COPY.TAP_TO_SEE_HOSPITALS
										: MAP_EXPLORE_INTENT_COPY.SEE_WIDER_HOSPITALS)}
							</Text>
						</>
					)}
					{/* PULLBACK NOTE: UX-B Issue 5 — network-level counts removed from hospital card body */}
					{/* OLD: nearbyHospitalCount + totalAvailableBeds signal pills shown on card */}
					{/* NEW: hospital cards show only hospital-specific data; network totals live in orb subtexts */}
				</View>
				<View style={[styles.hospitalCardCta, { backgroundColor: tokens.mutedCardSurface }]}>
					<Text style={[styles.hospitalCardCtaText, { color: tokens.titleColor }]}>
						{MAP_EXPLORE_INTENT_COPY.BROWSE}
					</Text>
					<Ionicons name="chevron-forward" size={isTightViewport ? 13 : 14} color={tokens.titleColor} />
				</View>
			</Pressable>
		);
	}

	if (usesHeroSummaryLayout) {
		return (
			<Pressable
				onPress={onOpenHospitals}
				// PULLBACK NOTE: Pass A — Medium haptic on hospital card tap (E-2.2)
				onPressIn={() => triggerPress("medium")}
				accessibilityRole="button"
				accessibilityLabel={cardAccessibilityLabel}
				style={({ pressed }) => [
					styles.summaryHeroCard,
					isCentered ? styles.hospitalCardCentered : null,
					isCentered && maxWidth ? { maxWidth } : null,
					pressed ? styles.hospitalCardPressed : null,
					{
						borderRadius: tokens.cardRadius,
						borderCurve: "continuous",
						backgroundColor: tokens.strongCardSurface,
					},
					heroCardResponsiveStyle,
				]}
			>
				<LinearGradient
					pointerEvents="none"
					colors={
						isDarkMode
							? ["rgba(134,16,14,0.22)", "rgba(134,16,14,0.08)", "rgba(255,255,255,0.02)"]
							: ["rgba(134,16,14,0.12)", "rgba(134,16,14,0.04)", "rgba(255,255,255,0)"]
					}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.summaryHeroGlow}
				/>
				<View style={styles.summaryHeroHeader}>
					<View style={[styles.summaryHeroBadge, { backgroundColor: tokens.mutedCardSurface }]}>
						{isSummaryLoading ? (
							<View style={styles.summaryHeroBadgeSkeleton} />
						) : (
							<Text style={[styles.summaryHeroBadgeText, { color: tokens.mutedText }]}>
								{MAP_EXPLORE_INTENT_COPY.NOW}
							</Text>
						)}
					</View>
					<SummaryIconTile isDarkMode={isDarkMode} size={summaryIconSize}>
						<MaterialCommunityIcons
							name="hospital-building"
							size={isTightViewport ? 16 : 18}
							color={isDarkMode ? "#F8FAFC" : "#86100E"}
						/>
					</SummaryIconTile>
				</View>
				<View style={styles.summaryHeroCopy}>
					{isSummaryLoading ? (
						<SummaryLoadingCopy hero />
					) : (
						<>
							<Text style={[styles.summaryHeroEyebrow, eyebrowTextStyle, { color: tokens.mutedText }]}>
								{hasNearbyHospitals ? "Closest hospital" : MAP_EXPLORE_INTENT_COPY.WIDER_CARE}
							</Text>
							<Text numberOfLines={2} style={[styles.summaryHeroTitle, titleTextStyle, { color: tokens.titleColor }]}>
								{nearestHospital?.name || MAP_EXPLORE_INTENT_COPY.FINDING_NEAREST_HOSPITAL}
							</Text>
							<Text numberOfLines={2} style={[styles.summaryHeroMeta, metaTextStyle, { color: tokens.bodyText }]}>
								{heroMeta || MAP_EXPLORE_INTENT_COPY.TAP_TO_SEE_HOSPITALS}
							</Text>
						</>
					)}
				</View>
				<View style={styles.summaryHeroMetricGrid}>
					{heroMetrics.map((metric) => (
						<SummaryHeroMetric
							key={metric.label}
							label={metric.label}
							value={metric.value}
							surfaceColor={metric.surfaceColor}
							tokens={tokens}
						/>
					))}
				</View>
				<View style={styles.summaryHeroFooter}>
					<View style={[styles.summaryHeroActionPill, { backgroundColor: tokens.mutedCardSurface }]}>
						<Text style={[styles.summaryHeroActionText, { color: tokens.titleColor }]}>
							{MAP_EXPLORE_INTENT_COPY.BROWSE}
						</Text>
						<Ionicons name="arrow-forward" size={14} color={tokens.titleColor} />
					</View>
					{/* PULLBACK NOTE: UX-B Issue 5 — nearbyHospitalCount hint removed from hero card footer */}
					{/* Network count belongs in orb subtext, not in individual hospital card */}
				</View>
			</Pressable>
		);
	}

	return (
		<Pressable
			onPress={onOpenHospitals}
			// PULLBACK NOTE: Pass A — Medium haptic on hospital card tap (E-2.2)
			onPressIn={() => triggerPress("medium")}
			accessibilityRole="button"
			accessibilityLabel={cardAccessibilityLabel}
			style={[
				styles.intentStatusCard,
				isWebMobileVariant ? styles.intentStatusCardWebMobile : null,
				canonicalCardResponsiveStyle,
				{
					borderRadius: tokens.cardRadius,
					borderCurve: "continuous",
					backgroundColor: tokens.strongCardSurface,
				},
			]}
		>
			<View style={styles.intentStatusHeader}>
				<SummaryIconTile isDarkMode={isDarkMode} size={summaryIconSize}>
					<MaterialCommunityIcons
						name="hospital-building"
						size={isTightViewport ? 16 : 18}
						color={isDarkMode ? "#F8FAFC" : "#86100E"}
					/>
				</SummaryIconTile>
				<View style={styles.intentStatusCopy}>
					<Text style={[styles.hospitalEyebrow, eyebrowTextStyle, { color: tokens.mutedText }]}>
						{hasNearbyHospitals
							? MAP_EXPLORE_INTENT_COPY.NEARBY_CARE
							: MAP_EXPLORE_INTENT_COPY.WIDER_CARE}
					</Text>
					<Text numberOfLines={1} style={[styles.intentStatusTitle, titleTextStyle, { color: tokens.titleColor }]}>
						{nearestHospital?.name || MAP_EXPLORE_INTENT_COPY.FINDING_NEARBY_HOSPITAL}
					</Text>
					<Text numberOfLines={1} style={[styles.intentStatusMeta, metaTextStyle, { color: tokens.bodyText }]}>
						{summaryMetaText ||
							(hasNearbyHospitals
								? MAP_EXPLORE_INTENT_COPY.SEE_NEARBY_HOSPITALS
								: MAP_EXPLORE_INTENT_COPY.SEE_WIDER_HOSPITALS)}
					</Text>
				</View>
				<SummaryIconTile isDarkMode={isDarkMode} compact size={summaryCompactIconSize}>
					<Ionicons name="chevron-forward" size={isTightViewport ? 14 : 15} color={tokens.titleColor} />
				</SummaryIconTile>
			</View>

			{/* PULLBACK NOTE: UX-B Issue 5 — network-level signal pills removed from status card */}
			{/* OLD: nearbyHospitalCount/SHOWING_WIDER_OPTIONS pill + totalAvailableBeds pill */}
			{/* NEW: hospital cards show only hospital-specific data; network totals in orb subtexts */}
		</Pressable>
	);
}
