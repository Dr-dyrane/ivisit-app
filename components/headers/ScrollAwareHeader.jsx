import React, { useEffect, useMemo, useRef } from "react";
import {
	Animated,
	Easing,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { DEFAULT_HEADER_SESSION, HEADER_MODES } from "../../constants/header";
import {
	GLASS_SURFACE_VARIANTS,
	SURFACE_RADII,
	getGlassSurfaceTokens,
} from "../../constants/surfaces";
import ActionWrapper from "./ActionWrapper";
import NotificationIconButton from "./NotificationIconButton";
import SearchIconButton from "./SearchIconButton";

const HEADER_HEIGHT = 80;
const ACTIVE_SESSION_MIN_HEIGHT = 88;
const ACTIVE_SESSION_BODY_MAX_HEIGHT = 240;

function getSessionBodyTargetHeight({ details, expandedContent, bodyHeight }) {
	if (Number.isFinite(bodyHeight) && bodyHeight > 0) {
		return Math.min(ACTIVE_SESSION_BODY_MAX_HEIGHT, bodyHeight);
	}
	const detailRows = Array.isArray(details) ? details.length : 0;
	const detailsHeight = detailRows > 0 ? Math.min(detailRows, 4) * 32 + 8 : 0;
	const expandedContentHeight = expandedContent ? 88 : 0;

	return Math.min(
		ACTIVE_SESSION_BODY_MAX_HEIGHT,
		Math.max(0, detailsHeight + expandedContentHeight + 12),
	);
}

function getSessionStatusTokens({ statusTone, isDarkMode, backgroundColor }) {
	switch (statusTone) {
		case "critical":
		case "emergency":
			return {
				backgroundColor: isDarkMode ? "rgba(190, 24, 93, 0.24)" : "rgba(190, 24, 93, 0.14)",
				borderColor: isDarkMode ? "rgba(251, 113, 133, 0.28)" : "rgba(190, 24, 93, 0.18)",
				textColor: isDarkMode ? "#FFE4E6" : "#9F1239",
			};
		case "active":
		case "tracking":
		case "live":
			return {
				backgroundColor: isDarkMode ? "rgba(37, 99, 235, 0.24)" : "rgba(37, 99, 235, 0.12)",
				borderColor: isDarkMode ? "rgba(96, 165, 250, 0.24)" : "rgba(37, 99, 235, 0.16)",
				textColor: isDarkMode ? "#DBEAFE" : "#1D4ED8",
			};
		case "warning":
			return {
				backgroundColor: isDarkMode ? "rgba(245, 158, 11, 0.24)" : "rgba(245, 158, 11, 0.12)",
				borderColor: isDarkMode ? "rgba(251, 191, 36, 0.24)" : "rgba(245, 158, 11, 0.16)",
				textColor: isDarkMode ? "#FDE68A" : "#B45309",
			};
		case "success":
		case "settled":
			return {
				backgroundColor: isDarkMode ? "rgba(22, 163, 74, 0.24)" : "rgba(22, 163, 74, 0.12)",
				borderColor: isDarkMode ? "rgba(74, 222, 128, 0.22)" : "rgba(22, 163, 74, 0.16)",
				textColor: isDarkMode ? "#DCFCE7" : "#166534",
			};
		default:
			return {
				backgroundColor: isDarkMode
					? "rgba(255, 255, 255, 0.08)"
					: "rgba(15, 23, 42, 0.06)",
				borderColor: isDarkMode
					? "rgba(255, 255, 255, 0.08)"
					: "rgba(15, 23, 42, 0.08)",
				textColor: backgroundColor || COLORS.brandPrimary,
			};
	}
}

function renderSessionText(value, style) {
	if (React.isValidElement(value)) {
		return value;
	}

	if (!value) {
		return null;
	}

	return <Text style={style}>{String(value)}</Text>;
}

/**
 * ScrollAwareHeader Component (Sticky)
 *
 * Features:
 * - Pure glass/frosted effect with high blur
 * - Minimal opacity for transparency
 * - Fixed at top - doesn't scroll with content
 * - Supports standard title mode and future active-session mode
 */
export default function ScrollAwareHeader({
	title,
	subtitle,
	icon,
	backgroundColor = COLORS.brandPrimary,
	badge,
	leftComponent,
	rightComponent,
	scrollAware = true,
	mode = HEADER_MODES.LEGACY_SCROLL,
	session = DEFAULT_HEADER_SESSION,
	layoutInsets = null,
}) {
	const insets = useSafeAreaInsets();
	const { isDarkMode } = useTheme();
	const isIOS = Platform.OS === "ios";
	const isAndroid = Platform.OS === "android";
	const { headerOpacity: scrollHeaderOpacity, titleOpacity: scrollTitleOpacity } =
		useScrollAwareHeader();
	const headerOpacity = scrollAware ? scrollHeaderOpacity : 1;
	const titleOpacity = scrollAware ? scrollTitleOpacity : 1;
	const headerSurface = getGlassSurfaceTokens({
		isDarkMode,
		variant: GLASS_SURFACE_VARIANTS.HEADER,
	});
	const isActiveSession = mode === HEADER_MODES.ACTIVE_SESSION;
	const resolvedSession = session || DEFAULT_HEADER_SESSION;
	const sessionDetails = resolvedSession.hideDetails
		? []
		: Array.isArray(resolvedSession.details)
		? resolvedSession.details
		: DEFAULT_HEADER_SESSION.details;
	const sessionHasBodyContent =
		sessionDetails.length > 0 || Boolean(resolvedSession.expandedContent);
	const canToggleSession =
		isActiveSession &&
		sessionHasBodyContent &&
		Boolean(resolvedSession.expandable) &&
		typeof resolvedSession.onToggleExpand === "function";
	const isSessionExpanded =
		isActiveSession && sessionHasBodyContent && Boolean(resolvedSession.expanded);
	const sessionBodyTargetHeight = useMemo(
		() =>
			isSessionExpanded
				? getSessionBodyTargetHeight({
					details: sessionDetails,
					expandedContent: resolvedSession.expandedContent,
					bodyHeight: resolvedSession.bodyHeight,
				})
				: 0,
		[isSessionExpanded, resolvedSession.bodyHeight, resolvedSession.expandedContent, sessionDetails],
	);
	const sessionExpansion = useRef(new Animated.Value(isSessionExpanded ? 1 : 0)).current;
	const sessionBodyHeight = useRef(new Animated.Value(sessionBodyTargetHeight)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(sessionExpansion, {
				toValue: isSessionExpanded ? 1 : 0,
				duration: 260,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: false,
			}),
			Animated.timing(sessionBodyHeight, {
				toValue: sessionBodyTargetHeight,
				duration: 260,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: false,
			}),
		]).start();
	}, [isSessionExpanded, sessionBodyHeight, sessionBodyTargetHeight, sessionExpansion]);

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const textMuted = isDarkMode ? "#94A3B8" : "#64748B";
	const sessionStatusTokens = getSessionStatusTokens({
		statusTone: resolvedSession.statusTone,
		isDarkMode,
		backgroundColor,
	});
	const sessionChevronRotation = sessionExpansion.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "180deg"],
	});
	const sessionBodyOpacity = sessionExpansion.interpolate({
		inputRange: [0, 0.25, 1],
		outputRange: [0, 0.2, 1],
	});
	const sessionBodyTranslateY = sessionExpansion.interpolate({
		inputRange: [0, 1],
		outputRange: [-8, 0],
	});

	const resolvedRight =
		isActiveSession || rightComponent === false
			? rightComponent
			: rightComponent == null
				? (
					<View style={styles.rightActions}>
						<ActionWrapper>
							<SearchIconButton />
						</ActionWrapper>
						<ActionWrapper>
							<NotificationIconButton />
						</ActionWrapper>
					</View>
				)
				: (
					rightComponent
				);

	const standardHeaderContent = (
		<View style={[styles.innerContent, { backgroundColor: headerSurface.overlayColor }]}>
			<View style={styles.leftSection}>
				{leftComponent ? (
					leftComponent
				) : icon ? (
					<View style={[styles.iconSquircle, { backgroundColor }]}>{icon}</View>
				) : null}
			</View>
			<View style={styles.centerSection}>
				{subtitle ? (
					<Text numberOfLines={1} style={[styles.subtitleText, { color: textMuted }]}>
						{subtitle}
					</Text>
				) : null}
				<Animated.Text
					numberOfLines={1}
					style={[styles.titleText, { color: textColor, opacity: titleOpacity }]}
				>
					{title}
				</Animated.Text>
			</View>
			<View style={styles.rightSection}>
				{badge ? (
					<View style={[styles.badgeBox, { backgroundColor }]}>
						<Text style={styles.badgeText}>{badge}</Text>
					</View>
				) : (
					resolvedRight
				)}
			</View>
		</View>
	);

	const sessionPrimary = Array.isArray(resolvedSession.metrics) &&
		resolvedSession.metrics.length > 0 ? (
		<View style={styles.sessionMetricsGrid}>
			{resolvedSession.metrics.map((metric, index) => (
				<View key={metric?.label || index} style={styles.sessionMetricCell}>
					{metric?.label ? (
						<Text numberOfLines={1} style={[styles.sessionMetricLabel, { color: textMuted }]}>
							{metric.label}
						</Text>
					) : null}
					<Text numberOfLines={1} style={[styles.sessionMetricValue, { color: textColor }]}>
						{metric?.value || "--"}
					</Text>
				</View>
			))}
		</View>
	) : (
		<View style={styles.activeSessionPrimaryContent}>
			{resolvedSession.eyebrow ? (
				<Text numberOfLines={1} style={[styles.sessionEyebrowText, { color: textMuted }]}>
					{resolvedSession.eyebrow}
				</Text>
			) : null}
			<Text numberOfLines={1} style={[styles.sessionTitleText, { color: textColor }]}>
				{resolvedSession.title || title}
			</Text>
			{resolvedSession.subtitle ? (
				<Text numberOfLines={1} style={[styles.sessionSubtitleText, { color: textMuted }]}>
					{resolvedSession.subtitle}
				</Text>
			) : subtitle ? (
				<Text numberOfLines={1} style={[styles.sessionSubtitleText, { color: textMuted }]}>
					{subtitle}
				</Text>
			) : null}
		</View>
	);

	const activeSessionHeaderContent = (
		<View
			style={[styles.activeSessionContainer, { backgroundColor: headerSurface.overlayColor }]}
		>
			<View style={styles.activeSessionTopRow}>
				<View style={styles.activeSessionLeading}>
					{leftComponent ? (
						leftComponent
					) : icon ? (
						<View style={[styles.iconSquircle, { backgroundColor }]}>{icon}</View>
					) : (
						<View style={styles.activeSessionLeadingSpacer} />
					)}
				</View>

				{canToggleSession ? (
					<Pressable
						onPress={resolvedSession.onToggleExpand}
						style={({ pressed }) => [
							styles.activeSessionPrimary,
							pressed && styles.sessionPressablePressed,
						]}
					>
						{sessionPrimary}
					</Pressable>
				) : (
					<View style={styles.activeSessionPrimary}>{sessionPrimary}</View>
				)}

				<View style={styles.activeSessionTrailing}>
					{/* PULLBACK NOTE: Phase 8 — Removed status pill that displaced right component during tracking sheet phase */}
					{/* OLD: <View style={styles.sessionStatusPill}>...{resolvedSession.statusLabel}...</View> */}
					{/* NEW: Status now communicated via sheet title color animation + hero gradient underlay */}

					{resolvedRight ? (
						<View style={styles.activeSessionRightAccessory}>{resolvedRight}</View>
					) : null}

					{resolvedSession.showChevron !== false &&
					resolvedSession.expandable &&
					sessionHasBodyContent ? (
						<Animated.Text
							style={[
								styles.sessionChevron,
								{ color: textMuted, transform: [{ rotate: sessionChevronRotation }] },
							]}
						>
							v
						</Animated.Text>
					) : null}
				</View>
			</View>

			<Animated.View
				style={[
					styles.activeSessionBody,
					{
						height: sessionBodyHeight,
						opacity: sessionBodyOpacity,
					},
				]}
				pointerEvents={isSessionExpanded ? "auto" : "none"}
			>
				<Animated.View
					style={[
						styles.activeSessionBodyInner,
						{ transform: [{ translateY: sessionBodyTranslateY }] },
					]}
				>
					{sessionDetails.map((detail, index) => (
						<View
							key={
								typeof detail.key === "string" || typeof detail.key === "number"
									? detail.key
									: typeof detail.label === "string"
										? detail.label
										: `session-detail-${index}`
							}
							style={styles.sessionDetailRow}
						>
							{renderSessionText(detail.label, [
								styles.sessionDetailLabel,
								{ color: textMuted },
							])}
							{renderSessionText(detail.value, [
								styles.sessionDetailValue,
								{ color: textColor },
							])}
						</View>
					))}

					{resolvedSession.expandedContent ? (
						<View style={styles.sessionExpandedContent}>
							{resolvedSession.expandedContent}
						</View>
					) : null}
				</Animated.View>
			</Animated.View>
		</View>
	);

	const headerContent = isActiveSession ? activeSessionHeaderContent : standardHeaderContent;
	const resolvedTopInset = Number.isFinite(Number(layoutInsets?.topInset))
		? Number(layoutInsets.topInset)
		: 8;
	const resolvedLeftInset = Number.isFinite(Number(layoutInsets?.leftInset))
		? Number(layoutInsets.leftInset)
		: 12;
	const resolvedRightInset = Number.isFinite(Number(layoutInsets?.rightInset))
		? Number(layoutInsets.rightInset)
		: 12;
	// PULLBACK NOTE: sidebar-aware header container positioning
	// OLD: container always left:0/right:0, full leftInset applied as padding (double-offset in sidebar)
	// NEW: containerLeft/Right shift the container so island anchors right of sidebar panel;
	//      paddingLeft/Right only carry the island's own side inset (not the sidebar offset)
	const containerLeft = Number.isFinite(Number(layoutInsets?.containerLeft))
		? Number(layoutInsets.containerLeft)
		: 0;
	const containerRight = Number.isFinite(Number(layoutInsets?.containerRight))
		? Number(layoutInsets.containerRight)
		: 0;
	const isSidebarPositioned = containerLeft > 0;
	const islandPaddingLeft = isSidebarPositioned ? resolvedRightInset : resolvedLeftInset;
	const islandPaddingRight = resolvedRightInset;

	return (
		<Animated.View
			style={[
				styles.container,
				{
					opacity: headerOpacity,
					paddingTop: insets.top + resolvedTopInset,
					paddingLeft: islandPaddingLeft,
					paddingRight: islandPaddingRight,
					left: containerLeft,
					right: containerRight,
				},
			]}
		>
			<View style={[styles.islandWrapper, headerSurface.shadowStyle]}>
				{isAndroid && (
					<View
						pointerEvents="none"
						style={[
							styles.islandShadowUnderlay,
							{ backgroundColor: headerSurface.underlayColor },
						]}
					/>
				)}
				<View
					style={[
						styles.islandClip,
						{
							backgroundColor: headerSurface.surfaceColor,
							...headerSurface.webBackdropStyle,
						},
					]}
				>
					{isIOS ? (
						<BlurView
							intensity={headerSurface.blurIntensity}
							tint={headerSurface.tint}
							style={[
								styles.blur,
								{ minHeight: isActiveSession ? ACTIVE_SESSION_MIN_HEIGHT : HEADER_HEIGHT },
							]}
						>
							{headerContent}
						</BlurView>
					) : (
						<View
							style={[
								styles.blur,
								{
									minHeight: isActiveSession ? ACTIVE_SESSION_MIN_HEIGHT : HEADER_HEIGHT,
									backgroundColor: "transparent",
								},
							]}
						>
							{headerContent}
						</View>
					)}
				</View>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 9999,
	},
	islandWrapper: {
		borderRadius: SURFACE_RADII.HEADER_ISLAND,
		overflow: "visible",
		position: "relative",
	},
	islandClip: {
		borderRadius: SURFACE_RADII.HEADER_ISLAND,
		overflow: "hidden",
	},
	islandShadowUnderlay: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
		borderRadius: SURFACE_RADII.HEADER_ISLAND,
	},
	blur: {
		borderRadius: SURFACE_RADII.HEADER_ISLAND,
	},
	innerContent: {
		height: HEADER_HEIGHT,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 20,
	},
	leftSection: {
		marginRight: 16,
	},
	iconSquircle: {
		width: 48,
		height: 48,
		borderRadius: SURFACE_RADII.ACTION_CHIP,
		alignItems: "center",
		justifyContent: "center",
		...Platform.select({
			ios: {
				shadowColor: "#000",
				shadowOpacity: 0.1,
				shadowRadius: 4,
				shadowOffset: { width: 0, height: 2 },
			},
			web: {
				boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
			},
			default: {},
		}),
	},
	centerSection: {
		flex: 1,
		justifyContent: "center",
	},
	subtitleText: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1.5,
		textTransform: "uppercase",
		marginBottom: 2,
	},
	titleText: {
		fontSize: 24,
		fontWeight: "900",
		letterSpacing: -1,
	},
	rightSection: {
		marginLeft: 12,
		alignItems: "flex-end",
	},
	rightActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	badgeBox: {
		minWidth: 32,
		height: 32,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
	},
	badgeText: {
		color: "#FFFFFF",
		fontWeight: "900",
		fontSize: 12,
	},
	activeSessionContainer: {
		paddingHorizontal: 18,
		paddingTop: 14,
		paddingBottom: 12,
	},
	activeSessionTopRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	activeSessionLeading: {
		marginRight: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	activeSessionLeadingSpacer: {
		width: 20,
	},
	activeSessionPrimary: {
		flex: 1,
		minHeight: 60,
		justifyContent: "center",
	},
	activeSessionPrimaryContent: {
		justifyContent: "center",
	},
	sessionMetricsGrid: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	sessionMetricCell: {
		flex: 1,
		minWidth: 0,
		alignItems: "center",
		justifyContent: "center",
	},
	sessionMetricLabel: {
		fontSize: 10,
		fontWeight: "600",
		letterSpacing: 0.12,
	},
	sessionMetricValue: {
		marginTop: 4,
		fontSize: 17,
		fontWeight: "700",
		letterSpacing: -0.32,
	},
	activeSessionTrailing: {
		marginLeft: 12,
		alignItems: "flex-end",
		justifyContent: "center",
	},
	activeSessionRightAccessory: {
		marginTop: 6,
	},
	sessionPressablePressed: {
		opacity: 0.82,
	},
	sessionEyebrowText: {
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.6,
		textTransform: "uppercase",
		marginBottom: 3,
	},
	sessionTitleText: {
		fontSize: 18,
		fontWeight: "700",
		letterSpacing: -0.42,
	},
	sessionSubtitleText: {
		fontSize: 13,
		fontWeight: "400",
		marginTop: 2,
	},
	sessionStatusPill: {
		minHeight: 28,
		paddingHorizontal: 12,
		borderRadius: 999,
		borderWidth: 0,
		alignItems: "center",
		justifyContent: "center",
	},
	sessionStatusText: {
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.12,
	},
	sessionChevron: {
		fontSize: 18,
		fontWeight: "800",
		marginTop: 6,
	},
	activeSessionBody: {
		overflow: "hidden",
	},
	activeSessionBodyInner: {
		paddingTop: 10,
		gap: 8,
	},
	sessionDetailRow: {
		paddingVertical: 8,
	},
	sessionDetailLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.5,
		textTransform: "uppercase",
		marginBottom: 2,
	},
	sessionDetailValue: {
		fontSize: 14,
		fontWeight: "600",
	},
	sessionExpandedContent: {
		paddingTop: 12,
		paddingBottom: 12,
	},
});
