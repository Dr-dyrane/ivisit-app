import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import getViewportSurfaceMetrics from "../../utils/ui/viewportSurfaceMetrics";
import MapModalShell from "./surfaces/MapModalShell";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

export default function MapGuestProfileModal({
	visible,
	onClose,
	emailValue,
	onEmailChange,
	onContinue,
}) {
	const { isDarkMode } = useTheme();
	const { width, height } = useWindowDimensions();
	const viewportMetrics = useMemo(
		() =>
			getViewportSurfaceMetrics({
				width,
				height,
				platform: Platform.OS,
				presentationMode: "modal",
			}),
		[height, width],
	);
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const inputSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
	const avatarSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title={null}
			minHeightRatio={0.78}
			contentContainerStyle={[
				styles.content,
				{
					paddingTop: Math.max(10, viewportMetrics.insets.sectionGap - 2),
					paddingBottom: Math.max(12, viewportMetrics.insets.sectionGap),
				},
			]}
		>
			<View
				style={[
					styles.avatarOrb,
					{
						backgroundColor: avatarSurface,
						width: viewportMetrics.radius.orb * 2,
						height: viewportMetrics.radius.orb * 2,
						borderRadius: viewportMetrics.radius.orb,
						marginBottom: viewportMetrics.insets.largeGap,
					},
				]}
			>
				<Ionicons
					name="person"
					size={Math.max(38, Math.round(viewportMetrics.radius.orb * 0.92))}
					color={mutedColor}
				/>
			</View>

			<Text
				style={[
					styles.title,
					{
						color: titleColor,
						fontSize: Math.max(24, viewportMetrics.type.title + 6),
						lineHeight: Math.max(28, viewportMetrics.type.titleLineHeight + 6),
					},
				]}
			>
				What&apos;s your email?
			</Text>

			<View
				style={[
					styles.inputShell,
					{
						backgroundColor: inputSurface,
						marginTop: viewportMetrics.insets.sectionGap,
						minHeight: viewportMetrics.cta.primaryHeight,
						paddingHorizontal: Math.max(16, viewportMetrics.modal.contentPadding - 2),
						borderRadius: viewportMetrics.radius.card,
					},
				]}
			>
				<Ionicons
					name="mail-outline"
					size={Math.max(18, viewportMetrics.type.body + 2)}
					color={mutedColor}
				/>
				<TextInput
					value={emailValue}
					onChangeText={onEmailChange}
					placeholder="Email"
					placeholderTextColor={mutedColor}
					style={[
						styles.input,
						{
							color: titleColor,
							fontSize: viewportMetrics.type.body,
							lineHeight: viewportMetrics.type.bodyLineHeight - 4,
						},
					]}
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
					autoComplete="email"
				/>
			</View>

			{Platform.OS === "web" && typeof onContinue === "function" ? (
				<Pressable
					onPress={onContinue}
					style={[
						styles.continueButton,
						{
							marginTop: viewportMetrics.insets.sectionGap,
							minHeight: viewportMetrics.cta.primaryHeight,
							paddingHorizontal: viewportMetrics.modal.contentPadding,
							borderRadius: viewportMetrics.cta.radius,
						},
					]}
				>
					<Text style={styles.continueButtonText}>Continue</Text>
				</Pressable>
			) : null}
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingTop: 10,
		paddingBottom: 12,
		alignItems: "center",
	},
	avatarOrb: {
		width: 112,
		height: 112,
		borderRadius: 56,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 22,
		overflow: "hidden",
		position: "relative",
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
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		overflow: "hidden",
		position: "relative",
		...squircle(24),
	},
	input: {
		flex: 1,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "400",
	},
	continueButton: {
		marginTop: 16,
		minWidth: 160,
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderRadius: 999,
		backgroundColor: "#86100E",
		alignItems: "center",
		justifyContent: "center",
	},
	continueButtonText: {
		color: "#FFFFFF",
		fontSize: 15,
		lineHeight: 18,
		fontWeight: "800",
	},
});
