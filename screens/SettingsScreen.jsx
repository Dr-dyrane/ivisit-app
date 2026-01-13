"use client";

import { useCallback, useMemo, useRef, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	TouchableOpacity,
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
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useAuth } from "../contexts/AuthContext";
import { ThemeMode } from "../contexts/ThemeContext";
import { usePreferences } from "../contexts/PreferencesContext";
import * as Haptics from "expo-haptics";

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
	const { preferences, updatePreferences } = usePreferences();

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

	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	const passwordRoute = useMemo(() => {
		return user?.hasPassword ? "/(user)/(stacks)/change-password" : "/(user)/(stacks)/create-password";
	}, [user?.hasPassword]);

	const togglePreference = useCallback(
		async (key) => {
			if (!preferences) return;
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			await updatePreferences({ [key]: !preferences[key] });
		},
		[preferences, updatePreferences]
	);

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<ScrollView
				contentContainerStyle={{
					paddingTop: topPadding,
					paddingBottom: 40,
				}}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
			>
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 24,
					}}
				>
					{/* Service Provider Header */}
					<View style={styles.providerHeader}>
						<Text style={[styles.providerTitle, { color: colors.text }]}>
							Service Preferences
						</Text>
						<Text style={[styles.providerSubtitle, { color: colors.textMuted }]}>
							Manage your iVisit service experience
						</Text>
					</View>

					{/* Location-Based Service Card */}
					<Pressable
						onPress={() => togglePreference("notificationsEnabled")}
						disabled={!preferences}
						style={({ pressed }) => [
							styles.serviceCard,
							{ 
								backgroundColor: colors.card,
								transform: [{ scale: pressed ? 0.98 : 1 }]
							}
						]}
					>
						{/* Service Provider Header */}
						<View style={styles.serviceHeader}>
							<View style={styles.providerInfo}>
								<View style={styles.providerAvatar}>
									<Ionicons 
										name="notifications" 
										size={20} 
										color={COLORS.brandPrimary} 
									/>
								</View>
								<View style={styles.providerDetails}>
									<Text style={[styles.providerName, { color: colors.text }]}>
										Alert Services
									</Text>
									<Text style={[styles.providerStatus, { color: colors.textMuted }]}>
										{preferences?.notificationsEnabled ? "Active" : "Disabled"}
									</Text>
								</View>
							</View>
							<View style={styles.serviceMeta}>
								<View style={[styles.metaPill, { backgroundColor: `${COLORS.brandPrimary}15` }]}>
									<Ionicons name="location" size={12} color={COLORS.brandPrimary} />
									<Text style={[styles.metaText, { color: COLORS.brandPrimary }]}>Real-time</Text>
								</View>
							</View>
						</View>

						{/* Service Description */}
						<Text style={[styles.serviceDescription, { color: colors.textMuted }]}>
							Receive real-time notifications for appointments, emergencies, and updates from healthcare providers in your area
						</Text>

						{/* Service Stats */}
						<View style={styles.serviceStats}>
							<View style={styles.statItem}>
								<Text style={[styles.statValue, { color: colors.text }]}>
									{preferences?.notificationsEnabled ? "24/7" : "Off"}
								</Text>
								<Text style={[styles.statLabel, { color: colors.textMuted }]}>Availability</Text>
							</View>
							<View style={styles.statItem}>
								<Text style={[styles.statValue, { color: colors.text }]}>
									{preferences?.notificationsEnabled ? "Instant" : "N/A"}
								</Text>
								<Text style={[styles.statLabel, { color: colors.textMuted }]}>Response</Text>
							</View>
							<View style={styles.statItem}>
								<Text style={[styles.statValue, { color: colors.text }]}>
									{preferences?.notificationsEnabled ? "All" : "None"}
								</Text>
								<Text style={[styles.statLabel, { color: colors.textMuted }]}>Coverage</Text>
							</View>
						</View>

						{/* Action Footer */}
						<View style={styles.serviceFooter}>
							<View style={styles.toggleContainer}>
								<View
									style={{
										width: 52,
										height: 30,
										borderRadius: 15,
										backgroundColor: preferences?.notificationsEnabled ? COLORS.brandPrimary : "#D1D5DB",
										justifyContent: "center",
									}}
								>
									<View
										style={{
											width: 24,
											height: 24,
											borderRadius: 12,
											backgroundColor: "#FFFFFF",
											position: "absolute",
											left: preferences?.notificationsEnabled ? 25 : 3,
											shadowColor: "#000",
											shadowOffset: { width: 0, height: 2 },
											shadowOpacity: 0.15,
											shadowRadius: 3,
											elevation: 3,
										}}
									/>
								</View>
							</View>
							<Text style={[styles.actionText, { color: colors.textMuted }]}>
								{preferences?.notificationsEnabled ? "Service Active" : "Tap to enable"}
							</Text>
						</View>
					</Pressable>

					{/* Premium Medical Vault Card - Appointment Services */}
					<Pressable
						onPress={() => togglePreference("appointmentReminders")}
						disabled={!preferences || !preferences.notificationsEnabled}
						style={({ pressed }) => [
							styles.serviceCard,
							{ 
								backgroundColor: colors.card,
								transform: [{ scale: pressed ? 0.98 : 1 }],
								opacity: !preferences || !preferences.notificationsEnabled ? 0.5 : 1,
							}
						]}
					>
						{/* Hero Section - Service Provider Banner */}
						<View style={styles.heroSection}>
							<View style={styles.heroContent}>
								<View style={styles.heroIconContainer}>
									<Ionicons 
										name="calendar" 
										size={24} 
										color={COLORS.brandPrimary} 
									/>
								</View>
								<View style={styles.heroText}>
									<Text style={[styles.heroTitle, { color: colors.text }]}>
										Appointment Services
									</Text>
									<Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
										Smart scheduling for your healthcare journey
									</Text>
								</View>
							</View>
							<View style={styles.heroMeta}>
								<View style={[styles.metaPill, { backgroundColor: `${COLORS.brandPrimary}15` }]}>
									<Ionicons name="time" size={12} color={COLORS.brandPrimary} />
									<Text style={[styles.metaText, { color: COLORS.brandPrimary }]}>Smart</Text>
								</View>
							</View>
						</View>

						{/* Nested Widget - Provider Information */}
						<View style={[styles.providerWidget, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]}>
							<View style={styles.providerSquircle}>
								<Ionicons 
									name="notifications-outline" 
									size={18} 
									color={COLORS.brandPrimary} 
								/>
							</View>
							<View style={styles.providerWidgetInfo}>
								<Text style={[styles.providerWidgetName, { color: colors.text }]}>
									Reminder Assistant
								</Text>
								<Text style={[styles.providerWidgetRole, { color: colors.textMuted }]}>
									{preferences?.appointmentReminders ? "Active Service" : "Standby Mode"}
								</Text>
							</View>
							<View style={styles.providerWidgetBadge}>
								<Text style={[styles.badgeText, { color: COLORS.brandPrimary }]}>
									{preferences?.appointmentReminders ? "ON" : "OFF"}
								</Text>
							</View>
						</View>

						{/* Meta Stats Pills */}
						<View style={styles.metaPillsContainer}>
							<View style={[styles.metaPill, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
								<Ionicons name="location" size={12} color={COLORS.brandPrimary} />
								<Text style={[styles.metaText, { color: colors.text }]}>Location-aware</Text>
							</View>
							<View style={[styles.metaPill, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
								<Ionicons name="alarm" size={12} color={COLORS.brandPrimary} />
								<Text style={[styles.metaText, { color: colors.text }]}>24hr advance</Text>
							</View>
							<View style={[styles.metaPill, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
								<Ionicons name="checkmark-circle" size={12} color={COLORS.brandPrimary} />
								<Text style={[styles.metaText, { color: colors.text }]}>Auto-sync</Text>
							</View>
						</View>

						{/* Service Description */}
						<Text style={[styles.serviceDescription, { color: colors.textMuted }]}>
							Receive intelligent appointment reminders based on your location, traffic conditions, and healthcare provider schedules. Never miss an important visit with our AI-powered scheduling assistant.
						</Text>

						{/* Action Container */}
						<View style={styles.actionContainer}>
							<View style={styles.toggleContainer}>
								<View
									style={{
										width: 52,
										height: 30,
										borderRadius: 15,
										backgroundColor: preferences?.appointmentReminders ? COLORS.brandPrimary : "#D1D5DB",
										justifyContent: "center",
									}}
								>
									<View
										style={{
											width: 24,
											height: 24,
											borderRadius: 12,
											backgroundColor: "#FFFFFF",
											position: "absolute",
											left: preferences?.appointmentReminders ? 25 : 3,
											shadowColor: "#000",
											shadowOffset: { width: 0, height: 2 },
											shadowOpacity: 0.15,
											shadowRadius: 3,
											elevation: 3,
										}}
									/>
								</View>
							</View>
							<Text style={[styles.actionText, { color: colors.textMuted }]}>
								{preferences?.appointmentReminders ? "Service Active" : "Enable Smart Reminders"}
							</Text>
						</View>
					</Pressable>

					{/* Premium Medical Vault Card - Emergency Services */}
					<Pressable
						onPress={() => togglePreference("emergencyUpdates")}
						disabled={!preferences || !preferences.notificationsEnabled}
						style={({ pressed }) => [
							styles.serviceCard,
							{ 
								backgroundColor: colors.card,
								transform: [{ scale: pressed ? 0.98 : 1 }],
								opacity: !preferences || !preferences.notificationsEnabled ? 0.5 : 1,
							}
						]}
					>
						{/* Hero Section - Critical Service Banner */}
						<View style={styles.heroSection}>
							<View style={styles.heroContent}>
								<View style={[styles.heroIconContainer, { backgroundColor: `${COLORS.brandPrimary}25` }]}>
									<Ionicons 
										name="medical" 
										size={24} 
										color={COLORS.brandPrimary} 
									/>
								</View>
								<View style={styles.heroText}>
									<Text style={[styles.heroTitle, { color: colors.text }]}>
										Emergency Services
									</Text>
									<Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
										Critical care when you need it most
									</Text>
								</View>
							</View>
							<View style={styles.heroMeta}>
								<View style={[styles.metaPill, { backgroundColor: `${COLORS.brandPrimary}25` }]}>
									<Ionicons name="warning" size={12} color={COLORS.brandPrimary} />
									<Text style={[styles.metaText, { color: COLORS.brandPrimary }]}>Critical</Text>
								</View>
							</View>
						</View>

						{/* Nested Widget - Emergency Response Team */}
						<View style={[styles.providerWidget, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]}>
							<View style={[styles.providerSquircle, { backgroundColor: `${COLORS.brandPrimary}25` }]}>
								<Ionicons 
									name="shield-checkmark" 
									size={18} 
									color={COLORS.brandPrimary} 
								/>
							</View>
							<View style={styles.providerWidgetInfo}>
								<Text style={[styles.providerWidgetName, { color: colors.text }]}>
									SOS Response Team
								</Text>
								<Text style={[styles.providerWidgetRole, { color: colors.textMuted }]}>
									{preferences?.emergencyUpdates ? "Ready to Respond" : "Standby Mode"}
								</Text>
							</View>
							<View style={[styles.providerWidgetBadge, { backgroundColor: preferences?.emergencyUpdates ? `${COLORS.brandPrimary}25` : `${COLORS.brandPrimary}10` }]}>
								<Text style={[styles.badgeText, { color: COLORS.brandPrimary }]}>
									{preferences?.emergencyUpdates ? "LIVE" : "OFF"}
								</Text>
							</View>
						</View>

						{/* Meta Stats Pills */}
						<View style={styles.metaPillsContainer}>
							<View style={[styles.metaPill, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
								<Ionicons name="pulse" size={12} color={COLORS.brandPrimary} />
								<Text style={[styles.metaText, { color: colors.text }]}>Real-time monitoring</Text>
							</View>
							<View style={[styles.metaPill, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
								<Ionicons name="navigate" size={12} color={COLORS.brandPrimary} />
								<Text style={[styles.metaText, { color: colors.text }]}>GPS tracking</Text>
							</View>
							<View style={[styles.metaPill, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
								<Ionicons name="people" size={12} color={COLORS.brandPrimary} />
								<Text style={[styles.metaText, { color: colors.text }]}>Contact alerts</Text>
							</View>
						</View>

						{/* Service Description */}
						<Text style={[styles.serviceDescription, { color: colors.textMuted }]}>
							Instant emergency notifications with real-time location sharing and automatic contact alerts. Our emergency response team coordinates with nearby healthcare providers for rapid assistance when seconds matter.
						</Text>

						{/* Action Container */}
						<View style={styles.actionContainer}>
							<View style={styles.toggleContainer}>
								<View
									style={{
										width: 52,
										height: 30,
										borderRadius: 15,
										backgroundColor: preferences?.emergencyUpdates ? COLORS.brandPrimary : "#D1D5DB",
										justifyContent: "center",
									}}
								>
									<View
										style={{
											width: 24,
											height: 24,
											borderRadius: 12,
											backgroundColor: "#FFFFFF",
											position: "absolute",
											left: preferences?.emergencyUpdates ? 25 : 3,
											shadowColor: "#000",
											shadowOffset: { width: 0, height: 2 },
											shadowOpacity: 0.15,
											shadowRadius: 3,
											elevation: 3,
										}}
									/>
								</View>
							</View>
							<Text style={[styles.actionText, { color: colors.textMuted }]}>
								{preferences?.emergencyUpdates ? "Emergency Active" : "Enable SOS Protection"}
							</Text>
						</View>
					</Pressable>

					<Pressable
						onPress={() => togglePreference("notificationSoundsEnabled")}
						disabled={!preferences}
						style={({ pressed }) => [
							styles.settingCard,
							{ 
								backgroundColor: colors.card,
								transform: [{ scale: pressed ? 0.98 : 1 }],
								opacity: !preferences || !preferences.notificationsEnabled ? 0.5 : 1,
							}
						]}
					>
						{/* Identity Widget - Following manifesto spec */}
						<View style={styles.identityWidget}>
							<View style={styles.iconContainer}>
								<Ionicons 
									name="volume-high" 
									size={22} 
									color={COLORS.brandPrimary} 
								/>
							</View>
							<View style={styles.identityInfo}>
								<Text style={[styles.settingName, { color: colors.text }]}>
									Notification Sounds
								</Text>
								<Text style={[styles.identityLabel, { color: colors.textMuted }]}>
									Play sound for alerts
								</Text>
							</View>
						</View>

						{/* Corner Seal - Following manifesto spec */}
						<View style={[
							styles.cornerSeal,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.025)"
									: "rgba(0,0,0,0.025)"
							}
						]}>
							<View
								style={{
									width: 52,
									height: 30,
									borderRadius: 15,
									backgroundColor: preferences?.notificationSoundsEnabled ? COLORS.brandPrimary : "#D1D5DB",
									justifyContent: "center",
								}}
							>
								<View
									style={{
										width: 24,
										height: 24,
										borderRadius: 12,
										backgroundColor: "#FFFFFF",
										position: "absolute",
										left: preferences?.notificationSoundsEnabled ? 25 : 3,
										shadowColor: "#000",
										shadowOffset: { width: 0, height: 2 },
										shadowOpacity: 0.15,
										shadowRadius: 3,
										elevation: 3,
									}}
								/>
							</View>
						</View>
					</Pressable>
				</Animated.View>

				{/* PRIVACY Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 24,
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
						PRIVACY
					</Text>
					<Pressable
						onPress={() => togglePreference("privacyShareMedicalProfile")}
						disabled={!preferences}
						style={({ pressed }) => [
							styles.settingCard,
							{ 
								backgroundColor: colors.card,
								transform: [{ scale: pressed ? 0.98 : 1 }]
							}
						]}
					>
						{/* Identity Widget - Following manifesto spec */}
						<View style={styles.identityWidget}>
							<View style={styles.iconContainer}>
								<Ionicons 
									name="document-text" 
									size={22} 
									color={COLORS.brandPrimary} 
								/>
							</View>
							<View style={styles.identityInfo}>
								<Text style={[styles.settingName, { color: colors.text }]}>
									Share Medical Profile
								</Text>
								<Text style={[styles.identityLabel, { color: colors.textMuted }]}>
									In SOS requests only
								</Text>
							</View>
						</View>

						{/* Corner Seal - Following manifesto spec */}
						<View style={[
							styles.cornerSeal,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.025)"
									: "rgba(0,0,0,0.025)"
							}
						]}>
							<View
								style={{
									width: 52,
									height: 30,
									borderRadius: 15,
									backgroundColor: preferences?.privacyShareMedicalProfile ? COLORS.brandPrimary : "#D1D5DB",
									justifyContent: "center",
								}}
							>
								<View
									style={{
										width: 24,
										height: 24,
										borderRadius: 12,
										backgroundColor: "#FFFFFF",
										position: "absolute",
										left: preferences?.privacyShareMedicalProfile ? 25 : 3,
										shadowColor: "#000",
										shadowOffset: { width: 0, height: 2 },
										shadowOpacity: 0.15,
										shadowRadius: 3,
										elevation: 3,
									}}
								/>
							</View>
						</View>
					</Pressable>

					<Pressable
						onPress={() => togglePreference("privacyShareEmergencyContacts")}
						disabled={!preferences}
						style={({ pressed }) => [
							styles.settingCard,
							{ 
								backgroundColor: colors.card,
								transform: [{ scale: pressed ? 0.98 : 1 }]
							}
						]}
					>
						{/* Identity Widget - Following manifesto spec */}
						<View style={styles.identityWidget}>
							<View style={styles.iconContainer}>
								<Ionicons 
									name="people" 
									size={22} 
									color={COLORS.brandPrimary} 
								/>
							</View>
							<View style={styles.identityInfo}>
								<Text style={[styles.settingName, { color: colors.text }]}>
									Share Emergency Contacts
								</Text>
								<Text style={[styles.identityLabel, { color: colors.textMuted }]}>
									In SOS requests only
								</Text>
							</View>
						</View>

						{/* Corner Seal - Following manifesto spec */}
						<View style={[
							styles.cornerSeal,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.025)"
									: "rgba(0,0,0,0.025)"
							}
						]}>
							<View
								style={{
									width: 52,
									height: 30,
									borderRadius: 15,
									backgroundColor: preferences?.privacyShareEmergencyContacts ? COLORS.brandPrimary : "#D1D5DB",
									justifyContent: "center",
								}}
							>
								<View
									style={{
										width: 24,
										height: 24,
										borderRadius: 12,
										backgroundColor: "#FFFFFF",
										position: "absolute",
										left: preferences?.privacyShareEmergencyContacts ? 25 : 3,
										shadowColor: "#000",
										shadowOffset: { width: 0, height: 2 },
										shadowOpacity: 0.15,
										shadowRadius: 3,
										elevation: 3,
									}}
								/>
							</View>
						</View>
					</Pressable>
				</Animated.View>

				{/* ACCOUNT SECURITY Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
						marginBottom: 24,
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
						ACCOUNT SECURITY
					</Text>
					<Pressable
						onPress={() => router.push(passwordRoute)}
						style={({ pressed }) => [
							styles.settingCard,
							{ 
								backgroundColor: colors.card,
								transform: [{ scale: pressed ? 0.98 : 1 }]
							}
						]}
					>
						{/* Identity Widget - Following manifesto spec */}
						<View style={styles.identityWidget}>
							<View style={styles.iconContainer}>
								<Ionicons 
									name="lock-closed" 
									size={22} 
									color={COLORS.brandPrimary} 
								/>
							</View>
							<View style={styles.identityInfo}>
								<Text style={[styles.settingName, { color: colors.text }]}>
									{user?.hasPassword ? "Change Password" : "Create Password"}
								</Text>
								<Text style={[styles.identityLabel, { color: colors.textMuted }]}>
									{user?.hasPassword ? "Update your password" : "Secure your account"}
								</Text>
							</View>
						</View>

						{/* Corner Seal - Following manifesto spec */}
						<View style={[
							styles.cornerSeal,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.025)"
									: "rgba(0,0,0,0.025)"
							}
						]}>
							<Ionicons
								name="chevron-forward"
								size={16}
								color={colors.textMuted}
							/>
						</View>
					</Pressable>
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	
	// Service Provider Styles (Uber/Build-like)
	providerHeader: {
		marginBottom: 20,
	},
	providerTitle: {
		fontSize: 28,
		fontWeight: "900",
		letterSpacing: -1.0,
		marginBottom: 8,
	},
	providerSubtitle: {
		fontSize: 16,
		fontWeight: "500",
		lineHeight: 22,
	},
	
	serviceCard: {
		borderRadius: 36,
		padding: 20,
		marginBottom: 16,
		position: "relative",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	
	serviceHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	
	providerInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	
	providerAvatar: {
		width: 48,
		height: 48,
		borderRadius: 16,
		backgroundColor: `${COLORS.brandPrimary}15`,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	
	providerDetails: {
		flex: 1,
	},
	
	providerName: {
		fontSize: 18,
		fontWeight: "900",
		letterSpacing: -0.5,
		marginBottom: 2,
	},
	
	providerStatus: {
		fontSize: 13,
		fontWeight: "600",
	},
	
	serviceMeta: {
		alignItems: "flex-end",
	},
	
	metaPill: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		gap: 4,
	},
	
	metaText: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	
	serviceDescription: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
		marginBottom: 20,
	},
	
	serviceStats: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 20,
	},
	
	statItem: {
		alignItems: "center",
		flex: 1,
	},
	
	statValue: {
		fontSize: 16,
		fontWeight: "900",
		letterSpacing: -0.5,
		marginBottom: 4,
	},
	
	statLabel: {
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.5,
		textTransform: "uppercase",
	},
	
	serviceFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: "rgba(0,0,0,0.05)",
	},
	
	toggleContainer: {
		alignItems: "center",
	},
	
	actionText: {
		fontSize: 13,
		fontWeight: "600",
		letterSpacing: 0.5,
	},
	
	// Premium Medical Vault Styles
	heroSection: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	
	heroContent: {
		flexDirection: "row",
		alignItems: "flex-start",
		flex: 1,
	},
	
	heroIconContainer: {
		width: 52,
		height: 52,
		borderRadius: 16,
		backgroundColor: `${COLORS.brandPrimary}15`,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	
	heroText: {
		flex: 1,
	},
	
	heroTitle: {
		fontSize: 20,
		fontWeight: "900",
		letterSpacing: -0.8,
		marginBottom: 4,
	},
	
	heroSubtitle: {
		fontSize: 13,
		fontWeight: "500",
		lineHeight: 18,
	},
	
	heroMeta: {
		alignItems: "flex-start",
	},
	
	// Nested Widget Design (like VisitCard doctor widget)
	providerWidget: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
		borderRadius: 20,
		marginBottom: 16,
	},
	
	providerSquircle: {
		width: 44,
		height: 44,
		borderRadius: 14,
		backgroundColor: `${COLORS.brandPrimary}15`,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	
	providerWidgetInfo: {
		flex: 1,
	},
	
	providerWidgetName: {
		fontSize: 16,
		fontWeight: "800",
		letterSpacing: -0.5,
		marginBottom: 2,
	},
	
	providerWidgetRole: {
		fontSize: 12,
		fontWeight: "600",
	},
	
	providerWidgetBadge: {
		backgroundColor: `${COLORS.brandPrimary}15`,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	
	badgeText: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 0.5,
		textTransform: "uppercase",
	},
	
	// Meta Pills Container
	metaPillsContainer: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 16,
		flexWrap: "wrap",
	},
	
	// Legacy styles for other cards
	settingCard: {
		borderRadius: 36,
		padding: 24,
		marginBottom: 12,
		position: "relative",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	identityWidget: {
		flexDirection: "row",
		alignItems: "center",
	},
	iconContainer: {
		width: 56,
		height: 56,
		borderRadius: 14,
		backgroundColor: `${COLORS.brandPrimary}15`,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
	},
	identityInfo: {
		flex: 1,
	},
	settingName: { 
		fontSize: 19, 
		fontWeight: "900", 
		letterSpacing: -1.0 
	},
	identityLabel: { 
		fontSize: 10, 
		fontWeight: "800", 
		letterSpacing: 1.5,
		textTransform: "uppercase",
		marginTop: 4,
	},
	cornerSeal: {
		position: "absolute",
		bottom: -4,
		right: -4,
		width: 36,
		height: 36,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
});
