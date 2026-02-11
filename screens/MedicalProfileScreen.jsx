"use client";

import React from "react";
import {
	View,
	Text,
	StyleSheet,
	Platform,
	ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../constants/colors";
import ProfileField from "../components/form/ProfileField";
import { useMedicalProfileLogic } from "../hooks/user/useMedicalProfileLogic";

export default function MedicalProfileScreen() {
    const { state, animations, actions } = useMedicalProfileLogic();
    const { localProfile, isLoading, colors, layout } = state;

	return (
		<LinearGradient colors={colors.backgrounds} style={{ flex: 1 }}>
			<KeyboardAvoidingView 
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
			>
				<Animated.ScrollView
					contentContainerStyle={[
						styles.content,
						{ paddingTop: layout.topPadding, paddingBottom: layout.bottomPadding },
					]}
					showsVerticalScrollIndicator={false}
					scrollEventThrottle={16}
					onScroll={actions.handleScroll}
					style={{
						opacity: animations.fadeAnim,
						transform: [{ translateY: animations.slideAnim }],
					}}
					keyboardShouldPersistTaps="handled"
				>
				<Animated.View
					style={{
						opacity: animations.fadeAnim,
						transform: [{ translateY: animations.slideAnim }],
						paddingHorizontal: 12,
					}}
				>
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<Text style={[styles.title, { color: colors.text }]}>
							Your health, summarized
						</Text>
						<Text style={[styles.subtitle, { color: colors.textMuted }]}>
							Blood type, allergies, chronic conditions, medications, and emergency
							notes will live here.
						</Text>
					</View>
				</Animated.View>

				{isLoading ? (
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<View
							style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
						>
							<ActivityIndicator color={COLORS.brandPrimary} />
							<Text style={{ color: colors.textMuted, fontWeight: "900", letterSpacing: -0.5 }}>
								Loading medical profile...
							</Text>
						</View>
					</View>
				) : null}

				{!isLoading && localProfile ? (
					<>
						<Animated.View
							style={{
								opacity: animations.fadeAnim,
								transform: [{ translateY: animations.slideAnim }],
								paddingHorizontal: 12,
								paddingTop: 20,
							}}
						>
							<Text
								style={{
									fontSize: 10,
									fontWeight: "800",
									color: colors.textMuted,
									marginBottom: 16,
									letterSpacing: 1.5,
									textTransform: "uppercase",
								}}
							>
								MEDICAL INFORMATION
							</Text>

							<ProfileField
								label="Blood Type"
								value={localProfile.bloodType ?? ""}
								onChange={(v) => actions.updateField("bloodType", v)}
								iconName="water-outline"
							/>
							<ProfileField
								label="Allergies"
								value={localProfile.allergies ?? ""}
								onChange={(v) => actions.updateField("allergies", v)}
								iconName="warning-outline"
							/>
							<ProfileField
								label="Current Medications"
								value={localProfile.medications ?? ""}
								onChange={(v) => actions.updateField("medications", v)}
								iconName="medical-outline"
							/>
						</Animated.View>

						<Animated.View
							style={{
								opacity: animations.fadeAnim,
								transform: [{ translateY: animations.slideAnim }],
								paddingHorizontal: 12,
								marginTop: 32,
							}}
						>
							<Text
								style={{
									fontSize: 10,
									fontWeight: "800",
									color: colors.textMuted,
									marginBottom: 16,
									letterSpacing: 1.5,
									textTransform: "uppercase",
								}}
							>
								HEALTH HISTORY
							</Text>

							<ProfileField
								label="Chronic Conditions"
								value={localProfile.conditions ?? ""}
								onChange={(v) => actions.updateField("conditions", v)}
								iconName="fitness-outline"
							/>
							<ProfileField
								label="Past Surgeries"
								value={localProfile.surgeries ?? ""}
								onChange={(v) => actions.updateField("surgeries", v)}
								iconName="bandage-outline"
							/>
							<ProfileField
								label="Emergency Notes"
								value={localProfile.notes ?? ""}
								onChange={(v) => actions.updateField("notes", v)}
								iconName="document-text-outline"
							/>

							<Text
								style={{
									marginTop: 20,
									color: colors.textMuted,
									fontWeight: "800",
									fontSize: 10,
									letterSpacing: 1.0,
									textTransform: "uppercase",
								}}
							>
								Last updated:{" "}
								{localProfile.updatedAt
									? new Date(localProfile.updatedAt).toLocaleString()
									: "--"}
							</Text>
						</Animated.View>
					</>
				) : null}
				</Animated.ScrollView>
			</KeyboardAvoidingView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	content: { flexGrow: 1, paddingBottom: 40 },
	card: {
		borderRadius: 36,
		padding: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	title: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -1.0,
	},
	subtitle: {
		marginTop: 8,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
	},
});
