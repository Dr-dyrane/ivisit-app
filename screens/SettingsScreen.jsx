"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Pressable,
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
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useAuth } from "../contexts/AuthContext";
import { ThemeMode } from "../contexts/ThemeContext";
import { getPreferencesAPI, updatePreferencesAPI } from "../api/preferences";

export default function SettingsScreen() {
	const router = useRouter();
	const { isDarkMode, themeMode, setTheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { user } = useAuth();
	const [preferences, setPreferences] = useState(null);

	const backButton = useCallback(() => <HeaderBackButton />, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Settings",
				subtitle: "PREFERENCES",
				icon: <Ionicons name="settings" size={26} color="#FFFFFF" />,
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

	useEffect(() => {
		let isActive = true;
		(async () => {
			const next = await getPreferencesAPI();
			if (!isActive) return;
			setPreferences(next);
		})();
		return () => {
			isActive = false;
		};
	}, []);

	const passwordRoute = useMemo(() => {
		return user?.hasPassword ? "/(user)/(stacks)/change-password" : "/(user)/(stacks)/create-password";
	}, [user?.hasPassword]);

	const togglePreference = useCallback(
		async (key) => {
			if (!preferences) return;
			const next = await updatePreferencesAPI({ [key]: !preferences[key] });
			setPreferences(next);
	}, [preferences]
	);

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = 16;

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
						App preferences
					</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						Notification preferences, privacy, accessibility, and account controls
						will be centralized here.
					</Text>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
						Theme
					</Text>
					<View style={styles.segmentRow}>
						{[
							{ key: ThemeMode.SYSTEM, label: "System" },
							{ key: ThemeMode.LIGHT, label: "Light" },
							{ key: ThemeMode.DARK, label: "Dark" },
						].map((item) => {
							const selected = themeMode === item.key;
							return (
								<Pressable
									key={item.key}
									onPress={() => setTheme(item.key)}
									style={({ pressed }) => [
										styles.segment,
										{
											backgroundColor: selected
												? COLORS.brandPrimary
												: isDarkMode
												? "rgba(255,255,255,0.06)"
												: "rgba(0,0,0,0.06)",
											opacity: pressed ? 0.92 : 1,
										},
									]}
								>
									<Text
										style={{
											color: selected ? "#FFFFFF" : colors.text,
											fontWeight: "900",
											fontSize: 13,
										}}
									>
										{item.label}
									</Text>
								</Pressable>
							);
						})}
					</View>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
						Notifications
					</Text>
					<Pressable
						onPress={() => togglePreference("notificationsEnabled")}
						style={({ pressed }) => [
							styles.toggleRow,
							{ opacity: pressed ? 0.92 : 1 },
						]}
						disabled={!preferences}
					>
						<View style={styles.toggleLeft}>
							<Ionicons name="notifications" size={18} color={COLORS.brandPrimary} />
							<Text style={[styles.toggleTitle, { color: colors.text }]}>
								All notifications
							</Text>
						</View>
						<Ionicons
							name={preferences?.notificationsEnabled ? "checkmark-circle" : "ellipse-outline"}
							size={20}
							color={preferences?.notificationsEnabled ? COLORS.brandPrimary : colors.textMuted}
						/>
					</Pressable>

					<Pressable
						onPress={() => togglePreference("appointmentReminders")}
						style={({ pressed }) => [
							styles.toggleRow,
							{ opacity: pressed ? 0.92 : 1 },
						]}
						disabled={!preferences || !preferences.notificationsEnabled}
					>
						<View style={styles.toggleLeft}>
							<Ionicons name="calendar" size={18} color={COLORS.brandPrimary} />
							<Text style={[styles.toggleTitle, { color: colors.text }]}>
								Appointment reminders
							</Text>
						</View>
						<Ionicons
							name={preferences?.appointmentReminders ? "checkmark-circle" : "ellipse-outline"}
							size={20}
							color={preferences?.appointmentReminders ? COLORS.brandPrimary : colors.textMuted}
						/>
					</Pressable>

					<Pressable
						onPress={() => togglePreference("emergencyUpdates")}
						style={({ pressed }) => [
							styles.toggleRow,
							{ opacity: pressed ? 0.92 : 1 },
						]}
						disabled={!preferences || !preferences.notificationsEnabled}
					>
						<View style={styles.toggleLeft}>
							<Ionicons name="medical" size={18} color={COLORS.brandPrimary} />
							<Text style={[styles.toggleTitle, { color: colors.text }]}>
								Emergency updates
							</Text>
						</View>
						<Ionicons
							name={preferences?.emergencyUpdates ? "checkmark-circle" : "ellipse-outline"}
							size={20}
							color={preferences?.emergencyUpdates ? COLORS.brandPrimary : colors.textMuted}
						/>
					</Pressable>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
						Privacy
					</Text>
					<Pressable
						onPress={() => togglePreference("privacyShareMedicalProfile")}
						style={({ pressed }) => [
							styles.toggleRow,
							{ opacity: pressed ? 0.92 : 1 },
						]}
						disabled={!preferences}
					>
						<View style={styles.toggleLeft}>
							<Ionicons name="document-text" size={18} color={COLORS.brandPrimary} />
							<Text style={[styles.toggleTitle, { color: colors.text }]}>
								Share medical profile in SOS
							</Text>
						</View>
						<Ionicons
							name={preferences?.privacyShareMedicalProfile ? "checkmark-circle" : "ellipse-outline"}
							size={20}
							color={preferences?.privacyShareMedicalProfile ? COLORS.brandPrimary : colors.textMuted}
						/>
					</Pressable>

					<Pressable
						onPress={() => togglePreference("privacyShareEmergencyContacts")}
						style={({ pressed }) => [
							styles.toggleRow,
							{ opacity: pressed ? 0.92 : 1 },
						]}
						disabled={!preferences}
					>
						<View style={styles.toggleLeft}>
							<Ionicons name="people" size={18} color={COLORS.brandPrimary} />
							<Text style={[styles.toggleTitle, { color: colors.text }]}>
								Share emergency contacts in SOS
							</Text>
						</View>
						<Ionicons
							name={preferences?.privacyShareEmergencyContacts ? "checkmark-circle" : "ellipse-outline"}
							size={20}
							color={preferences?.privacyShareEmergencyContacts ? COLORS.brandPrimary : colors.textMuted}
						/>
					</Pressable>
				</View>

				<Pressable
					onPress={() => router.push(passwordRoute)}
					style={({ pressed }) => [
						styles.securityCard,
						{
							backgroundColor: colors.card,
							opacity: pressed ? 0.92 : 1,
						},
					]}
				>
					<View style={styles.securityIconWrap}>
						<Ionicons name="lock-closed" size={22} color="#FFFFFF" />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={[styles.securityTitle, { color: colors.text }]}>
							{user?.hasPassword ? "Change Password" : "Create Password"}
						</Text>
						<Text style={[styles.securitySubtitle, { color: colors.textMuted }]}>
							{user?.hasPassword ? "Update your password anytime" : "Add password login to your account"}
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
				</Pressable>
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
	sectionTitle: {
		fontSize: 10,
		fontWeight: "900",
		letterSpacing: 3,
		textTransform: "uppercase",
		marginBottom: 12,
	},
	segmentRow: {
		flexDirection: "row",
		gap: 10,
	},
	segment: {
		height: 42,
		flex: 1,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	toggleRow: {
		height: 52,
		borderRadius: 16,
		paddingHorizontal: 14,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: "rgba(0,0,0,0)",
	},
	toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
	toggleTitle: { fontSize: 14, fontWeight: "800" },
	securityCard: {
		borderRadius: 24,
		padding: 18,
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
	},
	securityIconWrap: {
		width: 46,
		height: 46,
		borderRadius: 16,
		backgroundColor: COLORS.brandPrimary,
		alignItems: "center",
		justifyContent: "center",
	},
	securityTitle: { fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
	securitySubtitle: { marginTop: 4, fontSize: 13, fontWeight: "600" },
});
