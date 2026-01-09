// components/headers/NotificationIconButton.jsx
// Reusable notification icon button with badge, ping animation, and haptic feedback

import { useRef, useEffect } from "react";
import { View, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { COLORS } from "../../constants/colors";
import { ROUTES, navigateToNotifications } from "../../utils/navigationHelpers";

/**
 * NotificationIconButton - A modular notification icon with badge and haptic feedback
 * 
 * Features:
 * - Automatic badge display based on unread count
 * - Ping animation for unread notifications
 * - Haptic feedback on press (Medium impact)
 * - Theme-aware colors
 * - Navigates to notifications screen on press
 */
export default function NotificationIconButton() {
	const router = useRouter();
	const pathname = usePathname();
	const { isDarkMode } = useTheme();
	const { unreadCount } = useNotifications();
	const pingAnim = useRef(new Animated.Value(1)).current;

	// Ping animation for unread notifications
	useEffect(() => {
		if (unreadCount > 0) {
			const animation = Animated.loop(
				Animated.sequence([
					Animated.timing(pingAnim, {
						toValue: 2,
						duration: 800,
						useNativeDriver: true,
					}),
					Animated.timing(pingAnim, {
						toValue: 1,
						duration: 800,
						useNativeDriver: true,
					}),
				])
			);
			animation.start();
			return () => animation.stop();
		}
	}, [unreadCount, pingAnim]);

	const handlePress = () => {
		// Add haptic feedback (matching profile avatar behavior)
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		if (typeof pathname === "string" && pathname.startsWith(ROUTES.STACK_NOTIFICATIONS)) return;
		navigateToNotifications({ router });
	};

	// Theme-aware colors
	const iconColor = unreadCount > 0 
		? COLORS.brandPrimary 
		: isDarkMode 
			? COLORS.textMutedDark 
			: COLORS.textMuted;

	const badgeBorderColor = isDarkMode ? "#0B0F1A" : "#FFFFFF";

	return (
		<TouchableOpacity
			onPress={handlePress}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
		>
			<View style={{ position: "relative" }}>
				<Ionicons
					name="notifications-outline"
					size={24}
					color={iconColor}
				/>
				{unreadCount > 0 && (
					<View style={{ position: "absolute", top: -2, right: -2 }}>
						{/* Ping animation layer */}
						<Animated.View
							style={{
								position: "absolute",
								width: 10,
								height: 10,
								borderRadius: 999,
								backgroundColor: `${COLORS.brandPrimary}50`,
								transform: [{ scale: pingAnim }],
								opacity: pingAnim.interpolate({
									inputRange: [1, 2],
									outputRange: [1, 0],
								}),
							}}
						/>
						{/* Badge dot */}
						<View
							style={{
								width: 10,
								height: 10,
								borderRadius: 999,
								backgroundColor: COLORS.brandPrimary,
								borderWidth: 2,
								borderColor: badgeBorderColor,
							}}
						/>
					</View>
				)}
			</View>
		</TouchableOpacity>
	);
}
