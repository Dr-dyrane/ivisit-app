import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
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
	const locationActionLabel =
		locationControl?.currentLocationActionLabel || "Use device location";
	const manualActionLabel =
		locationControl?.manualEntryActionLabel || "Enter address manually";
	const locationHint =
		locationControl?.locationError ||
		currentLocation?.secondaryText ||
		"Turn on location or enter a pickup area manually.";
	const heroMeta = nearestHospitalMeta.filter(Boolean).join(" | ");
	const heroMetrics = [
		{
			label: "Closest route",
			value: nearestHospitalMeta[0] || "Live route",
			surfaceColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(134,16,14,0.08)",
		},
		{
			label: "Nearby hospitals",
			value: nearbyHospitalCount > 0 ? String(nearbyHospitalCount) : "Loading",
			surfaceColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
		},
		{
			label: "Beds open",
			value: totalAvailableBeds > 0 ? String(totalAvailableBeds) : "Checking",
			surfaceColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
		},
	];

	// PULLBACK NOTE: Pass D — accessibilityLabel derived from content (E-2.12)
	const cardAccessibilityLabel = nearestHospital?.name
		? `${nearestHospital.name}${nearestHospitalMeta.length > 0 ? `, ${nearestHospitalMeta.join(", ")}` : ""}`
		: MAP_EXPLORE_INTENT_COPY.TAP_TO_SEE_HOSPITALS;

	if (requiresLocationSelection) {
		return (
			<View
				style={[
					styles.hospitalCard,
					styles.locationSetupCard,
					isCentered ? styles.hospitalCardCentered : null,
					isCentered && maxWidth ? { maxWidth } : null,
					{
						borderRadius: tokens.cardRadius,
						borderCurve: "continuous",
						backgroundColor: tokens.strongCardSurface,
					},
					canonicalCardResponsiveStyle,
				]}
			>
				<SummaryIconTile isDarkMode={isDarkMode} size={summaryIconSize}>
					<Ionicons
						name={locationControl?.shouldOpenSettings ? "location-outline" : "locate"}
						size={isTightViewport ? 16 : 18}
						color={isDarkMode ? "#F8FAFC" : "#86100E"}
					/>
				</SummaryIconTile>
				<View style={styles.hospitalCardCopy}>
					<Text style={[styles.hospitalEyebrow, eyebrowTextStyle, { color: tokens.mutedText }]}>
						Pickup area
					</Text>
					<Text
						numberOfLines={1}
						style={[styles.hospitalTitle, titleTextStyle, { color: tokens.titleColor }]}
					>
						{currentLocation?.primaryText || "Set pickup area"}
					</Text>
					<Text
						style={[styles.hospitalMeta, metaTextStyle, { color: tokens.bodyText }]}
					>
						{locationHint}
					</Text>
					<View style={styles.locationSetupActionRow}>
						<Pressable
							onPress={onUseCurrentLocation}
							onPressIn={() => triggerPress("medium")}
							style={({ pressed }) => [
								styles.locationSetupPrimaryAction,
								{
									backgroundColor: isDarkMode
										? "rgba(134,16,14,0.24)"
										: "rgba(134,16,14,0.10)",
									opacity: pressed ? 0.9 : 1,
								},
							]}
						>
							<Ionicons
								name={locationControl?.shouldOpenSettings ? "settings-outline" : "locate-outline"}
								size={14}
								color={tokens.titleColor}
							/>
							<Text
								style={[
									styles.locationSetupPrimaryText,
									{ color: tokens.titleColor },
								]}
							>
								{locationActionLabel}
							</Text>
						</Pressable>
						<Pressable
							onPress={onOpenLocationSearch}
							onPressIn={() => triggerPress("light")}
							style={({ pressed }) => [
								styles.locationSetupSecondaryAction,
								{
									backgroundColor: tokens.mutedCardSurface,
									opacity: pressed ? 0.92 : 1,
								},
							]}
						>
							<Ionicons
								name="search-outline"
								size={14}
								color={tokens.titleColor}
							/>
							<Text
								style={[
									styles.locationSetupSecondaryText,
									{ color: tokens.titleColor },
								]}
							>
								{manualActionLabel}
							</Text>
						</Pressable>
					</View>
				</View>
			</View>
		);
	}

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
								{MAP_EXPLORE_INTENT_COPY.NEAREST_HOSPITAL}
							</Text>
							<Text numberOfLines={1} style={[styles.hospitalTitle, titleTextStyle, { color: tokens.titleColor }]}>
								{nearestHospital?.name || MAP_EXPLORE_INTENT_COPY.FINDING_NEAREST_HOSPITAL}
							</Text>
							<Text numberOfLines={1} style={[styles.hospitalMeta, metaTextStyle, { color: tokens.bodyText }]}>
								{nearestHospitalMeta.join(" • ") || MAP_EXPLORE_INTENT_COPY.TAP_TO_SEE_HOSPITALS}
							</Text>
						</>
					)}
					{nearbyHospitalCount > 0 || totalAvailableBeds > 0 ? (
						<View style={styles.intentSignalRow}>
							{nearbyHospitalCount > 0 ? (
								<View style={[styles.intentSignalPill, signalPillStyle, { backgroundColor: tokens.mutedCardSurface }]}>
									<Text numberOfLines={1} style={[styles.intentSignalText, signalTextStyle, { color: tokens.titleColor }]}>
										{`${nearbyHospitalCount} nearby`}
									</Text>
								</View>
							) : null}
							{totalAvailableBeds > 0 ? (
								<View style={[styles.intentSignalPill, signalPillStyle, { backgroundColor: tokens.mutedCardSurface }]}>
									<Text numberOfLines={1} style={[styles.intentSignalText, signalTextStyle, { color: tokens.titleColor }]}>
										{`${totalAvailableBeds} beds`}
									</Text>
								</View>
							) : null}
						</View>
					) : null}
				</View>
				<SummaryIconTile isDarkMode={isDarkMode} compact size={summaryCompactIconSize}>
					<Ionicons name="chevron-forward" size={isTightViewport ? 14 : 15} color={tokens.titleColor} />
				</SummaryIconTile>
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
								Closest hospital
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
							Open hospital list
						</Text>
						<Ionicons name="arrow-forward" size={14} color={tokens.titleColor} />
					</View>
					<Text numberOfLines={1} style={[styles.summaryHeroHint, { color: tokens.mutedText }]}>
						{nearbyHospitalCount > 0
							? `${nearbyHospitalCount} options ready`
							: "Loading nearby network"}
					</Text>
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
						{MAP_EXPLORE_INTENT_COPY.NEARBY_CARE}
					</Text>
					<Text numberOfLines={1} style={[styles.intentStatusTitle, titleTextStyle, { color: tokens.titleColor }]}>
						{nearestHospital?.name || MAP_EXPLORE_INTENT_COPY.FINDING_NEARBY_HOSPITAL}
					</Text>
					<Text numberOfLines={1} style={[styles.intentStatusMeta, metaTextStyle, { color: tokens.bodyText }]}>
						{nearestHospitalMeta.join(" | ") || MAP_EXPLORE_INTENT_COPY.SEE_NEARBY_HOSPITALS}
					</Text>
				</View>
				<SummaryIconTile isDarkMode={isDarkMode} compact size={summaryCompactIconSize}>
					<Ionicons name="chevron-forward" size={isTightViewport ? 14 : 15} color={tokens.titleColor} />
				</SummaryIconTile>
			</View>

			<View style={styles.intentSignalRow}>
				<View style={[styles.intentSignalPill, signalPillStyle, { backgroundColor: tokens.mutedCardSurface }]}>
					<Text numberOfLines={1} style={[styles.intentSignalText, signalTextStyle, { color: tokens.titleColor }]}>
						{nearbyHospitalCount > 0
							? `${nearbyHospitalCount} nearby`
							: MAP_EXPLORE_INTENT_COPY.NEARBY_CARE}
					</Text>
				</View>
				{totalAvailableBeds > 0 ? (
					<View style={[styles.intentSignalPill, signalPillStyle, { backgroundColor: tokens.mutedCardSurface }]}>
						<Text numberOfLines={1} style={[styles.intentSignalText, signalTextStyle, { color: tokens.titleColor }]}>
							{`${totalAvailableBeds} beds`}
						</Text>
					</View>
				) : null}
			</View>
		</Pressable>
	);
}
