"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Pressable,
	ActivityIndicator,
    Animated,
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
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import ProfileField from "../components/form/ProfileField";
import * as Haptics from "expo-haptics";
import { useMedicalProfile } from "../hooks/user/useMedicalProfile";

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
	const topPadding = STACK_TOP_PADDING;

	const [isSaving, setIsSaving] = useState(false);
	const { profile, isLoading, updateProfile } = useMedicalProfile();
	// We need a local state to handle editing form, syncing from profile when loaded
	const [localProfile, setLocalProfile] = useState(null);

	useEffect(() => {
		if (profile) {
			setLocalProfile(profile);
		}
	}, [profile]);

	const updateField = useCallback((key, value) => {
		setLocalProfile((prev) => {
			const base = prev && typeof prev === "object" ? prev : {};
			return { ...base, [key]: value };
		});
	}, []);

    // Derived state: Check if form has unsaved changes
    const hasChanges = useMemo(() => {
        if (!profile || !localProfile) return false;
        return (
            (localProfile.bloodType ?? "") !== (profile.bloodType ?? "") ||
            (localProfile.allergies ?? "") !== (profile.allergies ?? "") ||
            (localProfile.medications ?? "") !== (profile.medications ?? "") ||
            (localProfile.conditions ?? "") !== (profile.conditions ?? "") ||
            (localProfile.surgeries ?? "") !== (profile.surgeries ?? "") ||
            (localProfile.notes ?? "") !== (profile.notes ?? "")
        );
    }, [profile, localProfile]);

    const fabScale = useRef(new Animated.Value(0)).current;

    // Animate FAB when changes are detected
    useEffect(() => {
        Animated.spring(fabScale, {
            toValue: hasChanges ? 1 : 0,
            useNativeDriver: true,
            friction: 6,
            tension: 40,
        }).start();
    }, [hasChanges]);

	const handleSave = useCallback(async () => {
		if (!localProfile || isSaving) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setIsSaving(true);
		try {
			await updateProfile({
				bloodType: localProfile.bloodType,
				allergies: localProfile.allergies,
				medications: localProfile.medications,
				conditions: localProfile.conditions,
				surgeries: localProfile.surgeries,
				notes: localProfile.notes,
			});
		} finally {
			setIsSaving(false);
		}
	}, [isSaving, localProfile, updateProfile]);

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
						Blood type, allergies, chronic conditions, medications, and emergency
						notes will live here.
					</Text>
				</View>

				{isLoading ? (
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<View
							style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
						>
							<ActivityIndicator color={COLORS.brandPrimary} />
							<Text style={{ color: colors.textMuted, fontWeight: "700" }}>
								Loading medical profile...
							</Text>
						</View>
					</View>
				) : null}

				{!isLoading && localProfile ? (
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<ProfileField
							label="Blood Type"
							value={localProfile.bloodType ?? ""}
							onChange={(v) => updateField("bloodType", v)}
							iconName="water-outline"
						/>
						<ProfileField
							label="Allergies"
							value={localProfile.allergies ?? ""}
							onChange={(v) => updateField("allergies", v)}
							iconName="warning-outline"
						/>
						<ProfileField
							label="Current Medications"
							value={localProfile.medications ?? ""}
							onChange={(v) => updateField("medications", v)}
							iconName="medical-outline"
						/>
						<ProfileField
							label="Chronic Conditions"
							value={localProfile.conditions ?? ""}
							onChange={(v) => updateField("conditions", v)}
							iconName="fitness-outline"
						/>
						<ProfileField
							label="Past Surgeries"
							value={localProfile.surgeries ?? ""}
							onChange={(v) => updateField("surgeries", v)}
							iconName="bandage-outline"
						/>
						<ProfileField
							label="Emergency Notes"
							value={localProfile.notes ?? ""}
							onChange={(v) => updateField("notes", v)}
							iconName="document-text-outline"
						/>

						<Text
							style={{
								marginTop: 10,
								color: colors.textMuted,
								fontWeight: "700",
								fontSize: 12,
							}}
						>
							Last updated:{" "}
							{localProfile.updatedAt
								? new Date(localProfile.updatedAt).toLocaleString()
								: "--"}
						</Text>
					</View>
				) : null}
			</ScrollView>

			{/* Floating Action Button for Saving Changes */}
			<Animated.View
				style={{
					position: "absolute",
					bottom: insets.bottom + 20,
					right: 20,
					transform: [{ scale: fabScale }],
					shadowColor: COLORS.brandPrimary,
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.3,
					shadowRadius: 8,
					elevation: 5,
					zIndex: 100,
				}}
			>
				<Pressable
					onPress={handleSave}
					disabled={isSaving}
					style={({ pressed }) => ({
						backgroundColor: COLORS.brandPrimary,
						width: 56,
						height: 56,
						borderRadius: 28,
						justifyContent: "center",
						alignItems: "center",
						opacity: pressed ? 0.9 : 1,
						transform: [{ scale: pressed ? 0.95 : 1 }],
					})}
				>
					{isSaving ? (
						<ActivityIndicator color="#FFFFFF" size="small" />
					) : (
						<Ionicons name="checkmark" size={32} color="#FFFFFF" />
					)}
				</Pressable>
			</Animated.View>
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
