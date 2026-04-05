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
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import SlideButton from "../ui/SlideButton";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
	const pulse = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!visible) {
			slideY.setValue(44);
			fade.setValue(0);
			pulse.setValue(0);
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
	}, [fade, pulse, slideY, visible]);

	useEffect(() => {
		if (!visible || !isRunning) {
			pulse.stopAnimation();
			pulse.setValue(0);
			return;
		}

		Animated.loop(
			Animated.sequence([
				Animated.timing(pulse, {
					toValue: 1,
					duration: 900,
					useNativeDriver: true,
				}),
				Animated.timing(pulse, {
					toValue: 0,
					duration: 900,
					useNativeDriver: true,
				}),
			])
		).start();
	}, [isRunning, pulse, visible]);

	const palette = useMemo(() => {
		const accent = error ? "#DC2626" : isCompleted ? "#059669" : COLORS.brandPrimary;
		return {
			accent,
			accentSoft: isDarkMode
				? `${accent}26`
				: `${accent}14`,
			surface: isDarkMode ? "#0D1420" : "#FFFFFF",
			surfaceMuted: isDarkMode ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.10)",
			text: isDarkMode ? "#F8FAFC" : "#0F172A",
			textMuted: isDarkMode ? "#CBD5E1" : "#475569",
			textSubtle: isDarkMode ? "#9FB1C8" : "#64748B",
		};
	}, [error, isCompleted, isDarkMode]);

	const completedCount = useMemo(
		() => phases.filter((phase) => phaseStatuses?.[phase.key] === "completed").length,
		[phases, phaseStatuses]
	);

	const progressRatio = phases.length > 0 ? completedCount / phases.length : 0;
	const activePhase = phases.find((phase) => phase.key === activePhaseKey) || null;

	const copy = useMemo(() => {
		if (error) {
			return {
				badge: "Setup interrupted",
				title: "Preview setup paused",
				subtitle:
					"We could not finish right now. You can close this and try again.",
				helper:
					"Live hospitals are still available while you retry.",
			};
		}

		if (isCompleted) {
			return {
				badge: "Preview is ready",
				title: "Preview hospitals are ready",
				subtitle:
					"You can continue now.",
				helper:
					"You'll see preview hospitals until live coverage expands nearby.",
			};
		}

		return {
			badge: "Preparing preview coverage",
			title: "Preparing preview hospitals nearby",
			subtitle:
				"This usually takes a few seconds.",
			helper:
				"Please keep this screen open.",
		};
	}, [error, isCompleted]);

	const primaryLabel = isRunning
		? "PREPARING..."
		: isCompleted
			? "CONTINUE"
			: "CLOSE";
	const primaryIconName = isCompleted ? "arrow-forward" : "close";

	const sheetHeight = Math.min(Math.max(SCREEN_HEIGHT * 0.76, 470), SCREEN_HEIGHT * 0.86);

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
										error
											? "alert-circle-outline"
											: isCompleted
												? "checkmark-circle-outline"
												: "time-outline"
									}
									size={14}
									color={palette.accent}
								/>
								<Text style={[styles.statusBadgeText, { color: palette.accent }]}>
									{copy.badge}
								</Text>
							</View>

							<Pressable
								onPress={() => {
									if (!isRunning) onClose?.();
								}}
								disabled={isRunning}
								hitSlop={12}
								style={[
									styles.closeButton,
									{
										backgroundColor: palette.surfaceMuted,
										opacity: isRunning ? 0.45 : 1,
									},
								]}
							>
								<Ionicons name="close" size={16} color={palette.textSubtle} />
							</Pressable>
						</View>

						<View style={styles.heroRow}>
							<Animated.View
								style={[
									styles.heroIconWrap,
									{
										backgroundColor: palette.accentSoft,
										transform: [
											{
												scale: pulse.interpolate({
													inputRange: [0, 1],
													outputRange: [1, 1.04],
												}),
											},
										],
									},
								]}
							>
								<Ionicons
									name={
										error
											? "construct-outline"
											: isCompleted
												? "sparkles-outline"
												: "layers-outline"
									}
									size={26}
									color={palette.accent}
								/>
							</Animated.View>

							<View style={styles.heroCopy}>
								<Text style={[styles.title, { color: palette.text }]}>
									{copy.title}
								</Text>
								<Text style={[styles.subtitle, { color: palette.textMuted }]}>
									{copy.subtitle}
								</Text>
							</View>
						</View>

						<View
							style={[
								styles.progressPanel,
								{
									backgroundColor: palette.surfaceMuted,
									shadowColor: palette.accent,
									shadowOpacity: 0.05,
									shadowRadius: 14,
									shadowOffset: { width: 0, height: 8 },
									elevation: 0,
								},
							]}
						>
							<View style={styles.progressPanelHeader}>
								<Text style={[styles.progressTitle, { color: palette.text }]}>
									Setup progress
								</Text>
								<Text style={[styles.progressLabel, { color: palette.textSubtle }]}>
									{completedCount}/{phases.length} complete
								</Text>
							</View>

							<View
								style={[
									styles.progressTrack,
									{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)" },
								]}
							>
								<View
									style={[
										styles.progressFill,
										{
											width: `${Math.max(8, Math.round(progressRatio * 100))}%`,
											backgroundColor: palette.accent,
										},
									]}
								/>
							</View>

							{activePhase ? (
								<View style={styles.activePhaseRow}>
									<Ionicons name="sync-outline" size={15} color={palette.accent} />
									<Text style={[styles.activePhaseText, { color: palette.textMuted }]}>
										Now working on: {activePhase.label}
									</Text>
								</View>
							) : null}
						</View>

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
								const badgeText =
									status === "completed"
										? "Done"
										: status === "failed"
											? "Issue"
											: isActive
												? "Working"
												: "Waiting";

								return (
									<View
										key={phase.key}
										style={[
											styles.phaseRow,
											{
												backgroundColor: isActive
													? palette.accentSoft
													: palette.surfaceMuted,
												shadowColor: isActive ? palette.accent : "#000000",
												shadowOpacity: isActive ? 0.14 : 0.03,
												shadowRadius: isActive ? 18 : 10,
												shadowOffset: { width: 0, height: isActive ? 10 : 4 },
												elevation: isActive ? 6 : 0,
											},
										]}
									>
										<View style={styles.phaseIconRow}>
											<Ionicons
												name={iconName}
												size={18}
												color={
													status === "completed"
														? "#10B981"
														: status === "failed"
															? "#DC2626"
															: isActive
																? palette.accent
																: palette.textSubtle
												}
											/>
										</View>

										<View style={styles.phaseBody}>
											<View style={styles.phaseHeader}>
												<Text style={[styles.phaseLabel, { color: palette.text }]}>
													{phase.label}
												</Text>
												<View
													style={[
														styles.phaseBadge,
														{
															backgroundColor: isActive
																? palette.accentSoft
																: palette.surface,
														},
													]}
												>
													<Text
														style={[
															styles.phaseBadgeText,
															{ color: isActive ? palette.accent : palette.textSubtle },
														]}
													>
														{badgeText}
													</Text>
												</View>
											</View>
											{isActive ? (
												<Text
													style={[
														styles.phaseDescription,
														{ color: palette.textSubtle },
													]}
												>
													In progress
												</Text>
											) : null}
										</View>
									</View>
								);
							})}
						</View>

						<View
							style={[
								styles.helperCard,
								{
									backgroundColor: palette.surfaceMuted,
								},
							]}
						>
							<Ionicons
								name={error ? "information-circle-outline" : "shield-checkmark-outline"}
								size={18}
								color={palette.accent}
							/>
							<Text style={[styles.helperText, { color: palette.textMuted }]}>
								{error ? error : copy.helper}
							</Text>
						</View>
					</ScrollView>

					{isRunning ? (
						<View
							style={[
								styles.disabledPrimaryButton,
								{
									backgroundColor: isDarkMode ? COLORS.bgDark : "#F3E7E7",
								},
							]}
						>
							<Text style={[styles.disabledPrimaryButtonText, { color: COLORS.brandPrimary }]}>
								{primaryLabel}
							</Text>
							<Ionicons name="time-outline" size={18} color={COLORS.brandPrimary} />
						</View>
					) : (
						<View style={styles.primaryButtonWrap}>
							<SlideButton
								onPress={() => onClose?.()}
								height={62}
								radius={22}
								icon={(color) => (
									<Ionicons name={primaryIconName} size={18} color={color} />
								)}
							>
								{primaryLabel}
							</SlideButton>
						</View>
					)}
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
		paddingBottom: Platform.OS === "ios" ? 24 : 18,
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
		paddingBottom: 16,
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
		width: 56,
		height: 56,
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
	progressPanel: {
		borderRadius: 18,
		padding: 14,
		marginBottom: 14,
	},
	progressPanelHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	progressTitle: {
		fontSize: 15,
		fontWeight: "800",
	},
	progressLabel: {
		fontSize: 12,
		fontWeight: "700",
	},
	progressTrack: {
		height: 8,
		borderRadius: 999,
		overflow: "hidden",
		marginTop: 12,
	},
	progressFill: {
		height: "100%",
		borderRadius: 999,
	},
	activePhaseRow: {
		marginTop: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	activePhaseText: {
		fontSize: 12,
		fontWeight: "600",
	},
	phaseList: {
		gap: 10,
	},
	phaseRow: {
		borderRadius: 18,
		padding: 14,
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
	},
	phaseIconRow: {
		paddingTop: 2,
	},
	phaseBody: {
		flex: 1,
	},
	phaseHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	phaseLabel: {
		flex: 1,
		fontSize: 14,
		fontWeight: "800",
	},
	phaseBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
	},
	phaseBadgeText: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 0.3,
	},
	phaseDescription: {
		fontSize: 12,
		lineHeight: 18,
		marginTop: 5,
	},
	helperCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
		borderRadius: 18,
		padding: 14,
		marginTop: 14,
	},
	helperText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 19,
	},
	primaryButtonWrap: {
		width: "100%",
		marginTop: 14,
	},
	disabledPrimaryButton: {
		minHeight: 62,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 10,
		marginTop: 14,
	},
	disabledPrimaryButtonText: {
		fontSize: 16,
		fontWeight: "900",
		letterSpacing: 2,
	},
});
