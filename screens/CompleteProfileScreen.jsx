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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import ProfileField from "../components/form/ProfileField";
import { useUpdateProfile } from "../hooks/user/useUpdateProfile";
import { useAuth } from "../contexts/AuthContext";
import { useProfileCompletion } from "../hooks/auth/useProfileCompletion";
import HeaderBackButton from "../components/navigation/HeaderBackButton";

export default function CompleteProfileScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { user, syncUserData, logout } = useAuth();
	const { updateProfile, isLoading: isSaving } = useUpdateProfile();
    const { getDraft, saveDraft, clearDraft } = useProfileCompletion();

    // Ensure we have the latest verification status
    useEffect(() => {
        syncUserData();
    }, []);

	const signOutButton = useCallback(
		() => (
			<Pressable
				onPress={async () => {
					await logout();
					router.replace("/(auth)");
				}}
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				style={{ paddingHorizontal: 6, paddingVertical: 6 }}
			>
				<Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
			</Pressable>
		),
		[logout, router]
	);

	const initialFullName =
		typeof user?.fullName === "string" && user.fullName.trim().length > 0
			? user.fullName
			: [user?.firstName, user?.lastName].filter(Boolean).join(" ");

	const [fullName, setFullName] = useState(initialFullName ?? "");
	const [username, setUsername] = useState(user?.username ?? "");

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Complete Your Profile",
				subtitle: "REQUIRED",
				icon: <Ionicons name="person" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: null,
				rightComponent: signOutButton(),
			});
		}, [resetHeader, resetTabBar, setHeaderState, signOutButton])
	);

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

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

	const backgroundColors = useMemo(
		() =>
			isDarkMode
				? ["#121826", "#0B0F1A", "#121826"]
				: ["#FFFFFF", "#F3E7E7", "#FFFFFF"],
		[isDarkMode]
	);

	const colors = useMemo(
		() => ({
			text: isDarkMode ? "#FFFFFF" : "#0F172A",
			textMuted: isDarkMode ? "#94A3B8" : "#64748B",
			card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
		}),
		[isDarkMode]
	);

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	const normalizedUsername = useMemo(() => {
		const v = typeof username === "string" ? username : "";
		return v.trim().replace(/\s+/g, "_").toLowerCase();
	}, [username]);

	useEffect(() => {
		let isActive = true;
		(async () => {
			const draft = await getDraft();
			if (!isActive || !draft) return;
			if (typeof draft.fullName === "string" && fullName.trim().length === 0) {
				setFullName(draft.fullName);
			}
			if (typeof draft.username === "string" && username.trim().length === 0) {
				setUsername(draft.username);
			}
		})();
		return () => {
			isActive = false;
		};
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			saveDraft({ fullName, username });
		}, 300);
		return () => clearTimeout(timer);
	}, [fullName, username, saveDraft]);

	const canSave =
		typeof fullName === "string" &&
		fullName.trim().length >= 2 &&
		typeof normalizedUsername === "string" &&
		normalizedUsername.length >= 3;

	const splitName = useCallback((name) => {
		const parts = String(name || "")
			.trim()
			.split(/\s+/)
			.filter(Boolean);
		if (parts.length === 0) return { firstName: null, lastName: null };
		if (parts.length === 1) return { firstName: parts[0], lastName: null };
		return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
	}, []);

	const handleSave = useCallback(async () => {
		if (!canSave || isSaving) return;
		try {
			const { firstName, lastName } = splitName(fullName);
			await updateProfile({
				fullName: fullName.trim(),
				username: normalizedUsername,
				firstName,
				lastName,
			});
			await syncUserData();
			await clearDraft();
			router.replace("/(user)/(tabs)");
		} catch (error) {
			console.error("Update profile failed", error);
		}
	}, [canSave, fullName, isSaving, normalizedUsername, router, splitName, syncUserData, updateProfile, clearDraft]);

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
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
			>
				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<Text style={[styles.title, { color: colors.text }]}>
						Let’s set up your account
					</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						We need your name and a username to personalize visits, bookings, and
						emergency flows.
					</Text>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
						Verified Contact
					</Text>
					<Text style={[styles.subtitle, { color: colors.text }]}>
						{user?.emailVerified && user?.email ? user.email : user?.phone ?? user?.email ?? "--"}
					</Text>
					<Text style={[styles.helperText, { color: colors.textMuted }]}>
						{user?.emailVerified || user?.phoneVerified ? "Verified" : "Not verified"}
					</Text>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<ProfileField
						label="Full Name"
						value={fullName}
						onChange={setFullName}
						iconName="person-outline"
					/>
					<ProfileField
						label="Username"
						value={username}
						onChange={setUsername}
						iconName="at-outline"
					/>

					<View style={styles.helperRow}>
						<Ionicons name="sparkles-outline" size={16} color={COLORS.brandPrimary} />
						<Text style={[styles.helperText, { color: colors.textMuted }]}>
							We’ll save as @{normalizedUsername || "username"}
						</Text>
					</View>

					<Pressable
						disabled={!canSave || isSaving}
						onPress={handleSave}
						style={({ pressed }) => ({
							marginTop: 8,
							height: 54,
							borderRadius: 22,
							backgroundColor: COLORS.brandPrimary,
							opacity: !canSave || isSaving ? 0.5 : pressed ? 0.92 : 1,
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							gap: 10,
						})}
					>
						{isSaving ? (
							<ActivityIndicator color="#FFFFFF" />
						) : (
							<Ionicons name="checkmark" size={18} color="#FFFFFF" />
						)}
						<Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "900" }}>
							Finish Setup
						</Text>
					</Pressable>
				</View>
			</Animated.ScrollView>
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
	title: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
	subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight:'400' },
	sectionTitle: {
		fontSize: 10,
		fontWeight: "900",
		letterSpacing: 3,
		textTransform: "uppercase",
	},
	helperRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 8 },
	helperText: { fontSize: 13, fontWeight: "500" },
});
