import React, { useMemo, useEffect, useRef } from "react";
import {
	Modal,
	View,
	Text,
	Pressable,
	StyleSheet,
	Animated,
	Dimensions,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const CONFETTI = [
	{ x: -120, delay: 0, emoji: "🎉" },
	{ x: -80, delay: 90, emoji: "✨" },
	{ x: -40, delay: 140, emoji: "🎊" },
	{ x: 0, delay: 60, emoji: "✨" },
	{ x: 40, delay: 170, emoji: "🎉" },
	{ x: 80, delay: 30, emoji: "🎊" },
	{ x: 120, delay: 110, emoji: "✨" },
];

export default function DemoBootstrapModal({
	visible,
	phases = [],
	phaseStatuses = {},
	activePhaseKey = null,
	isRunning = false,
	isCompleted = false,
	error = null,
	onClose,
}) {
	const { isDarkMode } = useTheme();
	const slideY = useRef(new Animated.Value(44)).current;
	const fade = useRef(new Animated.Value(0)).current;
	const confettiValues = useRef(CONFETTI.map(() => new Animated.Value(0))).current;

	useEffect(() => {
		if (!visible) {
			slideY.setValue(44);
			fade.setValue(0);
			confettiValues.forEach((value) => value.setValue(0));
			return;
		}

		Animated.parallel([
			Animated.timing(fade, {
				toValue: 1,
				duration: 220,
				useNativeDriver: true,
			}),
			Animated.spring(slideY, {
				toValue: 0,
				tension: 90,
				friction: 14,
				useNativeDriver: true,
			}),
		]).start();
	}, [confettiValues, fade, slideY, visible]);

	useEffect(() => {
		if (!visible || !isCompleted) return;

		CONFETTI.forEach((piece, index) => {
			const value = confettiValues[index];
			value.setValue(0);
			Animated.sequence([
				Animated.delay(piece.delay),
				Animated.timing(value, {
					toValue: 1,
					duration: 1200,
					useNativeDriver: true,
				}),
			]).start();
		});
	}, [confettiValues, isCompleted, visible]);

	const completedCount = useMemo(() => {
		return phases.filter((phase) => phaseStatuses?.[phase.key] === "completed").length;
	}, [phases, phaseStatuses]);

	const progressRatio = phases.length > 0 ? completedCount / phases.length : 0;
	const cardBackground = isDarkMode ? "#0D1420" : "#FFFFFF";
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const subtitleColor = isDarkMode ? "#CBD5E1" : "#475569";
	const helperColor = isDarkMode ? "#9FB1C8" : "#64748B";
	const surfaceColor = isDarkMode ? "rgba(148,163,184,0.14)" : "rgba(100,116,139,0.10)";
	const sheetHeight = Math.min(Math.max(SCREEN_HEIGHT * 0.75, 420), SCREEN_HEIGHT * 0.74);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			statusBarTranslucent
			onRequestClose={() => {
				if (!isRunning) onClose?.();
			}}
		>
			<View style={styles.overlay}>
				<Animated.View style={[styles.backdrop, { opacity: fade }]}>
					<Pressable
						style={styles.backdropPress}
						onPress={() => {
							if (!isRunning) onClose?.();
						}}
					/>
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

					{isCompleted && (
						<View style={styles.confettiLayer} pointerEvents="none">
							{CONFETTI.map((piece, index) => {
								const animatedValue = confettiValues[index];
								return (
									<Animated.Text
										key={`${piece.x}:${piece.delay}`}
										style={[
											styles.confettiEmoji,
											{
												left: "50%",
												transform: [
													{ translateX: piece.x },
													{
														translateY: animatedValue.interpolate({
															inputRange: [0, 1],
															outputRange: [-20, 210],
														}),
													},
													{
														rotate: animatedValue.interpolate({
															inputRange: [0, 1],
															outputRange: ["0deg", "180deg"],
														}),
													},
												],
												opacity: animatedValue.interpolate({
													inputRange: [0, 0.1, 0.9, 1],
													outputRange: [0, 1, 1, 0],
												}),
											},
										]}
									>
										{piece.emoji}
									</Animated.Text>
								);
							})}
						</View>
					)}

					<View style={styles.heroRow}>
						<View style={styles.emojiPill}>
							<Text style={styles.emojiText}>🫶</Text>
						</View>
						<View style={styles.headerMeta}>
							<Text style={[styles.title, { color: titleColor }]}>
								{isCompleted ? "Demo is ready" : "Setting up demo experience"}
							</Text>
							<Text style={[styles.subtitle, { color: subtitleColor }]}>
								{isCompleted
									? "You can now explore iVisit end-to-end while we onboard real hospitals near you."
									: "We are creating a safe demo ecosystem so you can use the app with full context."}
							</Text>
						</View>
					</View>

					<View style={[styles.progressTrack, { backgroundColor: surfaceColor }]}>
						<Animated.View
							style={[
								styles.progressFill,
								{
									width: `${Math.max(6, Math.round(progressRatio * 100))}%`,
									backgroundColor: COLORS.brandPrimary,
								},
							]}
						/>
					</View>
					<Text style={[styles.progressText, { color: helperColor }]}>
						{completedCount}/{phases.length} phases completed
					</Text>

					<View style={styles.phaseList}>
						{phases.map((phase) => {
							const status = phaseStatuses?.[phase.key] || "pending";
							const isActive = activePhaseKey === phase.key && isRunning;
							const iconName =
								status === "completed"
									? "checkmark-circle"
									: status === "failed"
										? "alert-circle"
										: isActive
											? "time"
											: "ellipse-outline";
							const iconColor =
								status === "completed"
									? "#10B981"
									: status === "failed"
										? "#DC2626"
										: isActive
											? COLORS.brandPrimary
											: helperColor;

							return (
								<View key={phase.key} style={[styles.phaseRow, { backgroundColor: surfaceColor }]}>
									<Ionicons name={iconName} size={18} color={iconColor} />
									<View style={styles.phaseBody}>
										<Text style={[styles.phaseLabel, { color: titleColor }]}>
											{phase.label}
										</Text>
										<Text style={[styles.phaseDescription, { color: helperColor }]}>
											{phase.description}
										</Text>
									</View>
								</View>
							);
						})}
					</View>

					{error ? (
						<Text style={styles.errorText}>{error}</Text>
					) : (
						<Text style={[styles.helper, { color: helperColor }]}>
							{isRunning
								? "Please keep this screen open while setup completes."
								: "You can turn demo mode off later in More > Demo Mode."}
						</Text>
					)}

					<Pressable
						onPress={() => {
							if (!isRunning) onClose?.();
						}}
						style={[
							styles.primaryButton,
							{
								backgroundColor: isRunning ? "rgba(100,116,139,0.34)" : COLORS.brandPrimary,
								opacity: isRunning ? 0.8 : 1,
							},
						]}
						disabled={isRunning}
					>
						<Text style={styles.primaryButtonText}>
							{isRunning ? "Setting up demo..." : isCompleted ? "Start Demo Experience" : "Close"}
						</Text>
					</Pressable>
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
	confettiLayer: {
		...StyleSheet.absoluteFillObject,
		pointerEvents: "none",
	},
	confettiEmoji: {
		position: "absolute",
		top: 48,
		fontSize: 18,
	},
	heroRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
		gap: 12,
	},
	emojiPill: {
		width: 46,
		height: 46,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(134,16,14,0.18)",
	},
	emojiText: {
		fontSize: 21,
	},
	headerMeta: {
		flex: 1,
	},
	title: {
		fontSize: 21,
		fontWeight: "800",
		letterSpacing: -0.2,
	},
	subtitle: {
		fontSize: 13,
		marginTop: 4,
		lineHeight: 18,
	},
	progressTrack: {
		height: 8,
		borderRadius: 999,
		overflow: "hidden",
		marginTop: 6,
	},
	progressFill: {
		height: "100%",
		borderRadius: 999,
	},
	progressText: {
		marginTop: 8,
		fontSize: 11,
		fontWeight: "600",
	},
	phaseList: {
		marginTop: 12,
		gap: 8,
	},
	phaseRow: {
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	phaseBody: {
		flex: 1,
	},
	phaseLabel: {
		fontSize: 13,
		fontWeight: "700",
	},
	phaseDescription: {
		marginTop: 1,
		fontSize: 11,
	},
	helper: {
		marginTop: 12,
		fontSize: 12,
		lineHeight: 17,
	},
	errorText: {
		marginTop: 12,
		fontSize: 12,
		fontWeight: "600",
		color: "#DC2626",
	},
	primaryButton: {
		marginTop: 14,
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
});

