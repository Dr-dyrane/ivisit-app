"use client";

import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Animated,
	Pressable,
	ActivityIndicator,
	Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { useEmergency, EmergencyMode } from "../contexts/EmergencyContext";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	getNotificationIcon,
	getPriorityColor,
	getRelativeTime,
} from "../constants/notifications";
import * as Haptics from "expo-haptics";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import {
	navigateToMore,
	navigateToSOS,
	navigateToVisitDetails,
	navigateToVisits,
	navigateToHelpSupport,
} from "../utils/navigationHelpers";

const NotificationDetailsScreen = () => {
	const router = useRouter();
	const { id } = useLocalSearchParams();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setMode } = useEmergency();

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	const { notifications, markAsRead } = useNotifications();
	const notification = notifications.find(n => n.id === id);

	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();

	const handleActionPress = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		const actionType = notification?.actionType ?? null;
		const actionData = notification?.actionData ?? {};
		const visitId =
			typeof actionData?.visitId === "string"
				? actionData.visitId
				: typeof actionData?.appointmentId === "string"
					? actionData.appointmentId
					: null;

		if (actionType === "track") {
			navigateToSOS({
				router,
				setEmergencyMode: setMode,
				mode: EmergencyMode.EMERGENCY,
			});
			return;
		}

		if (actionType === "view_appointment" || actionType === "view_visit" || actionType === "view_summary") {
			if (visitId) {
				navigateToVisitDetails({ router, visitId });
				return;
			}
			navigateToVisits({ router });
			return;
		}

		if (actionType === "upgrade") {
			navigateToMore({ router });
			return;
		}

		if (actionType === "view_ticket") {
			navigateToHelpSupport({ router, ticketId: actionData?.ticketId });
			return;
		}

		if (actionType === "view_insurance") {
			navigateToMore({ router, screen: 'insurance' });
			return;
		}
	}, [notification, router, setMode]);

	const backButton = useCallback(() => <HeaderBackButton />, []);

	// Mark as read and Set Header
	useFocusEffect(
		useCallback(() => {
			if (notification && !notification.read) markAsRead(notification.id);
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Mission Briefing",
				subtitle: notification?.type?.toUpperCase() || "ALERT",
				icon: <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [notification, markAsRead, setHeaderState, backButton])
	);

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
			Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 40, useNativeDriver: true }),
		]).start();
	}, []);

	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
	const widgetBg = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
	const priorityColor = notification ? getPriorityColor(notification.priority) : COLORS.brandPrimary;

	if (!notification) return null; // Handle loading/error as before

	return (
		<LinearGradient
			colors={isDarkMode ? [COLORS.bgDark, COLORS.bgDarkAlt] : [COLORS.bgLight, COLORS.bgLightAlt]}
			style={{ flex: 1 }}
		>
			<Animated.ScrollView
				style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
				contentContainerStyle={[styles.content, { paddingTop: STACK_TOP_PADDING, paddingBottom: 120 }]}
				showsVerticalScrollIndicator={false}
				onScroll={useCallback((e) => {
					handleTabBarScroll(e);
					handleHeaderScroll(e);
				}, [])}
				scrollEventThrottle={16}
			>
				{/* 1. EDITORIAL HEADER SECTION */}
				<View style={styles.heroSection}>
					<View style={styles.titleSection}>
						<Text style={[styles.editorialSubtitle, { color: priorityColor }]}>
							{notification.priority.toUpperCase()} PRIORITY
						</Text>
						<Text style={[styles.mainTitle, { color: textColor }]}>
							{notification.title}
						</Text>
					</View>

					{/* URGENGY SEAL: Nested Squircle Icon */}
					<View style={[styles.urgencySeal, { backgroundColor: priorityColor + '15', shadowColor: priorityColor }]}>
						<Ionicons name={getNotificationIcon(notification.type)} size={32} color={priorityColor} />
					</View>
				</View>

				{/* 2. MESSAGE BODY: The Briefing Widget */}
				<View style={[styles.briefingWidget, { backgroundColor: widgetBg }]}>
					<Text style={[styles.messageText, { color: textColor }]}>
						{notification.message}
					</Text>
				</View>

				{/* 3. IDENTITY GRID: Metadata Widgets */}
				<View style={styles.gridContainer}>
					<View style={[styles.dataSquare, { backgroundColor: widgetBg }]}>
						<Ionicons name="time" size={20} color={COLORS.brandPrimary} />
						<Text style={[styles.gridLabel, { color: mutedColor }]}>RECEIVED</Text>
						<Text style={[styles.gridValue, { color: textColor }]}>
							{getRelativeTime(notification.timestamp)}
						</Text>
					</View>
					<View style={[styles.dataSquare, { backgroundColor: widgetBg }]}>
						<Ionicons name="layers" size={20} color={COLORS.brandPrimary} />
						<Text style={[styles.gridLabel, { color: mutedColor }]}>CATEGORY</Text>
						<Text style={[styles.gridValue, { color: textColor }]}>
							{notification.type.toUpperCase()}
						</Text>
					</View>
				</View>

				{/* 4. TIMESTAMP FOOTER */}
				<View style={[styles.timestampRow, { borderTopColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
					<Text style={[styles.fullDate, { color: mutedColor }]}>
						RECORD LOGGED: {new Date(notification.timestamp).toLocaleString().toUpperCase()}
					</Text>
				</View>

				{/* 5. ACTIONS: Premium Pill Section */}
				{notification.actionType && (
					<Pressable
						onPress={handleActionPress}
						style={({ pressed }) => [
							styles.primaryAction,
							{ backgroundColor: COLORS.brandPrimary, opacity: pressed ? 0.9 : 1 }
						]}
					>
						<Text style={styles.actionText}>RESOLVE ACTION</Text>
						<Ionicons name="arrow-forward" size={20} color="#FFF" />
					</Pressable>
				)}

				{!notification.actionType && (
					<View style={[styles.infoBanner, { backgroundColor: widgetBg }]}>
						<Ionicons name="information-circle" size={18} color={mutedColor} />
						<Text style={[styles.infoBannerText, { color: mutedColor }]}>
							This is a permanent medical record for your information.
						</Text>
					</View>
				)}
			</Animated.ScrollView>
		</LinearGradient>
	);
};

const styles = StyleSheet.create({
	content: { paddingHorizontal: 24 },
	heroSection: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 32,
		marginTop: 8,
	},
	titleSection: { flex: 1, paddingRight: 20 },
	editorialSubtitle: {
		fontSize: 11,
		fontWeight: '900',
		letterSpacing: 2,
		marginBottom: 8,
	},
	mainTitle: {
		fontSize: 30,
		fontWeight: '900',
		letterSpacing: -1.2,
		lineHeight: 36,
	},
	urgencySeal: {
		width: 72,
		height: 72,
		borderRadius: 24, // Nested Squircle logic
		alignItems: 'center',
		justifyContent: 'center',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 5,
	},
	briefingWidget: {
		padding: 28,
		borderRadius: 36,
		marginBottom: 16,
	},
	messageText: {
		fontSize: 17,
		fontWeight: '500',
		lineHeight: 26,
		letterSpacing: -0.2,
	},
	gridContainer: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 24,
	},
	dataSquare: {
		flex: 1,
		padding: 20,
		borderRadius: 32,
	},
	gridLabel: {
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 1.5,
		marginTop: 12,
		marginBottom: 4,
	},
	gridValue: {
		fontSize: 15,
		fontWeight: '900',
		letterSpacing: -0.3,
	},
	timestampRow: {
		paddingTop: 16,
		borderTopWidth: 1,
		marginBottom: 32,
	},
	fullDate: {
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 1,
		textAlign: 'center',
	},
	primaryAction: {
		height: 64,
		borderRadius: 22,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.2,
		shadowRadius: 15,
		shadowOffset: { width: 0, height: 10 },
	},
	actionText: {
		color: '#FFF',
		fontSize: 16,
		fontWeight: '900',
		letterSpacing: 1,
	},
	infoBanner: {
		padding: 16,
		borderRadius: 20,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		justifyContent: 'center',
	},
	infoBannerText: {
		fontSize: 12,
		fontWeight: '600',
	}
});

export default NotificationDetailsScreen;