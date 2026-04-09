import React, { useEffect, useRef, useState } from "react";
import {
	Animated,
	Dimensions,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function MapGuestProfileModal({
	visible,
	onClose,
	nameValue,
	onNameChange,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const [shouldRender, setShouldRender] = useState(visible);
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			setShouldRender(true);
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					tension: 45,
					friction: 10,
					useNativeDriver: true,
				}),
				Animated.timing(bgOpacity, {
					toValue: 1,
					duration: 280,
					useNativeDriver: true,
				}),
			]).start();
			return undefined;
		}

		if (!shouldRender) {
			return undefined;
		}

		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: SCREEN_HEIGHT,
				duration: 250,
				useNativeDriver: true,
			}),
			Animated.timing(bgOpacity, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}),
		]).start(({ finished }) => {
			if (finished) {
				setShouldRender(false);
			}
		});

		return undefined;
	}, [bgOpacity, shouldRender, slideAnim, visible]);

	const handleDismiss = () => {
		onClose?.();
	};

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const inputSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
	const surfaceColor = isDarkMode ? "rgba(8, 15, 27, 0.84)" : "rgba(255, 255, 255, 0.86)";

	if (!shouldRender) return null;

	return (
		<View style={styles.modalWrapper} pointerEvents="box-none">
			<Animated.View style={[styles.backdrop, { opacity: bgOpacity }]}>
				<Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
			</Animated.View>

			<Animated.View
				style={[
					styles.sheetHost,
					{
						transform: [{ translateY: slideAnim }],
					},
				]}
			>
				<BlurView
					intensity={isDarkMode ? 48 : 56}
					tint={isDarkMode ? "dark" : "light"}
					style={styles.sheetBlur}
				>
					<View
						style={[
							styles.sheetSurface,
							{
								backgroundColor: surfaceColor,
								paddingBottom: insets.bottom + 18,
							},
						]}
					>
						<View style={styles.headerRow}>
							<View style={styles.headerSpacer} />
							<Pressable onPress={handleDismiss} style={[styles.closeButton, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }]}>
								<Ionicons name="close" size={18} color={titleColor} />
							</Pressable>
						</View>

						<View
							style={[
								styles.avatarOrb,
								{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.08)"
										: "rgba(15,23,42,0.05)",
								},
							]}
						>
							<Ionicons name="person" size={52} color={mutedColor} />
						</View>

						<Text style={[styles.title, { color: titleColor }]}>What&apos;s your name?</Text>

						<View style={[styles.inputShell, { backgroundColor: inputSurface }]}>
							<Ionicons name="person-outline" size={18} color={mutedColor} />
							<TextInput
								value={nameValue}
								onChangeText={onNameChange}
								placeholder="Your name"
								placeholderTextColor={mutedColor}
								style={[styles.input, { color: titleColor }]}
							/>
						</View>
					</View>
				</BlurView>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	modalWrapper: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "flex-end",
		zIndex: 200,
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.48)",
	},
	sheetHost: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		borderTopLeftRadius: 38,
		borderTopRightRadius: 38,
		overflow: "hidden",
	},
	sheetBlur: {
		borderTopLeftRadius: 38,
		borderTopRightRadius: 38,
	},
	sheetSurface: {
		borderTopLeftRadius: 38,
		borderTopRightRadius: 38,
		minHeight: SCREEN_HEIGHT * 0.78,
		paddingHorizontal: 20,
		paddingTop: 18,
		alignItems: "center",
	},
	headerRow: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 18,
	},
	headerSpacer: {
		width: 40,
		height: 40,
	},
	closeButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarOrb: {
		width: 112,
		height: 112,
		borderRadius: 56,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 22,
		shadowColor: "#000000",
		shadowOpacity: 0.12,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
	},
	title: {
		fontSize: 28,
		lineHeight: 32,
		fontWeight: "900",
		letterSpacing: -0.9,
		textAlign: "center",
	},
	inputShell: {
		marginTop: 18,
		width: "100%",
		minHeight: 58,
		borderRadius: 24,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	input: {
		flex: 1,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "600",
	},
});
