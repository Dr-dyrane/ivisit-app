"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Animated,
	Pressable,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { 
	getNotificationIcon, 
	getPriorityColor, 
	getRelativeTime,
	NOTIFICATION_PRIORITY,
} from "../constants/notifications";
import * as Haptics from "expo-haptics";
import HeaderBackButton from "../components/navigation/HeaderBackButton";

const NotificationDetailsScreen = () => {
	const router = useRouter();
	const { id } = useLocalSearchParams();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	// Get notifications from context
	const { notifications, markAsRead } = useNotifications();

	// Find the specific notification by ID
	const notification = notifications.find(n => n.id === id);
	const isLoading = false; // Data is already loaded in context

	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();

	// Mark notification as read when viewed
	useFocusEffect(
		useCallback(() => {
			if (notification && !notification.read) {
				markAsRead(notification.id);
			}
		}, [notification, markAsRead])
	);

	const backButton = useCallback(() => <HeaderBackButton />, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Notification Details",
				subtitle: null,
				icon: <Ionicons name="notifications" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				badge: null,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [setHeaderState, backButton, resetTabBar, resetHeader])
	);

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
		[handleTabBarScroll, handleHeaderScroll]
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

	if (isLoading) {
		return (
			<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
				<View style={[
					styles.loadingContainer,
					{ paddingTop: topPadding }
				]}>
					<ActivityIndicator color={COLORS.brandPrimary} size="large" />
					<Text style={[styles.loadingText, { color: colors.text, marginTop: 16 }]}>
						Loading notification details...
					</Text>
				</View>
			</LinearGradient>
		);
	}

	if (!notification) {
		return (
			<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
				<View style={[
					styles.errorContainer,
					{ paddingTop: topPadding }
				]}>
					<Ionicons
						name="alert-circle-outline"
						size={64}
						color={COLORS.brandPrimary}
					/>
					<Text style={[styles.errorTitle, { color: colors.text, marginTop: 16 }]}>
						Notification Not Found
					</Text>
					<Text style={[styles.errorText, { color: colors.textMuted }]}>
						The notification you're looking for doesn't exist or has been deleted.
					</Text>
				</View>
			</LinearGradient>
		);
	}

	const icon = getNotificationIcon(notification.type);
	const priorityColor = getPriorityColor(notification.priority);
	const timeAgo = getRelativeTime(notification.timestamp);

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<Animated.ScrollView
				style={[
					styles.scrollView,
					{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					},
				]}
				contentContainerStyle={[
					styles.content,
					{ paddingTop: topPadding, paddingBottom: bottomPadding },
				]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
			>
				{/* Notification Card */}
				<View style={[styles.notificationCard, { backgroundColor: colors.card }]}>
					{/* Header with icon and priority */}
					<View style={styles.notificationHeader}>
						<View
							style={[
								styles.iconContainer,
								{ backgroundColor: `${priorityColor}15` }
							]}
						>
							<Ionicons name={icon} size={24} color={priorityColor} />
						</View>
						
						<View style={styles.headerContent}>
							<Text style={[styles.title, { color: colors.text }]}>
								{notification.title}
							</Text>
							<Text style={[styles.timestamp, { color: colors.textMuted }]}>
								{timeAgo}
							</Text>
						</View>

						{/* Priority badge */}
						<View
							style={[
								styles.priorityBadge,
								{ backgroundColor: `${priorityColor}15` }
							]}
						>
							<Text style={[styles.priorityText, { color: priorityColor }]}>
								{notification.priority.toUpperCase()}
							</Text>
						</View>
					</View>

					{/* Message content */}
					<Text style={[styles.message, { color: colors.text }]}>
						{notification.message}
					</Text>

					{/* Additional metadata */}
					<View style={styles.metadata}>
						<View style={styles.metadataItem}>
							<Ionicons 
								name="time-outline" 
								size={16} 
								color={colors.textMuted} 
							/>
							<Text style={[styles.metadataText, { color: colors.textMuted }]}>
								{new Date(notification.timestamp).toLocaleString()}
							</Text>
						</View>
						
						<View style={styles.metadataItem}>
							<Ionicons 
								name="notifications-outline" 
								size={16} 
								color={colors.textMuted} 
							/>
							<Text style={[styles.metadataText, { color: colors.textMuted }]}>
								{notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
							</Text>
						</View>
					</View>
				</View>

				{/* Actions section */}
				{notification.actionType && (
					<View style={[styles.actionsCard, { backgroundColor: colors.card }]}>
						<Text style={[styles.actionsTitle, { color: colors.text }]}>
							Available Actions
						</Text>
						<Text style={[styles.actionsDescription, { color: colors.textMuted }]}>
							This notification has associated actions that you can take.
						</Text>
						{/* Action buttons would go here */}
					</View>
				)}

				{/* No actions message */}
				{!notification.actionType && (
					<View style={[styles.infoCard, { backgroundColor: colors.card }]}>
						<Ionicons 
							name="information-circle-outline" 
							size={24} 
							color={COLORS.brandPrimary} 
						/>
						<Text style={[styles.infoText, { color: colors.textMuted }]}>
							This notification is for informational purposes only and doesn't require any action.
						</Text>
					</View>
				)}
			</Animated.ScrollView>
		</LinearGradient>
	);
};

const styles = StyleSheet.create({
	scrollView: { flex: 1 },
	content: { flexGrow: 1, padding: 20, gap: 16 },
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		fontSize: 16,
		fontWeight: "500",
		textAlign: "center",
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 40,
	},
	errorTitle: {
		fontSize: 20,
		fontWeight: "700",
		textAlign: "center",
		marginBottom: 8,
	},
	errorText: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
	notificationCard: {
		borderRadius: 20,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 3,
	},
	notificationHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	iconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	headerContent: {
		flex: 1,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 4,
	},
	timestamp: {
		fontSize: 13,
	},
	priorityBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	priorityText: {
		fontSize: 10,
		fontWeight: "600",
	},
	message: {
		fontSize: 16,
		lineHeight: 24,
		marginBottom: 20,
	},
	metadata: {
		gap: 8,
	},
	metadataItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	metadataText: {
		fontSize: 13,
	},
	actionsCard: {
		borderRadius: 16,
		padding: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 2,
	},
	actionsTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 4,
	},
	actionsDescription: {
		fontSize: 14,
		lineHeight: 20,
	},
	infoCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
		borderRadius: 16,
		padding: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 2,
	},
	infoText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
	},
});

export default NotificationDetailsScreen;
