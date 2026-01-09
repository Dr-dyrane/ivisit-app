import React from "react";
import { Animated, View, Text, Platform, StyleSheet } from "react-native";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { BlurView } from "expo-blur";
import NotificationIconButton from "./NotificationIconButton";
import SearchIconButton from "./SearchIconButton";

const HEADER_HEIGHT = 60;

/**
 * ScrollAwareHeader Component (Sticky)
 *
 * Features:
 * - Pure glass/frosted effect with high blur
 * - Minimal opacity for transparency
 * - Fixed at top - doesn't scroll with content
 * - Uses useNativeDriver for 60fps performance
 */
export default function ScrollAwareHeader({
	title,
	subtitle,
	icon,
	backgroundColor = "#86100E",
	badge,
	leftComponent,
	rightComponent,
}) {
	const insets = useSafeAreaInsets();
	const { isDarkMode } = useTheme();
	const { headerOpacity, titleOpacity } = useScrollAwareHeader();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
	};

	const resolvedRight =
		rightComponent === false ? null : rightComponent == null ? (
			<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
				<SearchIconButton />
				<NotificationIconButton />
			</View>
		) : (
			rightComponent
		);

	return (
		<Animated.View
			style={[
				styles.container,
				{
					opacity: headerOpacity,
					zIndex: 10,
					paddingTop: insets.top,
					minHeight: HEADER_HEIGHT + insets.top,
					marginHorizontal: 2,
					borderRadius: 32,
				},
			]}
		>
			<BlurView
				intensity={Platform.OS === "ios" ? 80 : 100}
				tint={isDarkMode ? "dark" : "light"}
				style={[styles.blur, { minHeight: HEADER_HEIGHT }]}
			>
				<View
					style={{
						height: HEADER_HEIGHT,
						backgroundColor: isDarkMode
							? "rgba(11, 15, 26, 0.015)"
							: "rgba(255, 255, 255, 0.02)",
						paddingHorizontal: 16,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
					}}
				>
					{leftComponent && (
						<View
							style={{
								width: 40,
								height: 40,
								justifyContent: "center",
								alignItems: "center",
							}}
						>
							{leftComponent}
						</View>
					)}

					<View
						style={{
							flex: 1,
							flexDirection: "row",
							alignItems: "center",
							minHeight: HEADER_HEIGHT,
							justifyContent: "center",
						}}
					>
						{icon && (
							<View
								style={{
									width: 36,
									height: 36,
									borderRadius: 12,
									backgroundColor: backgroundColor,
									alignItems: "center",
									justifyContent: "center",
									marginRight: 14,
									flexShrink: 0,
								}}
							>
								{icon}
							</View>
						)}

						<View style={{ flex: 1, justifyContent: "center" }}>
							{subtitle && (
								<Text
									numberOfLines={1}
									style={{
										fontSize: 9,
										fontWeight: "900",
										color: colors.textMuted,
										letterSpacing: 2,
										textTransform: "uppercase",
										marginBottom: 3,
									}}
								>
									{subtitle}
								</Text>
							)}
							<Animated.Text
								numberOfLines={1}
								style={{
									fontSize: 19,
									fontWeight: "900",
									color: colors.text,
									letterSpacing: -0.5,
									opacity: titleOpacity,
								}}
							>
								{title}
							</Animated.Text>
						</View>

						{badge && (
							<View
								style={{
									backgroundColor: backgroundColor,
									minWidth: 32,
									height: 32,
									borderRadius: 16,
									alignItems: "center",
									justifyContent: "center",
									marginLeft: 12,
									flexShrink: 0,
								}}
							>
								<Text
									style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 12 }}
								>
									{badge}
								</Text>
							</View>
						)}
					</View>

						{resolvedRight && (
							<View
								style={{
									minWidth: 40,
									height: 40,
									justifyContent: "center",
									alignItems: "center",
								}}
							>
								{resolvedRight}
							</View>
						)}
				</View>
			</BlurView>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 10,
	},
	blur: {
		overflow: "hidden",
		marginHorizontal: 2,
		borderRadius: 32,
	},
});
