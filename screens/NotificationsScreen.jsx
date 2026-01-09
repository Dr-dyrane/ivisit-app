"use client";

import { useRef, useCallback } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	RefreshControl,
	Animated,
	Pressable,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useEmergency, EmergencyMode } from "../contexts/EmergencyContext";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationCard from "../components/notifications/NotificationCard";
import NotificationFilters from "../components/notifications/NotificationFilters";
import * as Haptics from "expo-haptics";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import {
	navigateToMore,
	navigateToNotifications,
	navigateToSOS,
	navigateToVisitDetails,
	navigateToVisits,
} from "../utils/navigationHelpers";

const NotificationsScreen = () => {
	const router = useRouter();
	const { filter: filterParam } = useLocalSearchParams();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const fadeAnim = useRef(new Animated.Value(1)).current;
	const { setMode } = useEmergency();

	const {
		filteredNotifications,
		filter,
		filters,
		filterCounts,
		unreadCount,
		isLoading,
		setFilterType,
		markAsRead,
		markAllAsRead,
		deleteNotification,
		refreshNotifications,
	} = useNotifications();

	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();

	const backButton = useCallback(() => <HeaderBackButton />, []);

	const rightComponent = useCallback(
		() =>
			unreadCount > 0 ? (
				<Pressable
					onPress={() => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
						markAllAsRead();
					}}
					style={({ pressed }) => ({
						opacity: pressed ? 0.7 : 1,
					})}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				>
					<Ionicons
						name="checkmark-done"
						size={24}
						color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
					/>
				</Pressable>
			) : null,
		[unreadCount, markAllAsRead, isDarkMode]
	);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			const nextFilter =
				typeof filterParam === "string"
					? filterParam
					: Array.isArray(filterParam)
						? filterParam[0]
						: null;
			if (nextFilter && ["all", "unread", "emergency", "appointments"].includes(nextFilter)) {
				setFilterType(nextFilter);
			}
			setHeaderState({
				title: "Notifications",
				subtitle: unreadCount > 0 ? `${unreadCount} UNREAD` : "ALL CAUGHT UP",
				icon: <Ionicons name="notifications" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				badge: null,
				leftComponent: backButton(),
				rightComponent: rightComponent(),
			});
		}, [
			setHeaderState,
			backButton,
			rightComponent,
			unreadCount,
			resetTabBar,
			resetHeader,
			filterParam,
			setFilterType,
		])
	);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleTabBarScroll, handleHeaderScroll]
	);

	const handleNotificationPress = useCallback(
		(notification) => {
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

			if (actionType === "view_appointment") {
				if (visitId) {
					navigateToVisitDetails({ router, visitId });
					return;
				}
				navigateToVisits({ router, filter: "upcoming" });
				return;
			}

			if (actionType === "view_summary") {
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

			navigateToNotifications({ router });
		},
		[router, setMode]
	);

	const handleMarkAllRead = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		markAllAsRead();
	}, [markAllAsRead]);

	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	const hasNotifications = filteredNotifications.length > 0;

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.content,
					{ paddingTop: topPadding, paddingBottom: bottomPadding },
				]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
				refreshControl={
					<RefreshControl
						refreshing={isLoading}
						onRefresh={refreshNotifications}
						tintColor={COLORS.brandPrimary}
						colors={[COLORS.brandPrimary]}
					/>
				}
			>
				{/* Filters */}
				<NotificationFilters
					filters={filters}
					selectedFilter={filter}
					onSelect={setFilterType}
					counts={filterCounts}
				/>

				{/* Notification Cards or Empty State */}
				{isLoading && !hasNotifications ? (
					<View
						style={[
							styles.emptyState,
							{ backgroundColor: colors.card, marginTop: 24 },
						]}
					>
						<ActivityIndicator color={COLORS.brandPrimary} />
						<Text style={[styles.emptyTitle, { color: colors.text, marginTop: 16 }]}>
							Loading notifications
						</Text>
						<Text style={[styles.emptyText, { color: colors.textMuted }]}>
							Getting your latest updates ready.
						</Text>
					</View>
				) : hasNotifications ? (
					<Animated.View style={{ opacity: fadeAnim }}>
						{filteredNotifications.map((notification) => (
							<NotificationCard
								key={notification.id}
								notification={notification}
								onPress={handleNotificationPress}
								onMarkRead={markAsRead}
								onDelete={deleteNotification}
							/>
						))}
					</Animated.View>
				) : (
					<View style={[styles.emptyState, { backgroundColor: colors.card }]}>
						<Ionicons
							name="notifications-off-outline"
							size={64}
							color={COLORS.brandPrimary}
						/>
						<Text style={[styles.emptyTitle, { color: colors.text }]}>
							No Notifications
						</Text>
						<Text style={[styles.emptyText, { color: colors.textMuted }]}>
							{filter === "unread"
								? "You're all caught up!"
								: "No notifications to display"}
						</Text>
					</View>
				)}
			</ScrollView>
		</LinearGradient>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	scrollView: { flex: 1 },
	content: { flexGrow: 1, padding: 20 },
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 40,
		borderRadius: 20,
		marginTop: 40,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginTop: 16,
		marginBottom: 8,
	},
	emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});

export default NotificationsScreen;
