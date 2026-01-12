"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Pressable,
	ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useFAB } from "../contexts/FABContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import ProfileField from "../components/form/ProfileField";
import * as Haptics from "expo-haptics";
import { useMedicalProfile } from "../hooks/user/useMedicalProfile";
import { useToast } from "../contexts/ToastContext";

export default function MedicalProfileScreen() {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { registerFAB, unregisterFAB } = useFAB();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { showToast } = useToast();

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

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	useEffect(() => {
		// Trigger FAB update when hasChanges changes
		if (hasRegisteredFAB.current) {
			const timer = setTimeout(() => {
				registerFAB('medical-profile-save', {
					icon: 'checkmark',
					label: stableHasChanges ? 'Save Medical Info' : 'No Changes',
					subText: stableHasChanges ? 'Tap to save medical profile' : 'Medical profile up to date',
					visible: stableHasChanges,
					onPress: handleSave,
					loading: isSaving,
					style: 'primary',
					haptic: 'medium',
					priority: 8,
					animation: 'prominent',
					allowInStack: true,
				});
			}, 100);
			
			return () => clearTimeout(timer);
		}
	}, [stableHasChanges, isSaving, handleSave, registerFAB]);

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.spring(slideAnim, {
				toValue: 0,
				friction: 8,
				tension: 50,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

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
        
        const changes = (
            (localProfile.bloodType ?? "") !== (profile.bloodType ?? "") ||
            (localProfile.allergies ?? "") !== (profile.allergies ?? "") ||
            (localProfile.medications ?? "") !== (profile.medications ?? "") ||
            (localProfile.conditions ?? "") !== (profile.conditions ?? "") ||
            (localProfile.surgeries ?? "") !== (profile.surgeries ?? "") ||
            (localProfile.notes ?? "") !== (profile.notes ?? "")
        );
        
        return !!changes;
    }, [profile, localProfile]);

    // Debounced version of hasChanges to prevent FAB flickering
    const debouncedHasChanges = useRef(hasChanges);
    const [stableHasChanges, setStableHasChanges] = useState(hasChanges);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            if (debouncedHasChanges.current !== hasChanges) {
                debouncedHasChanges.current = hasChanges;
                setStableHasChanges(hasChanges);
            }
        }, 500); // 500ms debounce
        
        return () => clearTimeout(timer);
    }, [hasChanges]);

    const hasRegisteredFAB = useRef(false);

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
			showToast("Medical profile updated successfully", "success");
		} catch (error) {
			console.error("Medical profile update failed:", error);
			showToast("Failed to update medical profile", "error");
		} finally {
			setIsSaving(false);
		}
	}, [isSaving, localProfile, updateProfile, showToast]);

    // Register FAB for saving medical profile changes
    useFocusEffect(
        useCallback(() => {
            if (hasRegisteredFAB.current) {
                console.log('[MedicalProfileScreen] FAB already registered, skipping');
                return;
            }
            
            registerFAB('medical-profile-save', {
                icon: 'checkmark',
                label: stableHasChanges ? 'Save Medical Info' : 'No Changes',
                subText: stableHasChanges ? 'Tap to save medical profile' : 'Medical profile up to date',
                visible: stableHasChanges,
                onPress: handleSave,
                loading: isSaving,
                style: 'primary',
                haptic: 'medium',
                priority: 8,
                animation: 'prominent',
                allowInStack: true, // Allow in stack screen
            });
            
            hasRegisteredFAB.current = true;
            
            // Cleanup
            return () => {
                unregisterFAB('medical-profile-save');
                hasRegisteredFAB.current = false;
            };
        }, [registerFAB, unregisterFAB, stableHasChanges, isSaving, handleSave])
    );

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<KeyboardAvoidingView 
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				<Animated.ScrollView
					contentContainerStyle={[
						styles.content,
						{ paddingTop: topPadding, paddingBottom: bottomPadding },
					]}
					showsVerticalScrollIndicator={false}
					scrollEventThrottle={16}
					onScroll={handleScroll}
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
					keyboardShouldPersistTaps="handled"
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
							<Text style={{ color: colors.textMuted, fontWeight: "500" }}>
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
								fontWeight: "500",
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
				</Animated.ScrollView>
			</KeyboardAvoidingView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flexGrow: 1, padding: 20, gap: 12 },
	card: {
		borderRadius: 30,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	title: {
		fontSize: 19,
		fontWeight: "900",
		letterSpacing: -0.5,
	},
	subtitle: {
		marginTop: 8,
		fontSize: 14,
		lineHeight: 20,
	},
});
