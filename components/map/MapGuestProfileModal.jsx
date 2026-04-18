import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import getViewportSurfaceMetrics from "../../utils/ui/viewportSurfaceMetrics";
import EntryActionButton from "../entry/EntryActionButton";
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
	const trimmedEmail = typeof emailValue === "string" ? emailValue.trim() : "";
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
	const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const inputSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
	const avatarSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
	const footerTopGap = Math.max(14, viewportMetrics.insets.sectionGap);
	const heroOrbSize = Math.max(98, Math.round(viewportMetrics.radius.orb * 1.6));
	const canContinue = trimmedEmail.length > 0;

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title={null}
			enableSnapDetents={false}
			contentContainerStyle={[
				styles.content,
				{
					paddingTop: Math.max(8, viewportMetrics.insets.sectionGap - 4),
					paddingBottom: Math.max(20, viewportMetrics.insets.largeGap + 8),
					paddingHorizontal: viewportMetrics.insets.horizontal,
				},
			]}
		>
			<View style={styles.stage}>
				<View style={styles.heroBlock}>
					<View
						style={[
							styles.avatarOrb,
							{
								backgroundColor: avatarSurface,
								width: heroOrbSize,
								height: heroOrbSize,
								borderRadius: Math.round(heroOrbSize / 2),
								marginBottom: viewportMetrics.insets.largeGap,
							},
						]}
					>
						<Ionicons
							name="person-outline"
							size={Math.max(34, Math.round(heroOrbSize * 0.34))}
							color={mutedColor}
						/>
					</View>

					<Text
						style={[
							styles.title,
							{
								color: titleColor,
								fontSize: Math.max(28, viewportMetrics.type.title + 10),
								lineHeight: Math.max(32, viewportMetrics.type.titleLineHeight + 10),
							},
						]}
					>
						What&apos;s your email?
					</Text>

					<Text
						style={[
							styles.body,
							{
								color: bodyColor,
								fontSize: viewportMetrics.type.body,
								lineHeight: viewportMetrics.type.bodyLineHeight,
								marginTop: Math.max(8, viewportMetrics.insets.sectionGap - 4),
							},
						]}
					>
						Next, we&apos;ll send a code.
					</Text>
				</View>

				<View style={[styles.formBlock, { marginTop: viewportMetrics.insets.largeGap }]}>
					<View
						style={[
							styles.inputShell,
							{
								backgroundColor: inputSurface,
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
							onSubmitEditing={() => {
								if (canContinue) {
									onContinue?.();
								}
							}}
							placeholder="you@example.com"
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
							textContentType="emailAddress"
							returnKeyType="go"
						/>
					</View>

					<View style={[styles.inlineCtaWrap, { marginTop: footerTopGap }]}>
						<EntryActionButton
							label="Continue with email"
							onPress={onContinue}
							height={viewportMetrics.cta.primaryHeight}
							radius={viewportMetrics.cta.radius}
							disabled={!canContinue}
							accessibilityHint="Next step sends a one-time code to this email address"
						/>
					</View>
				</View>
			</View>
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	content: {
		flexGrow: 1,
	},
	stage: {
		flexGrow: 1,
	},
	heroBlock: {
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
	body: {
		maxWidth: 420,
		textAlign: "center",
		fontWeight: "400",
	},
	formBlock: {
		width: "100%",
	},
	inputShell: {
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
	inlineCtaWrap: {
		width: "100%",
	},
});
