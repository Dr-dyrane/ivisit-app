import React, { useMemo, useEffect, useRef } from "react";
import {
	Modal,
	View,
	Text,
	Pressable,
	StyleSheet,
	Platform,
	Animated,
	Dimensions,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import SlideButton from "../ui/SlideButton";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CoverageDisclaimerModal({
	visible,
	coverageStatus = "poor",
	nearbyVerifiedHospitalCount = 0,
	nearbyHospitalCount = 0,
	coverageThreshold = 3,
	selectedMode = "hybrid",
	liveOnlyAvailable = true,
	dontRemind = false,
	onToggleDontRemind,
	onChooseLiveOnly,
	onChooseHybrid,
	onChooseDemoOnly,
	onContinue,
	onCall911,
}) {
	const { isDarkMode } = useTheme();
	const slideY = useRef(new Animated.Value(56)).current;
	const fade = useRef(new Animated.Value(0)).current;
	const contentY = useRef(new Animated.Value(12)).current;
	const contentFade = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!visible) {
			slideY.setValue(56);
			fade.setValue(0);
			contentY.setValue(12);
			contentFade.setValue(0);
			return;
		}

		Animated.parallel([
			Animated.spring(slideY, {
				toValue: 0,
				tension: 86,
				friction: 13,
				useNativeDriver: true,
			}),
			Animated.timing(fade, {
				toValue: 1,
				duration: 220,
				useNativeDriver: true,
			}),
			Animated.sequence([
				Animated.delay(70),
				Animated.parallel([
					Animated.timing(contentFade, {
						toValue: 1,
						duration: 260,
						useNativeDriver: true,
					}),
					Animated.spring(contentY, {
						toValue: 0,
						tension: 90,
						friction: 14,
						useNativeDriver: true,
					}),
				]),
			]),
		]).start();
	}, [contentFade, contentY, fade, slideY, visible]);

	const palette = useMemo(() => {
		const isNone = coverageStatus === "none";
		return {
			accent: isNone ? "#D97706" : COLORS.brandPrimary,
			accentSoft: isDarkMode
				? isNone
					? "rgba(217,119,6,0.18)"
					: "rgba(134,16,14,0.18)"
				: isNone
					? "rgba(217,119,6,0.10)"
					: "rgba(134,16,14,0.10)",
			surface: isDarkMode ? "#0D1420" : "#FFFFFF",
			surfaceMuted: isDarkMode ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.10)",
			text: isDarkMode ? "#F8FAFC" : "#0F172A",
			textMuted: isDarkMode ? "#CBD5E1" : "#475569",
			textSubtle: isDarkMode ? "#9FB1C8" : "#64748B",
		};
	}, [coverageStatus, isDarkMode]);

	const copy = useMemo(() => {
		if (coverageStatus === "none") {
			return {
				badge: "No verified live coverage yet",
				title: "Coverage is still growing here",
				subtitle:
					"We recommend Hybrid so the app stays useful around you.",
			};
		}

		return {
			badge: "Limited live coverage nearby",
			title: "Coverage is limited here",
			subtitle:
				"We recommend Hybrid so you keep real nearby hospitals and get fallback coverage where needed.",
		};
	}, [coverageStatus]);

	const recommendedMode = "hybrid";
	const isRecommendedSelected = selectedMode === recommendedMode;
	const primaryAction = isRecommendedSelected ? onContinue : onChooseHybrid;
	const primaryLabel = isRecommendedSelected
		? "Continue"
		: coverageStatus === "none"
			? "Turn On Hybrid"
			: "Use Hybrid";
	const primaryIconName = isRecommendedSelected ? "arrow-forward" : "sparkles";
	const keepCurrentLabel =
		selectedMode === "live_only"
			? "Keep Live Only"
			: selectedMode === "demo_only"
				? "Keep Demo Only"
				: "Keep Current Mode";

	const sheetHeight = Math.min(Math.max(SCREEN_HEIGHT * 0.78, 480), SCREEN_HEIGHT * 0.86);

	return (
		<Modal visible={visible} transparent animationType="none" statusBarTranslucent>
			<View style={styles.overlay}>
				<Animated.View style={[styles.backdrop, { opacity: fade }]}>
					<Pressable style={styles.backdropPress} onPress={onContinue} />
				</Animated.View>

				<Animated.View
					style={[
						styles.card,
						{
							height: sheetHeight,
							backgroundColor: palette.surface,
							transform: [{ translateY: slideY }],
							opacity: fade,
						},
					]}
				>
					<LinearGradient
						colors={
							isDarkMode
								? [`${palette.accent}66`, "rgba(13,20,32,0.0)"]
								: [`${palette.accent}24`, "rgba(255,255,255,0.0)"]
						}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.headerGradient}
					/>

					<View style={styles.handle} />

					<Animated.View
						style={{
							flex: 1,
							opacity: contentFade,
							transform: [{ translateY: contentY }],
						}}
					>
						<ScrollView
							showsVerticalScrollIndicator={false}
							contentContainerStyle={styles.scrollContent}
						>
							<View style={styles.topRow}>
								<View
									style={[
										styles.statusBadge,
										{ backgroundColor: palette.accentSoft },
									]}
								>
									<Ionicons
										name={
											coverageStatus === "none"
												? "warning-outline"
												: "pulse-outline"
										}
										size={14}
										color={palette.accent}
									/>
									<Text style={[styles.statusBadgeText, { color: palette.accent }]}>
										{copy.badge}
									</Text>
								</View>

								<Pressable
									onPress={onContinue}
									hitSlop={12}
									style={[
										styles.closeButton,
										{ backgroundColor: palette.surfaceMuted },
									]}
								>
									<Ionicons
										name="close"
										size={16}
										color={palette.textSubtle}
									/>
								</Pressable>
							</View>

							<View style={styles.heroRow}>
								<View
									style={[
										styles.heroIconWrap,
										{ backgroundColor: palette.accentSoft },
									]}
								>
									<Ionicons
										name="navigate-circle-outline"
										size={26}
										color={palette.accent}
									/>
								</View>
								<View style={styles.heroCopy}>
									<Text style={[styles.title, { color: palette.text }]}>
										{copy.title}
									</Text>
									<Text style={[styles.subtitle, { color: palette.textMuted }]}>
										{copy.subtitle}
									</Text>
								</View>
							</View>

							<View style={styles.metricsRow}>
								<View
									style={[
										styles.metricCard,
										{
											backgroundColor: palette.surfaceMuted,
										},
									]}
								>
									<Text style={[styles.metricValue, { color: palette.text }]}>
										{nearbyVerifiedHospitalCount}
									</Text>
									<Text style={[styles.metricLabel, { color: palette.textSubtle }]}>
										Verified live nearby
									</Text>
								</View>
								<View
									style={[
										styles.metricCard,
										{
											backgroundColor: palette.surfaceMuted,
										},
									]}
								>
									<Text style={[styles.metricValue, { color: palette.text }]}>
										{nearbyHospitalCount}
									</Text>
									<Text style={[styles.metricLabel, { color: palette.textSubtle }]}>
										Nearby hospitals shown
									</Text>
								</View>
							</View>

							<View
								style={[
									styles.reassuranceCard,
									{
										backgroundColor: palette.surfaceMuted,
									},
								]}
							>
								<Ionicons name="sparkles-outline" size={18} color={palette.accent} />
								<View style={styles.reassuranceBody}>
									<Text style={[styles.reassuranceTitle, { color: palette.text }]}>
										Recommended
									</Text>
									<Text style={[styles.reassuranceText, { color: palette.textMuted }]}>
										Hybrid keeps nearby hospitals visible and fills gaps with demo coverage.
									</Text>
								</View>
							</View>
						</ScrollView>

						<View style={styles.footer}>
							<View style={styles.primaryButtonWrap}>
								<SlideButton
									onPress={primaryAction}
									height={62}
									radius={22}
									icon={(color) => (
										<Ionicons name={primaryIconName} size={20} color={color} />
									)}
								>
									{primaryLabel.toUpperCase()}
								</SlideButton>
							</View>

							{!isRecommendedSelected ? (
								<Pressable onPress={onContinue} style={styles.keepCurrentRow}>
									<Text style={[styles.keepCurrentText, { color: palette.textSubtle }]}>
										{keepCurrentLabel}
									</Text>
								</Pressable>
							) : null}

							<Pressable onPress={onCall911} style={styles.altActionRow}>
								<Text style={[styles.altActionText, { color: palette.textSubtle }]}>
									Emergency? Call 911
								</Text>
							</Pressable>

							<Pressable onPress={onToggleDontRemind} style={styles.checkboxRow}>
								<Ionicons
									name={dontRemind ? "checkmark-circle" : "ellipse-outline"}
									size={18}
									color={dontRemind ? palette.accent : palette.textSubtle}
								/>
								<Text style={[styles.checkboxText, { color: palette.textSubtle }]}>
									Do not show this again on this device
								</Text>
							</Pressable>
						</View>
					</Animated.View>
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "flex-end",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(2, 6, 23, 0.46)",
	},
	backdropPress: {
		flex: 1,
	},
	card: {
		overflow: "hidden",
		borderTopLeftRadius: 30,
		borderTopRightRadius: 30,
		paddingHorizontal: 20,
		paddingTop: 12,
		paddingBottom: Platform.OS === "ios" ? 26 : 20,
	},
	headerGradient: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		height: 190,
	},
	handle: {
		alignSelf: "center",
		width: 42,
		height: 4,
		borderRadius: 999,
		backgroundColor: "rgba(148,163,184,0.45)",
		marginBottom: 14,
	},
	scrollContent: {
		paddingBottom: 14,
	},
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 16,
	},
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 999,
	},
	statusBadgeText: {
		fontSize: 12,
		fontWeight: "700",
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	heroRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 14,
		marginBottom: 18,
	},
	heroIconWrap: {
		width: 54,
		height: 54,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	heroCopy: {
		flex: 1,
	},
	title: {
		fontSize: 23,
		fontWeight: "800",
		letterSpacing: -0.4,
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 21,
		marginTop: 8,
	},
	metricsRow: {
		flexDirection: "row",
		gap: 10,
		marginBottom: 14,
	},
	metricCard: {
		flex: 1,
		borderRadius: 18,
		paddingVertical: 14,
		paddingHorizontal: 14,
	},
	metricValue: {
		fontSize: 24,
		fontWeight: "800",
		letterSpacing: -0.4,
	},
	metricLabel: {
		marginTop: 4,
		fontSize: 12,
		fontWeight: "600",
	},
	reassuranceCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
		borderRadius: 18,
		padding: 14,
		marginBottom: 18,
	},
	reassuranceBody: {
		flex: 1,
	},
	reassuranceTitle: {
		fontSize: 14,
		fontWeight: "700",
	},
	reassuranceText: {
		fontSize: 13,
		lineHeight: 19,
		marginTop: 4,
	},
	reassuranceHint: {
		fontSize: 12,
		lineHeight: 18,
		marginTop: 8,
	},
	footer: {
		paddingTop: 12,
	},
	primaryButtonWrap: {
		width: "100%",
	},
	keepCurrentRow: {
		marginTop: 10,
		alignItems: "center",
	},
	keepCurrentText: {
		fontSize: 13,
		fontWeight: "600",
	},
	altActionRow: {
		marginTop: 8,
		alignItems: "center",
	},
	altActionText: {
		fontSize: 13,
		fontWeight: "600",
	},
	checkboxRow: {
		marginTop: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	checkboxText: {
		fontSize: 12,
		fontWeight: "500",
	},
});
