// components/map/surfaces/providerDetail/MapProviderDetailBody.jsx
//
// Body surface for PROVIDER_DETAIL sheet phase.
// Mirrors MapHospitalDetailBody exactly:
//   - Animated.Value heroRevealProgress (spring, useNativeDriver: false)
//   - Hero: tinted gradient (no photo) with badge row and footer spacer
//   - Detail panel overlaps hero bottom with exact hospital tokens
//   - Animated place header (mark + title + address)
//   - Action row, stats row, info block
//
// Consumed via MapProviderDetailStageParts → MapProviderDetailStageBase.

import React, { useEffect, useMemo, useRef } from "react";
import {
	Animated,
	Linking,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "./mapProviderDetail.styles";

// Exact offsets from MapHospitalDetailBody
const HALF_PANEL_OVERLAY_OFFSET          = -16;
const EXPANDED_PANEL_OVERLAY_OFFSET      = -76;
const HALF_PANEL_TOP_PADDING             = 20;
const EXPANDED_PANEL_TOP_PADDING         = 46;
const HALF_ACTION_ROW_HEADER_CLEARANCE   = 46;
const EXPANDED_ACTION_ROW_HEADER_CLEARANCE = 0;

function renderIcon(item, color, size = 14) {
	if (item.iconType === "material") {
		return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
	}
	return <Ionicons name={item.icon} size={size} color={color} />;
}

export default function MapProviderDetailBody({
	model,
	revealHero = false,
	onExpandedHeaderLayout,
}) {
	const {
		tintColor,
		isDarkMode,
		titleColor,
		subtleColor,
		cardSurface,
		actionSurface,
		actionTint,
		meta,
		heroBadges,
		placeActions,
		placeStats,
		infoRows,
		summary,
	} = model;

	// ─── Animated hero reveal — exact hospital pattern ────────────────────────
	const heroRevealProgress = useRef(new Animated.Value(revealHero ? 1 : 0)).current;

	useEffect(() => {
		Animated.spring(heroRevealProgress, {
			toValue: revealHero ? 1 : 0,
			tension: 64,
			friction: 11,
			useNativeDriver: false,
		}).start();
	}, [heroRevealProgress, revealHero]);

	const heroHeight   = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 270] });
	const heroOpacity  = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
	const detailPanelMarginTop  = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [HALF_PANEL_OVERLAY_OFFSET, EXPANDED_PANEL_OVERLAY_OFFSET] });
	const detailPanelPaddingTop = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [HALF_PANEL_TOP_PADDING, EXPANDED_PANEL_TOP_PADDING] });
	const actionRowMarginTop    = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [HALF_ACTION_ROW_HEADER_CLEARANCE, EXPANDED_ACTION_ROW_HEADER_CLEARANCE] });
	const placeHeaderHeight     = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 132] });
	const placeHeaderOpacity    = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
	const placeHeaderMarginTop  = heroRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -64] });

	// ─── Color tokens ─────────────────────────────────────────────────────────
	const heroGradientColors = isDarkMode
		? [`${tintColor}52`, `${tintColor}38`, `${tintColor}22`, `${tintColor}0A`]
		: [`${tintColor}3A`, `${tintColor}26`, `${tintColor}14`, `${tintColor}04`];
	const heroBlendColors = isDarkMode
		? ["rgba(8,15,27,0)", "rgba(8,15,27,0.14)", "rgba(8,15,27,0.26)", "rgba(8,15,27,0.40)"]
		: ["rgba(248,250,252,0)", "rgba(248,250,252,0.08)", "rgba(248,250,252,0.16)", "rgba(248,250,252,0.32)"];
	const heroBottomMergeColors = isDarkMode
		? ["rgba(8,15,27,0)", "rgba(8,15,27,0.10)", "rgba(8,15,27,0.28)", "rgba(8,15,27,0.58)"]
		: ["rgba(255,255,255,0)", "rgba(255,255,255,0.10)", "rgba(255,255,255,0.24)", "rgba(255,255,255,0.52)"];
	const heroTopMaskColors = ["rgba(8,15,27,0.36)", "rgba(8,15,27,0.18)", "rgba(8,15,27,0)"];

	const placeMarkSurface   = isDarkMode ? "rgba(15,23,42,0.52)" : cardSurface;
	const placeMarkIconColor = isDarkMode ? "#E2E8F0" : tintColor;
	const dividerColor       = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";

	return (
		<View style={styles.scrollContent}>
			{/* ── Animated hero ──────────────────────────────────────────────── */}
			<Animated.View
				style={[styles.heroRevealFrame, { height: heroHeight, opacity: heroOpacity }]}
			>
				<View
					style={[
						styles.hero,
						{ backgroundColor: isDarkMode ? "rgba(8,15,27,0.94)" : "rgba(248,250,252,0.97)" },
					]}
				>
					<LinearGradient
						pointerEvents="none"
						colors={heroGradientColors}
						style={StyleSheet.absoluteFillObject}
					/>
					<LinearGradient
						pointerEvents="none"
						colors={heroBlendColors}
						style={styles.heroBlend}
					/>
					<LinearGradient
						pointerEvents="none"
						colors={heroBottomMergeColors}
						style={styles.heroBottomMerge}
					/>
					<LinearGradient
						pointerEvents="none"
						colors={heroTopMaskColors}
						style={styles.heroTopMask}
					/>

					{/* Badge row */}
					{heroBadges.length > 0 ? (
						<View style={styles.heroBadgeRow}>
							{heroBadges.map((item, index) => {
								const badgeBg =
									item.tone === "verified"
										? "rgba(16,185,129,0.18)"
										: item.tone === "alert"
											? "rgba(225,29,72,0.18)"
											: "rgba(255,255,255,0.12)";
								return (
									<View
										key={`${item.label}-${index}`}
										style={[styles.heroBadge, { backgroundColor: badgeBg }]}
									>
										{renderIcon(item, "#F8FAFC", 11)}
										<Text style={styles.heroBadgeText}>{item.label}</Text>
									</View>
								);
							})}
						</View>
					) : null}

					<View style={styles.heroFooter} />
				</View>
			</Animated.View>

			{/* ── Detail panel ────────────────────────────────────────────────── */}
			<Animated.View
				style={[
					styles.detailPanel,
					{
						backgroundColor: cardSurface,
						marginTop: detailPanelMarginTop,
						paddingTop: detailPanelPaddingTop,
					},
				]}
			>
				{/* Place header — animates in with hero */}
				<Animated.View
					style={[
						styles.placeHeaderReveal,
						{
							height: placeHeaderHeight,
							opacity: placeHeaderOpacity,
							marginTop: placeHeaderMarginTop,
						},
					]}
					onLayout={onExpandedHeaderLayout}
				>
					<View style={styles.placeHeader}>
						<View
							style={[
								styles.placeMark,
								{ backgroundColor: placeMarkSurface },
							]}
						>
							<MaterialCommunityIcons
								name={meta?.iconName ?? "medical-bag"}
								size={24}
								color={placeMarkIconColor}
							/>
						</View>
						<Text numberOfLines={2} style={[styles.placeTitle, { color: titleColor }]}>
							{summary.title}
						</Text>
						{summary.addressLine ? (
							<Text numberOfLines={2} style={[styles.placeSubtitle, { color: subtleColor }]}>
								{summary.addressLine}
							</Text>
						) : null}
					</View>
				</Animated.View>

				<View style={styles.detailPanelContent}>
					{/* Action row */}
					{placeActions.length > 0 ? (
						<Animated.View style={[styles.placeActionRow, { marginTop: actionRowMarginTop }]}>
							{placeActions.map((item) => (
								<Pressable
									key={item.key}
									onPress={item.onPress}
									disabled={!item.onPress}
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
												pressed ? styles.placeActionButtonPressed : null,
											]}
										>
											{renderIcon(
												item,
												item.primary ? "#F8FAFC" : actionTint,
												item.primary ? 19 : 16,
											)}
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

					{/* Stats row */}
					{placeStats.length > 0 ? (
						<View style={styles.placeStatsCard}>
							{placeStats.map((item, index) => (
								<View key={`${item.label}-${index}`} style={styles.placeStatItem}>
									<Text numberOfLines={1} style={[styles.placeStatLabel, { color: subtleColor }]}>
										{item.label}
									</Text>
									<View style={styles.placeStatValueRow}>
										{item.icon
											? renderIcon(item, item.tone === "rating" ? "#FBBF24" : subtleColor, 15)
											: null}
										<Text numberOfLines={1} style={[styles.placeStatValue, { color: titleColor }]}>
											{item.value}
										</Text>
									</View>
								</View>
							))}
						</View>
					) : null}

					{/* Info block */}
					{infoRows.length > 0 ? (
						<View style={[styles.infoBlock, { borderTopColor: dividerColor }]}>
							{infoRows.map((row, index) => {
								const Inner = (
									<>
										<MaterialCommunityIcons
											name={row.icon}
											size={16}
											color={tintColor}
											style={styles.infoIcon}
										/>
										<Text
											style={[styles.infoText, { color: subtleColor }]}
											numberOfLines={row.onPress ? 1 : 2}
										>
											{row.text}
										</Text>
									</>
								);
								return row.onPress ? (
									<Pressable key={index} onPress={row.onPress} style={styles.infoRow}>
										{Inner}
									</Pressable>
								) : (
									<View key={index} style={styles.infoRow}>
										{Inner}
									</View>
								);
							})}
						</View>
					) : null}
				</View>
			</Animated.View>
		</View>
	);
}
