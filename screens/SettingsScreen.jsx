"use client";

import { useCallback, useMemo } from "react";
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
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useAuth } from "../contexts/AuthContext";

export default function SettingsScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { user } = useAuth();

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

	const colors = {
		background: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
		text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
		textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
		card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
	};

	const passwordRoute = useMemo(() => {
		return user?.hasPassword ? "/(user)/(stacks)/change-password" : "/(user)/(stacks)/create-password";
	}, [user?.hasPassword]);

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView
				contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
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
		</View>
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
