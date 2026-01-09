"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Pressable,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import ProfileField from "../components/form/ProfileField";
import * as Haptics from "expo-haptics";
import { getMedicalProfileAPI, updateMedicalProfileAPI } from "../api/medicalProfile";

export default function MedicalProfileScreen() {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();

	const backButton = useCallback(() => <HeaderBackButton />, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Medical Profile",
				subtitle: "HEALTH",
				icon: <Ionicons name="fitness" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [backButton, resetHeader, resetTabBar, setHeaderState])
	);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleHeaderScroll, handleTabBarScroll]
	);

	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = 16;

	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [profile, setProfile] = useState(null);

	useEffect(() => {
		let isActive = true;
		(async () => {
			setIsLoading(true);
			const data = await getMedicalProfileAPI();
			if (!isActive) return;
			setProfile(data);
			setIsLoading(false);
		})();
		return () => {
			isActive = false;
		};
	}, []);

	const updateField = useCallback((key, value) => {
		setProfile((prev) => {
			const base = prev && typeof prev === "object" ? prev : {};
			return { ...base, [key]: value };
		});
	}, []);

	const canSave = useMemo(() => {
		return !!profile && !isSaving;
	}, [isSaving, profile]);

	const handleSave = useCallback(async () => {
		if (!profile || isSaving) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setIsSaving(true);
		try {
			const next = await updateMedicalProfileAPI({
				bloodType: profile.bloodType,
				allergies: profile.allergies,
				medications: profile.medications,
				conditions: profile.conditions,
				surgeries: profile.surgeries,
				notes: profile.notes,
			});
			setProfile(next);
		} finally {
			setIsSaving(false);
		}
	}, [isSaving, profile]);

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingTop: topPadding, paddingBottom: bottomPadding },
				]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
			>
				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<Text style={[styles.title, { color: colors.text }]}>
						Your health, summarized
					</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						Blood type, allergies, chronic conditions, medications, and emergency notes
						will live here.
					</Text>
				</View>

				{isLoading ? (
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
							<ActivityIndicator color={COLORS.brandPrimary} />
							<Text style={{ color: colors.textMuted, fontWeight: "700" }}>
								Loading medical profile...
							</Text>
						</View>
					</View>
				) : null}

				{!isLoading && profile ? (
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<ProfileField
							label="Blood Type"
							value={profile.bloodType ?? ""}
							onChange={(v) => updateField("bloodType", v)}
							iconName="water-outline"
						/>
						<ProfileField
							label="Allergies"
							value={profile.allergies ?? ""}
							onChange={(v) => updateField("allergies", v)}
							iconName="warning-outline"
						/>
						<ProfileField
							label="Current Medications"
							value={profile.medications ?? ""}
							onChange={(v) => updateField("medications", v)}
							iconName="medical-outline"
						/>
						<ProfileField
							label="Chronic Conditions"
							value={profile.conditions ?? ""}
							onChange={(v) => updateField("conditions", v)}
							iconName="fitness-outline"
						/>
						<ProfileField
							label="Past Surgeries"
							value={profile.surgeries ?? ""}
							onChange={(v) => updateField("surgeries", v)}
							iconName="bandage-outline"
						/>
						<ProfileField
							label="Emergency Notes"
							value={profile.notes ?? ""}
							onChange={(v) => updateField("notes", v)}
							iconName="document-text-outline"
						/>

						<Pressable
							onPress={handleSave}
							disabled={!canSave}
							style={({ pressed }) => ({
								marginTop: 6,
								height: 54,
								borderRadius: 20,
								backgroundColor: canSave ? COLORS.brandPrimary : colors.textMuted,
								alignItems: "center",
								justifyContent: "center",
								flexDirection: "row",
								gap: 10,
								opacity: pressed ? 0.92 : 1,
							})}
						>
							{isSaving ? (
								<ActivityIndicator color="#FFFFFF" />
							) : (
								<Ionicons name="checkmark" size={18} color="#FFFFFF" />
							)}
							<Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 15, letterSpacing: 1 }}>
								Save Medical Profile
							</Text>
						</Pressable>

						<Text style={{ marginTop: 10, color: colors.textMuted, fontWeight: "700", fontSize: 12 }}>
							Last updated: {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "--"}
						</Text>
					</View>
				) : null}
			</ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flexGrow: 1, padding: 20, gap: 12 },
	card: {
		borderRadius: 20,
		padding: 18,
	},
	title: {
		fontSize: 18,
		fontWeight: "900",
		letterSpacing: -0.3,
	},
	subtitle: {
		marginTop: 8,
		fontSize: 14,
		lineHeight: 20,
	},
});
