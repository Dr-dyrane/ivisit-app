import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	Image,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import useAuthViewport from "../../hooks/ui/useAuthViewport";
import { styles } from "./iosInstallGuide.styles";

const INSTALL_STEPS = [
	{
		key: "share",
		eyebrow: "Safari",
		title: "Tap Share",
		body: "Use the square-arrow button in the bottom bar.",
		accentLabel: "Share",
		renderPreview: (palette, pulseStyle) => (
			<View
				style={[
					styles.previewSurface,
					{ backgroundColor: palette.previewSurface },
				]}
			>
				<View style={styles.toolbarRow}>
					<View style={styles.toolbarGhost} />
					<Animated.View
						style={[
							styles.toolbarTarget,
							{ backgroundColor: palette.highlightFill },
							pulseStyle,
						]}
					>
						<Ionicons name="share-outline" size={18} color={COLORS.brandPrimary} />
					</Animated.View>
					<View style={styles.toolbarGhost} />
				</View>
				<View style={[styles.previewCaptionPill, { backgroundColor: palette.captionFill }]}>
					<Text style={[styles.previewCaptionText, { color: palette.captionText }]}>
						Bottom toolbar
					</Text>
				</View>
			</View>
		),
	},
	{
		key: "add",
		eyebrow: "Menu",
		title: "Choose Add to Home Screen",
		body: "Scroll a little, then tap the add-home option.",
		accentLabel: "Add to Home Screen",
		renderPreview: (palette, pulseStyle) => (
			<View
				style={[
					styles.previewSurface,
					styles.previewListSurface,
					{ backgroundColor: palette.previewSurface },
				]}
			>
				<View style={[styles.listRow, { opacity: 0.52 }]}>
					<Ionicons name="bookmark-outline" size={16} color={palette.previewIcon} />
					<Text style={[styles.listRowText, { color: palette.previewText }]}>
						Add Bookmark
					</Text>
				</View>
				<Animated.View
					style={[
						styles.listRow,
						styles.listRowHighlight,
						{ backgroundColor: palette.highlightFill },
						pulseStyle,
					]}
				>
					<Ionicons name="add-circle-outline" size={16} color={COLORS.brandPrimary} />
					<Text style={[styles.listRowText, { color: palette.title }]}>
						Add to Home Screen
					</Text>
				</Animated.View>
				<View style={[styles.listRow, { opacity: 0.52 }]}>
					<Ionicons name="print-outline" size={16} color={palette.previewIcon} />
					<Text style={[styles.listRowText, { color: palette.previewText }]}>
						Print
					</Text>
				</View>
			</View>
		),
	},
	{
		key: "launch",
		eyebrow: "Home Screen",
		title: "Open iVisit from there",
		body: "Next time, launch from the icon for the clean full-screen flow.",
		accentLabel: "iVisit",
		renderPreview: (palette, pulseStyle) => (
			<View
				style={[
					styles.previewSurface,
					styles.previewHomeSurface,
					{ backgroundColor: palette.previewSurface },
				]}
			>
				<View style={styles.homeGrid}>
					<View style={[styles.homeGhostTile, { backgroundColor: palette.homeGhost }]} />
					<Animated.View
						style={[
							styles.homeAppTile,
							{ backgroundColor: palette.highlightFill },
							pulseStyle,
						]}
					>
						<Image
							source={{ uri: "/apple-touch-icon.png" }}
							style={styles.homeAppIcon}
						/>
						<Text style={[styles.homeAppLabel, { color: palette.title }]}>iVisit</Text>
					</Animated.View>
					<View style={[styles.homeGhostTile, { backgroundColor: palette.homeGhost }]} />
				</View>
			</View>
		),
	},
];

const STEP_TRANSITION_MS = 180;
const SHEET_ENTER_MS = 280;
const SHEET_EXIT_MS = 220;
const STEP_TARGET_HEIGHTS = [560, 620, 500];

export default function IOSInstallGuideModal({
	visible = false,
	onClose,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { visibleHeight, browserInsetBottom } = useAuthViewport();
	const [shouldRender, setShouldRender] = useState(visible);
	const [stepIndex, setStepIndex] = useState(0);
	const [isStepAnimating, setIsStepAnimating] = useState(false);
	const overlayOpacity = useRef(new Animated.Value(0)).current;
	const sheetTranslateY = useRef(new Animated.Value(48)).current;
	const sheetScale = useRef(new Animated.Value(0.985)).current;
	const sheetHeight = useRef(new Animated.Value(STEP_TARGET_HEIGHTS[0])).current;
	const stepOpacity = useRef(new Animated.Value(1)).current;
	const stepTranslateX = useRef(new Animated.Value(0)).current;
	const accentPulse = useRef(new Animated.Value(0)).current;

	const palette = useMemo(
		() => ({
			sheet: isDarkMode ? "rgba(8,14,24,0.96)" : "rgba(250,247,245,0.97)",
			sheetTop: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.88)",
			backdrop: isDarkMode ? "rgba(3,7,18,0.56)" : "rgba(15,23,42,0.28)",
			title: isDarkMode ? "#F8FAFC" : "#0F172A",
			body: isDarkMode ? "rgba(226,232,240,0.78)" : "#5B6472",
			eyebrow: isDarkMode ? "rgba(148,163,184,0.82)" : "#6B7280",
			handle: isDarkMode ? "rgba(148,163,184,0.44)" : "rgba(100,116,139,0.24)",
			closeFill: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
			softFill: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)",
			previewSurface: isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.78)",
			previewIcon: isDarkMode ? "rgba(226,232,240,0.58)" : "#7C8799",
			previewText: isDarkMode ? "rgba(226,232,240,0.66)" : "#6B7280",
			highlightFill: isDarkMode ? "rgba(134,16,14,0.18)" : "rgba(134,16,14,0.10)",
			captionFill: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
			captionText: isDarkMode ? "rgba(226,232,240,0.72)" : "#556070",
			progressIdle: isDarkMode ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.10)",
			homeGhost: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
			secondaryText: isDarkMode ? "rgba(226,232,240,0.9)" : "#0F172A",
		}),
		[isDarkMode],
	);

	const activeStep = INSTALL_STEPS[stepIndex];
	const bottomInset = Platform.OS === "web"
		? Math.max(browserInsetBottom || 0, insets?.bottom || 0, 12)
		: Math.max(insets?.bottom || 0, 12);
	const viewportHeight = visibleHeight || 640;
	const desiredSheetHeight =
		STEP_TARGET_HEIGHTS[stepIndex] || STEP_TARGET_HEIGHTS[0];
	const heightBudget = Math.min(
		Math.max(desiredSheetHeight, viewportHeight * 0.78),
		Math.max(380, viewportHeight - 18),
	);
	const pulseScale = accentPulse.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 1.035],
	});
	const pulseOpacity = accentPulse.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 0.92],
	});
	const pulseStyle = {
		transform: [{ scale: pulseScale }],
		opacity: pulseOpacity,
	};

	useEffect(() => {
		const pulseLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(accentPulse, {
					toValue: 1,
					duration: 1200,
					useNativeDriver: true,
				}),
				Animated.timing(accentPulse, {
					toValue: 0,
					duration: 1200,
					useNativeDriver: true,
				}),
			]),
		);

		if (visible) {
			pulseLoop.start();
			return () => {
				pulseLoop.stop();
			};
		}

		accentPulse.stopAnimation?.();
		accentPulse.setValue(0);
		return undefined;
	}, [accentPulse, visible]);

	useEffect(() => {
		if (Platform.OS !== "web") {
			return undefined;
		}

		if (visible) {
			setShouldRender(true);
			setStepIndex(0);
			setIsStepAnimating(false);
			sheetHeight.setValue(
				Math.min(
					Math.max(STEP_TARGET_HEIGHTS[0], viewportHeight * 0.78),
					Math.max(380, viewportHeight - 18),
				),
			);
			stepOpacity.setValue(1);
			stepTranslateX.setValue(0);
			sheetTranslateY.setValue(48);
			sheetScale.setValue(0.985);
			Animated.parallel([
				Animated.timing(overlayOpacity, {
					toValue: 1,
					duration: SHEET_ENTER_MS,
					useNativeDriver: true,
				}),
				Animated.spring(sheetTranslateY, {
					toValue: 0,
					tension: 58,
					friction: 12,
					useNativeDriver: true,
				}),
				Animated.spring(sheetScale, {
					toValue: 1,
					tension: 56,
					friction: 11,
					useNativeDriver: true,
				}),
			]).start();
			return undefined;
		}

		if (!shouldRender) {
			return undefined;
		}

		Animated.parallel([
			Animated.timing(overlayOpacity, {
				toValue: 0,
				duration: SHEET_EXIT_MS,
				useNativeDriver: true,
			}),
			Animated.timing(sheetTranslateY, {
				toValue: 48,
				duration: SHEET_EXIT_MS,
				useNativeDriver: true,
			}),
			Animated.timing(sheetScale, {
				toValue: 0.985,
				duration: SHEET_EXIT_MS,
				useNativeDriver: true,
			}),
		]).start(({ finished }) => {
			if (finished) {
				setShouldRender(false);
			}
		});

		return undefined;
	}, [
		overlayOpacity,
		shouldRender,
		sheetHeight,
		sheetScale,
		sheetTranslateY,
		stepOpacity,
		stepTranslateX,
		viewportHeight,
		visible,
	]);

	useEffect(() => {
		if (!shouldRender) {
			return undefined;
		}

		Animated.timing(sheetHeight, {
			toValue: heightBudget,
			duration: STEP_TRANSITION_MS + 40,
			useNativeDriver: false,
		}).start();

		return undefined;
	}, [heightBudget, sheetHeight, shouldRender]);

	const transitionToStep = (nextIndex, direction) => {
		if (isStepAnimating || nextIndex === stepIndex || nextIndex < 0 || nextIndex >= INSTALL_STEPS.length) {
			return;
		}

		setIsStepAnimating(true);
		Animated.parallel([
			Animated.timing(stepOpacity, {
				toValue: 0,
				duration: STEP_TRANSITION_MS,
				useNativeDriver: true,
			}),
			Animated.timing(stepTranslateX, {
				toValue: direction > 0 ? -18 : 18,
				duration: STEP_TRANSITION_MS,
				useNativeDriver: true,
			}),
		]).start(({ finished }) => {
			if (!finished) {
				setIsStepAnimating(false);
				return;
			}

			setStepIndex(nextIndex);
			stepTranslateX.setValue(direction > 0 ? 18 : -18);
			Animated.parallel([
				Animated.timing(stepOpacity, {
					toValue: 1,
					duration: STEP_TRANSITION_MS,
					useNativeDriver: true,
				}),
				Animated.timing(stepTranslateX, {
					toValue: 0,
					duration: STEP_TRANSITION_MS,
					useNativeDriver: true,
				}),
			]).start(() => {
				setIsStepAnimating(false);
			});
		});
	};

	const handleNext = () => {
		if (stepIndex >= INSTALL_STEPS.length - 1) {
			onClose?.();
			return;
		}
		transitionToStep(stepIndex + 1, 1);
	};

	const handleBack = () => {
		if (stepIndex <= 0) {
			return;
		}
		transitionToStep(stepIndex - 1, -1);
	};

	if (Platform.OS !== "web" || !shouldRender) {
		return null;
	}

	return (
		<Modal
			visible={shouldRender}
			transparent
			animationType="none"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<Animated.View
					style={[
						styles.backdrop,
						{
							backgroundColor: palette.backdrop,
							opacity: overlayOpacity,
						},
					]}
				>
					<Pressable style={styles.backdropPressable} onPress={onClose} />
				</Animated.View>

				<View style={[styles.sheetDock, { paddingBottom: bottomInset }]}>
					<Animated.View
						style={[
							styles.sheet,
							{
								backgroundColor: palette.sheet,
								height: sheetHeight,
								transform: [{ translateY: sheetTranslateY }, { scale: sheetScale }],
							},
						]}
					>
						<LinearGradient
							pointerEvents="none"
							colors={[
								palette.sheetTop,
								"transparent",
								"transparent",
							]}
							start={{ x: 0.5, y: 0 }}
							end={{ x: 0.5, y: 1 }}
							style={styles.sheetWash}
						/>
						<View style={[styles.handle, { backgroundColor: palette.handle }]} />

						<ScrollView
							style={styles.sheetScroll}
							contentContainerStyle={styles.sheetScrollContent}
							showsVerticalScrollIndicator={false}
							bounces={false}
						>
							<View style={styles.headerRow}>
								<View style={styles.progressWrap}>
									<Text style={[styles.progressLabel, { color: palette.eyebrow }]}>
										{stepIndex + 1} of {INSTALL_STEPS.length}
									</Text>
									<View style={styles.progressDots}>
										{INSTALL_STEPS.map((step, index) => (
											<View
												key={step.key}
												style={[
													styles.progressDot,
													index === stepIndex
														? styles.progressDotActive
														: null,
													{
														backgroundColor:
															index === stepIndex
																? COLORS.brandPrimary
																: palette.progressIdle,
													},
												]}
											/>
										))}
									</View>
								</View>
								<Pressable
									onPress={onClose}
									style={({ pressed }) => [
										styles.closeButton,
										{
											backgroundColor: palette.closeFill,
											opacity: pressed ? 0.82 : 1,
											transform: [{ scale: pressed ? 0.96 : 1 }],
										},
									]}
								>
									<Ionicons name="close" size={16} color={palette.title} />
								</Pressable>
							</View>

							<Animated.View
								style={[
									styles.stepStage,
									{
										opacity: stepOpacity,
										transform: [{ translateX: stepTranslateX }],
									},
								]}
							>
								<View style={styles.stepIntro}>
									<Text style={[styles.eyebrow, { color: palette.eyebrow }]}>
										{activeStep.eyebrow}
									</Text>
									<Text style={[styles.title, { color: palette.title }]}>
										{activeStep.title}
									</Text>
									<Text style={[styles.body, { color: palette.body }]}>
										{activeStep.body}
									</Text>
								</View>

								<View style={styles.previewWrap}>
									{activeStep.renderPreview(palette, pulseStyle)}
								</View>

								<View style={[styles.accentPill, { backgroundColor: palette.softFill }]}>
									<Ionicons name="checkmark-circle" size={14} color={COLORS.brandPrimary} />
									<Text style={[styles.accentPillText, { color: palette.secondaryText }]}>
										{activeStep.accentLabel}
									</Text>
								</View>
							</Animated.View>
						</ScrollView>

						<View style={styles.actionsRow}>
							<Pressable
								onPress={handleBack}
								disabled={stepIndex === 0 || isStepAnimating}
								style={({ pressed }) => [
									styles.secondaryButton,
									{
										backgroundColor: palette.softFill,
										opacity: stepIndex === 0 ? 0.38 : pressed ? 0.82 : 1,
										transform: [{ scale: pressed && stepIndex > 0 ? 0.98 : 1 }],
									},
								]}
							>
								<Text style={[styles.secondaryButtonText, { color: palette.secondaryText }]}>
									Back
								</Text>
							</Pressable>

							<Pressable
								onPress={handleNext}
								disabled={isStepAnimating}
								style={({ pressed }) => [
									styles.primaryButton,
									{
										backgroundColor: COLORS.brandPrimary,
										opacity: pressed ? 0.9 : 1,
										transform: [{ scale: pressed ? 0.985 : 1 }],
									},
								]}
							>
								<Text style={styles.primaryButtonText}>
									{stepIndex === INSTALL_STEPS.length - 1 ? "Done" : "Next"}
								</Text>
								<Ionicons
									name={stepIndex === INSTALL_STEPS.length - 1 ? "checkmark" : "chevron-forward"}
									size={15}
									color="#FFFFFF"
								/>
							</Pressable>
						</View>
					</Animated.View>
				</View>
			</View>
		</Modal>
	);
}
