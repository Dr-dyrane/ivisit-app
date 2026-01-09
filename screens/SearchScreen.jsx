"use client";

import { useCallback, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import EmergencySearchBar from "../components/emergency/EmergencySearchBar";
import { useSearch } from "../contexts/SearchContext";
import { useVisits } from "../contexts/VisitsContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { HOSPITALS } from "../data/hospitals";
import { useEmergencyUI } from "../contexts/EmergencyUIContext";

export default function SearchScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { isDarkMode } = useTheme();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
	const { updateSearch: setEmergencySearchQuery } = useEmergencyUI();
	const { query, setSearchQuery, recentQueries, commitQuery, clearHistory } = useSearch();
	const { visits } = useVisits();
	const { notifications } = useNotifications();

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleHeaderScroll, handleTabBarScroll]
	);

	const backButton = useCallback(() => <HeaderBackButton />, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Search",
				subtitle: "GLOBAL",
				icon: <Ionicons name="search" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: false,
			});
		}, [backButton, resetHeader, resetTabBar, setHeaderState])
	);

	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	const headerHeight = 70;
	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const topPadding = headerHeight + insets.top;
	const bottomPadding = tabBarHeight + 20;

	const q = useMemo(() => (typeof query === "string" ? query.trim().toLowerCase() : ""), [query]);

	const visitMatches = useMemo(() => {
		if (!q) return [];
		if (!Array.isArray(visits)) return [];
		return visits
			.filter((v) => {
				const hay = [
					v?.hospital,
					v?.doctor,
					v?.specialty,
					v?.type,
					v?.status,
					v?.date,
					v?.time,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();
				return hay.includes(q);
			})
			.slice(0, 8);
	}, [q, visits]);

	const hospitalMatches = useMemo(() => {
		if (!q) return [];
		const base = Array.isArray(HOSPITALS) ? HOSPITALS : [];
		return base
			.filter((h) => {
				const name = String(h?.name ?? "").toLowerCase();
				const address = String(h?.address ?? "").toLowerCase();
				const specialties = Array.isArray(h?.specialties) ? h.specialties.join(" ").toLowerCase() : "";
				return name.includes(q) || address.includes(q) || specialties.includes(q);
			})
			.slice(0, 8);
	}, [q]);

	const notificationMatches = useMemo(() => {
		if (!q) return [];
		if (!Array.isArray(notifications)) return [];
		return notifications
			.filter((n) => {
				const hay = [n?.title, n?.message, n?.type].filter(Boolean).join(" ").toLowerCase();
				return hay.includes(q);
			})
			.slice(0, 6);
	}, [notifications, q]);

	const openHospitalInSOS = useCallback(
		(hospitalName) => {
			const name = typeof hospitalName === "string" ? hospitalName : "";
			setEmergencySearchQuery(name);
			router.push("/(user)/(tabs)");
		},
		[router, setEmergencySearchQuery]
	);

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
				keyboardShouldPersistTaps="handled"
			>
				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<EmergencySearchBar
						value={query}
						onChangeText={setSearchQuery}
						onBlur={() => commitQuery(query)}
						onClear={() => setSearchQuery("")}
						placeholder="Search visits, hospitals, notifications..."
						showSuggestions={false}
					/>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
						Quick Actions
					</Text>
					<View style={styles.quickRow}>
						<Pressable
							onPress={() => router.push("/(user)/(tabs)")}
							style={({ pressed }) => [
								styles.quickButton,
								{
									backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
									opacity: pressed ? 0.9 : 1,
								},
							]}
						>
							<Ionicons name="medical" size={18} color={COLORS.brandPrimary} />
							<Text style={[styles.quickText, { color: colors.text }]}>SOS</Text>
						</Pressable>
						<Pressable
							onPress={() => router.push("/(user)/(tabs)/visits")}
							style={({ pressed }) => [
								styles.quickButton,
								{
									backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
									opacity: pressed ? 0.9 : 1,
								},
							]}
						>
							<Ionicons name="calendar" size={18} color={COLORS.brandPrimary} />
							<Text style={[styles.quickText, { color: colors.text }]}>Visits</Text>
						</Pressable>
						<Pressable
							onPress={() => router.push("/(user)/(stacks)/notifications")}
							style={({ pressed }) => [
								styles.quickButton,
								{
									backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
									opacity: pressed ? 0.9 : 1,
								},
							]}
						>
							<Ionicons name="notifications" size={18} color={COLORS.brandPrimary} />
							<Text style={[styles.quickText, { color: colors.text }]}>Notifications</Text>
						</Pressable>
					</View>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<View style={styles.sectionHeaderRow}>
						<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
							Recent
						</Text>
						{Array.isArray(recentQueries) && recentQueries.length > 0 ? (
							<Pressable
								onPress={clearHistory}
								style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
							>
								<Text style={{ color: colors.textMuted, fontWeight: "800", fontSize: 12 }}>
									Clear
								</Text>
							</Pressable>
						) : null}
					</View>
					{Array.isArray(recentQueries) && recentQueries.length > 0 ? (
						<View style={{ gap: 10 }}>
							{recentQueries.map((item) => (
								<Pressable
									key={item}
									onPress={() => setSearchQuery(item)}
									style={({ pressed }) => [
										styles.row,
										{
											backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
											opacity: pressed ? 0.9 : 1,
										},
									]}
								>
									<Ionicons name="time-outline" size={16} color={colors.textMuted} />
									<Text style={{ color: colors.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>
										{item}
									</Text>
									<Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
								</Pressable>
							))}
						</View>
					) : (
						<Text style={{ color: colors.textMuted, fontWeight: "600" }}>
							No recent searches yet.
						</Text>
					)}
				</View>

				{q ? (
					<>
						<View style={[styles.card, { backgroundColor: colors.card }]}>
							<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Visits</Text>
							{visitMatches.length > 0 ? (
								<View style={{ gap: 10 }}>
									{visitMatches.map((v) => (
										<Pressable
											key={String(v?.id)}
											onPress={() => router.push(`/(user)/(stacks)/visit/${String(v?.id)}`)}
											style={({ pressed }) => [
												styles.row,
												{
													backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
													opacity: pressed ? 0.9 : 1,
												},
											]}
										>
											<Ionicons name="calendar-outline" size={16} color={COLORS.brandPrimary} />
											<View style={{ flex: 1 }}>
												<Text style={{ color: colors.text, fontWeight: "800" }} numberOfLines={1}>
													{v?.hospital ?? "Visit"}
												</Text>
												<Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12 }} numberOfLines={1}>
													{[v?.specialty, v?.date, v?.time].filter(Boolean).join(" • ")}
												</Text>
											</View>
											<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
										</Pressable>
									))}
								</View>
							) : (
								<Text style={{ color: colors.textMuted, fontWeight: "600" }}>
									No matching visits.
								</Text>
							)}
						</View>

						<View style={[styles.card, { backgroundColor: colors.card }]}>
							<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Hospitals</Text>
							{hospitalMatches.length > 0 ? (
								<View style={{ gap: 10 }}>
									{hospitalMatches.map((h) => (
										<Pressable
											key={String(h?.id)}
											onPress={() => openHospitalInSOS(h?.name)}
											style={({ pressed }) => [
												styles.row,
												{
													backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
													opacity: pressed ? 0.9 : 1,
												},
											]}
										>
											<Ionicons name="business-outline" size={16} color={COLORS.brandPrimary} />
											<View style={{ flex: 1 }}>
												<Text style={{ color: colors.text, fontWeight: "800" }} numberOfLines={1}>
													{h?.name ?? "Hospital"}
												</Text>
												<Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12 }} numberOfLines={1}>
													{[h?.distance, h?.eta].filter(Boolean).join(" • ")}
												</Text>
											</View>
											<Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
										</Pressable>
									))}
								</View>
							) : (
								<Text style={{ color: colors.textMuted, fontWeight: "600" }}>
									No matching hospitals.
								</Text>
							)}
						</View>

						<View style={[styles.card, { backgroundColor: colors.card }]}>
							<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Notifications</Text>
							{notificationMatches.length > 0 ? (
								<View style={{ gap: 10 }}>
									{notificationMatches.map((n) => (
										<Pressable
											key={String(n?.id)}
											onPress={() => router.push("/(user)/(stacks)/notifications")}
											style={({ pressed }) => [
												styles.row,
												{
													backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
													opacity: pressed ? 0.9 : 1,
												},
											]}
										>
											<Ionicons name="notifications-outline" size={16} color={COLORS.brandPrimary} />
											<View style={{ flex: 1 }}>
												<Text style={{ color: colors.text, fontWeight: "800" }} numberOfLines={1}>
													{n?.title ?? "Notification"}
												</Text>
												<Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12 }} numberOfLines={1}>
													{n?.message ?? ""}
												</Text>
											</View>
											<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
										</Pressable>
									))}
								</View>
							) : (
								<Text style={{ color: colors.textMuted, fontWeight: "600" }}>
									No matching notifications.
								</Text>
							)}
						</View>
					</>
				) : null}
			</ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	content: { flexGrow: 1, padding: 20, gap: 12 },
	card: { borderRadius: 24, padding: 16 },
	sectionTitle: {
		fontSize: 10,
		fontWeight: "900",
		letterSpacing: 3,
		textTransform: "uppercase",
		marginBottom: 12,
	},
	quickRow: { flexDirection: "row", gap: 10 },
	quickButton: {
		flex: 1,
		height: 48,
		borderRadius: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	quickText: { fontSize: 13, fontWeight: "900" },
	row: {
		height: 46,
		borderRadius: 16,
		paddingHorizontal: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

