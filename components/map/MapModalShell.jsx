import React, { useEffect, useRef, useState } from "react";
import {
	Animated,
	Dimensions,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import {
	MAP_MODAL_BACKDROP_IN_MS,
	MAP_MODAL_BACKDROP_OUT_MS,
	MAP_MODAL_EXIT_MS,
	MAP_MODAL_SPRING,
} from "./mapMotionTokens";
import { styles } from "./mapModalShell.styles";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function MapModalShell({
	visible,
	onClose,
	title = null,
	minHeightRatio = 0.78,
	maxHeightRatio = 0.9,
	showHandle = false,
	scrollEnabled = true,
	contentContainerStyle,
	children,
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
					useNativeDriver: true,
					...MAP_MODAL_SPRING,
				}),
				Animated.timing(bgOpacity, {
					toValue: 1,
					duration: MAP_MODAL_BACKDROP_IN_MS,
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
				duration: MAP_MODAL_EXIT_MS,
				useNativeDriver: true,
			}),
			Animated.timing(bgOpacity, {
				toValue: 0,
				duration: MAP_MODAL_BACKDROP_OUT_MS,
				useNativeDriver: true,
			}),
		]).start(({ finished }) => {
			if (finished) {
				setShouldRender(false);
			}
		});

		return undefined;
	}, [bgOpacity, shouldRender, slideAnim, visible]);

	if (!shouldRender) return null;

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const surfaceColor = isDarkMode ? "rgba(8, 15, 27, 0.84)" : "rgba(255, 255, 255, 0.88)";
	const closeBg = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
	const handleColor = isDarkMode ? "rgba(148,163,184,0.54)" : "rgba(100,116,139,0.30)";
	const minHeight = SCREEN_HEIGHT * minHeightRatio;
	const maxHeight = SCREEN_HEIGHT * maxHeightRatio;

	return (
		<View style={styles.root} pointerEvents="box-none">
			<Animated.View style={[styles.backdrop, { opacity: bgOpacity }]}>
				<Pressable style={styles.backdrop} onPress={onClose} />
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
					intensity={isDarkMode ? 44 : 56}
					tint={isDarkMode ? "dark" : "light"}
					style={styles.sheetBlur}
				>
					<View
						style={[
							styles.sheetSurface,
							{
								backgroundColor: surfaceColor,
								minHeight,
								maxHeight,
								paddingBottom: insets.bottom + 18,
							},
						]}
					>
						{showHandle ? (
							<View style={styles.handleWrap}>
								<View style={[styles.handle, { backgroundColor: handleColor }]} />
							</View>
						) : null}

						<View style={styles.headerRow}>
							{title ? (
								<Text style={[styles.headerTitle, { color: titleColor }]}>{title}</Text>
							) : (
								<View style={styles.headerSpacer} />
							)}
							<Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: closeBg }]}>
								<Ionicons name="close" size={18} color={titleColor} />
							</Pressable>
						</View>

						<ScrollView
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							scrollEnabled={scrollEnabled}
							contentContainerStyle={[styles.content, contentContainerStyle]}
						>
							{children}
						</ScrollView>
					</View>
				</BlurView>
			</Animated.View>
		</View>
	);
}
