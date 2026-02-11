"use client";

import { useCallback } from "react";
import {
	View,
	Text,
	Animated,
	ActivityIndicator,
	RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useNotificationsScreenLogic } from "../hooks/notifications/useNotificationsScreenLogic";
import { COLORS } from "../constants/colors";
import NotificationCard from "../components/notifications/NotificationCard";
import NotificationFilters from "../components/notifications/NotificationFilters";
import NotificationsHeaderRight from "../components/notifications/NotificationsHeaderRight";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { styles } from "../components/notifications/NotificationsScreen.styles";

const NotificationsScreen = () => {
	const { state, actions } = useNotificationsScreenLogic();
	const {
		filteredNotifications,
		filter,
		filters,
		filterCounts,
		unreadCount,
		isLoading,
		isSelectMode,
		selectedNotifications,
		colors,
		backgroundColors,
		hasNotifications,
		fadeAnim,
		fadeAnimNew,
		slideAnimNew,
		topPadding,
		bottomPadding,
		filterParam,
		isDarkMode,
	} = state;

	const {
		setFilterType,
		markAsRead,
		markAllAsRead,
		deleteNotification,
		refreshNotifications,
		toggleSelectMode,
		toggleNotificationSelection,
		selectAllNotifications,
		clearSelection,
		markSelectedAsRead,
		deleteSelectedNotifications,
		handleScroll,
		handleNotificationPress,
		resetTabBar,
		resetHeader,
		setHeaderState,
	} = actions;

	const backButton = useCallback(() => <HeaderBackButton />, []);

	const rightComponent = useCallback(
		() => (
			<NotificationsHeaderRight
				isSelectMode={isSelectMode}
				unreadCount={unreadCount}
				selectedCount={selectedNotifications.size}
				totalCount={filteredNotifications.length}
				isDarkMode={isDarkMode}
				onToggleSelectMode={toggleSelectMode}
				onSelectAll={selectAllNotifications}
				onClearSelection={clearSelection}
				onMarkSelectedRead={markSelectedAsRead}
				onDeleteSelected={deleteSelectedNotifications}
				onMarkAllRead={markAllAsRead}
			/>
		),
		[
			isSelectMode,
			unreadCount,
			selectedNotifications.size,
			filteredNotifications.length,
			isDarkMode,
			toggleSelectMode,
			selectAllNotifications,
			clearSelection,
			markSelectedAsRead,
			deleteSelectedNotifications,
			markAllAsRead,
		]
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
				subtitle: isSelectMode 
					? `${selectedNotifications.size} SELECTED` 
					: unreadCount > 0 
						? `${unreadCount} UNREAD` 
						: "ALL CAUGHT UP",
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
			isSelectMode,
			selectedNotifications,
			resetTabBar,
			resetHeader,
			filterParam,
			setFilterType,
		])
	);

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<Animated.ScrollView
				style={[
					styles.scrollView,
					{
						opacity: fadeAnimNew,
						transform: [{ translateY: slideAnimNew }],
					},
				]}
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
						{/* Group notifications by date sections */}
						{filteredNotifications.map((notification, index) => {
							const showDateHeader = index === 0 || 
								new Date(notification.timestamp).toDateString() !== 
								new Date(filteredNotifications[index - 1].timestamp).toDateString();
								
							return (
								<View key={notification.id}>
									{showDateHeader && (
										<Text style={{
											fontSize: 10,
											fontWeight: '800',
											color: colors.textMuted,
											letterSpacing: 1.5,
											textTransform: 'uppercase',
											marginTop: index === 0 ? 0 : 24,
											marginBottom: 12,
											marginLeft: 8
										}}>
											{new Date(notification.timestamp).toLocaleDateString(undefined, {
												weekday: 'long',
												month: 'short',
												day: 'numeric'
											})}
										</Text>
									)}
									<NotificationCard
										notification={notification}
										onPress={handleNotificationPress}
										onMarkRead={markAsRead}
										onDelete={deleteNotification}
										isSelectMode={isSelectMode}
										isSelected={selectedNotifications.has(notification.id)}
										onToggleSelection={toggleNotificationSelection}
									/>
								</View>
							);
						})}
					</Animated.View>
				) : (
					<View style={[styles.emptyState, { backgroundColor: colors.card }]}>
						<View style={{
							width: 120,
							height: 120,
							borderRadius: 40,
							backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
							alignItems: 'center',
							justifyContent: 'center',
							marginBottom: 24
						}}>
							<Ionicons 
								name="notifications-off-outline" 
								size={48} 
								color={isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} 
							/>
						</View>
						<Text style={[styles.emptyTitle, { color: colors.text }]}>
							No notifications
						</Text>
						<Text style={[styles.emptyText, { color: colors.textMuted }]}>
							You're all caught up! Check back later for updates.
						</Text>
					</View>
				)}
			</Animated.ScrollView>
		</LinearGradient>
	);
};

export default NotificationsScreen;
