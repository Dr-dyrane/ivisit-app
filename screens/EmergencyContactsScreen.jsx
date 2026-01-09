"use client";

import { useCallback } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import HeaderBackButton from "../components/navigation/HeaderBackButton";

export default function EmergencyContactsScreen() {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();

	const backButton = useCallback(() => <HeaderBackButton />, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Emergency Contacts",
				subtitle: "SAFETY",
				icon: <Ionicons name="people" size={26} color="#FFFFFF" />,
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
						People we can reach fast
					</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						Add family members, caregivers, and key contacts. This will power quick
						share + emergency workflows later.
					</Text>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flexGrow: 1, padding: 20 },
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
});

