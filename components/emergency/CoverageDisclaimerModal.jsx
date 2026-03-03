import React, { useMemo, useEffect, useRef } from "react";
import { Modal, View, Text, Pressable, StyleSheet, Platform, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CoverageDisclaimerModal({
	visible,
	coverageStatus = "poor",
	nearbyVerifiedHospitalCount = 0,
	nearbyHospitalCount = 0,
	coverageThreshold = 3,
	dontRemind = false,
	onToggleDontRemind,
	onContinue,
	onCall911,
}) {
	const { isDarkMode } = useTheme();
	const slideY = useRef(new Animated.Value(56)).current;
	const fade = useRef(new Animated.Value(0)).current;
	const contentY = useRef(new Animated.Value(12)).current;
	const contentFade = useRef(new Animated.Value(0)).current;
	const primaryScale = useRef(new Animated.Value(1)).current;
	const secondaryScale = useRef(new Animated.Value(1)).current;
	const checkboxScale = useRef(new Animated.Value(1)).current;

	const copy = useMemo(() => {
		if (coverageStatus === "none") {
			return {
				title: "We're sorry, iVisit has not reached your area yet",
				subtitle:
					"You deserve fast care, and we know this is frustrating. We are expanding city by city and working hard to reach you soon.",
			};
		}

		return {
			title: "We're sorry, coverage is still limited nearby",
			subtitle:
				"We currently have limited iVisit-verified hospitals near you, and we are actively onboarding more partners around your location.",
		};
	}, [coverageStatus]);

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

	const animateButtonScale = (animatedValue, toValue) => {
		Animated.spring(animatedValue, {
			toValue,
			tension: 280,
			friction: 20,
			useNativeDriver: true,
		}).start();
	};

	const sheetHeight = Math.min(Math.max(SCREEN_HEIGHT * 0.56, 420), SCREEN_HEIGHT * 0.72);
	const cardBackground = isDarkMode ? "#0D1420" : "#FFFFFF";
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const subtitleColor = isDarkMode ? "#CBD5E1" : "#475569";
	const helperColor = isDarkMode ? "#9FB1C8" : "#64748B";
	const surfaceColor = isDarkMode ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.10)";

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
							backgroundColor: cardBackground,
							transform: [{ translateY: slideY }],
							opacity: fade,
						},
					]}
				>
					<LinearGradient
						colors={
							isDarkMode
								? ["rgba(134,16,14,0.45)", "rgba(13,20,32,0.0)"]
								: ["rgba(134,16,14,0.18)", "rgba(255,255,255,0.0)"]
						}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.headerGradient}
					/>

					<View style={styles.geometryOne} />
					<View style={styles.geometryTwo} />

					<Animated.View
						style={{
							opacity: contentFade,
							transform: [{ translateY: contentY }],
						}}
					>
						<View style={styles.heroRow}>
						<View style={styles.emojiPill}>
							<Text style={styles.emojiText}>🫶</Text>
						</View>
						<View style={styles.emojiPillSecondary}>
							<Text style={styles.emojiText}>🏥</Text>
						</View>
						</View>

						<Text style={[styles.title, { color: titleColor }]}>{copy.title}</Text>
						<Text style={[styles.subtitle, { color: subtitleColor }]}>{copy.subtitle}</Text>

						<View style={styles.metricsRow}>
						<View style={[styles.metricCard, { backgroundColor: surfaceColor }]}>
							<Text style={styles.metricEmoji}>✅</Text>
							<Text style={[styles.metricValue, { color: titleColor }]}>{nearbyVerifiedHospitalCount}</Text>
							<Text style={[styles.metricLabel, { color: helperColor }]}>Verified nearby</Text>
						</View>
						<View style={[styles.metricCard, { backgroundColor: surfaceColor }]}>
							<Text style={styles.metricEmoji}>📍</Text>
							<Text style={[styles.metricValue, { color: titleColor }]}>{nearbyHospitalCount}</Text>
							<Text style={[styles.metricLabel, { color: helperColor }]}>Nearby shown</Text>
						</View>
						</View>

						<Text style={[styles.helper, { color: helperColor }]}>
							You can still view nearby hospitals, see how close they are, and call them directly while we expand verified iVisit coverage.
						</Text>
						{coverageStatus === "poor" && (
							<Text style={[styles.targetText, { color: helperColor }]}>
								Target for stronger coverage: {coverageThreshold}+ verified hospitals nearby.
							</Text>
						)}

						<Animated.View style={{ transform: [{ scale: primaryScale }] }}>
							<Pressable
								onPress={onContinue}
								onPressIn={() => animateButtonScale(primaryScale, 0.985)}
								onPressOut={() => animateButtonScale(primaryScale, 1)}
								style={({ pressed }) => [
									styles.primaryButton,
									{
										backgroundColor: COLORS.brandPrimary,
										opacity: pressed ? 0.95 : 1,
									},
								]}
							>
								<Text style={styles.primaryButtonText}>Show Nearby Hospitals</Text>
							</Pressable>
						</Animated.View>

						<Animated.View style={{ transform: [{ scale: secondaryScale }] }}>
							<Pressable
								onPress={onCall911}
								onPressIn={() => animateButtonScale(secondaryScale, 0.988)}
								onPressOut={() => animateButtonScale(secondaryScale, 1)}
								style={({ pressed }) => [
									styles.secondaryButton,
									{
										backgroundColor: surfaceColor,
										opacity: pressed ? 0.92 : 1,
									},
								]}
							>
								<Ionicons name="call-outline" size={16} color={isDarkMode ? "#E2E8F0" : "#334155"} />
								<Text style={[styles.secondaryButtonText, { color: isDarkMode ? "#E2E8F0" : "#334155" }]}>
									Call 911
								</Text>
							</Pressable>
						</Animated.View>

						<Animated.View style={{ transform: [{ scale: checkboxScale }] }}>
							<Pressable
								onPress={onToggleDontRemind}
								onPressIn={() => animateButtonScale(checkboxScale, 0.992)}
								onPressOut={() => animateButtonScale(checkboxScale, 1)}
								style={styles.checkboxRow}
							>
								<Ionicons
									name={dontRemind ? "checkmark-circle" : "ellipse-outline"}
									size={18}
									color={dontRemind ? COLORS.brandPrimary : helperColor}
								/>
								<Text style={[styles.checkboxText, { color: helperColor }]}>
									Don't show this message again on this device
								</Text>
							</Pressable>
						</Animated.View>
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
		paddingHorizontal: 22,
		paddingTop: 18,
		paddingBottom: Platform.OS === "ios" ? 34 : 24,
	},
	headerGradient: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		height: 170,
	},
	geometryOne: {
		position: "absolute",
		width: 230,
		height: 230,
		borderRadius: 999,
		right: -90,
		top: -120,
		backgroundColor: "rgba(148,163,184,0.10)",
	},
	geometryTwo: {
		position: "absolute",
		width: 150,
		height: 150,
		borderRadius: 999,
		left: -55,
		top: 40,
		backgroundColor: "rgba(134,16,14,0.08)",
	},
	heroRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
		gap: 8,
	},
	emojiPill: {
		width: 48,
		height: 48,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(134,16,14,0.15)",
	},
	emojiPillSecondary: {
		width: 42,
		height: 42,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(148,163,184,0.18)",
	},
	emojiText: {
		fontSize: 22,
	},
	title: {
		fontSize: 21,
		fontWeight: "800",
		letterSpacing: -0.3,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 21,
		marginBottom: 14,
	},
	metricsRow: {
		flexDirection: "row",
		gap: 10,
		marginBottom: 12,
	},
	metricCard: {
		flex: 1,
		minHeight: 82,
		borderRadius: 16,
		paddingVertical: 10,
		paddingHorizontal: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	metricEmoji: {
		fontSize: 16,
		marginBottom: 4,
	},
	metricValue: {
		fontSize: 20,
		fontWeight: "800",
		letterSpacing: -0.3,
	},
	metricLabel: {
		fontSize: 11,
		fontWeight: "600",
	},
	helper: {
		fontSize: 13,
		lineHeight: 19,
		marginBottom: 8,
	},
	targetText: {
		fontSize: 11,
		fontWeight: "500",
		marginBottom: 12,
	},
	primaryButton: {
		minHeight: 48,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "700",
	},
	secondaryButton: {
		marginTop: 10,
		minHeight: 44,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 8,
	},
	secondaryButtonText: {
		fontSize: 14,
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
