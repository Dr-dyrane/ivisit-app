"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import EmergencySearchBar from "../components/emergency/EmergencySearchBar";
import { useSearch } from "../contexts/SearchContext";
import { useVisits } from "../contexts/VisitsContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { useHospitals } from "../hooks/emergency/useHospitals";
import { useEmergencyUI } from "../contexts/EmergencyUIContext";
import { useEmergency, EmergencyMode } from "../contexts/EmergencyContext";
import SettingsIconButton from "../components/headers/SettingsIconButton";
import ActionWrapper from "../components/headers/ActionWrapper";
import { NOTIFICATION_TYPES } from "../constants/notifications";
import {
	navigateToNotifications,
	navigateToSOS,
	navigateToVisitDetails,
	navigateToVisits,
} from "../utils/navigationHelpers";

export default function SearchScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { isDarkMode } = useTheme();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
	const { updateSearch: setEmergencySearchQuery } = useEmergencyUI();
	const { setMode } = useEmergency();
    const { hospitals: dbHospitals } = useHospitals();
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
				rightComponent: (
				<ActionWrapper>
					<SettingsIconButton />
				</ActionWrapper>
			),
			});
		}, [backButton, resetHeader, resetTabBar, setHeaderState])
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

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const topPadding = STACK_TOP_PADDING;
	const bottomPadding = tabBarHeight + 20;

	const q = useMemo(() => (typeof query === "string" ? query.trim().toLowerCase() : ""), [query]);

	const isBedQuery = useMemo(() => {
		return /\b(bed|icu|ward|admission|reserve|reservation)\b/i.test(query ?? "");
	}, [query]);

	const scoreText = useCallback((needle, haystack) => {
		const n = typeof needle === "string" ? needle.trim().toLowerCase() : "";
		const h = typeof haystack === "string" ? haystack.trim().toLowerCase() : "";
		if (!n || !h) return 0;
		if (h === n) return 120;
		if (h.startsWith(n)) return 90;
		if (h.includes(n)) return 60;
		return 0;
	}, []);

	const openHospitalInSOS = useCallback(
		(hospitalName) => {
			const name = typeof hospitalName === "string" ? hospitalName : "";
			commitQuery(name);
			setEmergencySearchQuery(name);
			navigateToSOS({
				router,
				setEmergencyMode: setMode,
				mode: isBedQuery ? EmergencyMode.BOOKING : EmergencyMode.EMERGENCY,
			});
		},
		[commitQuery, isBedQuery, router, setEmergencySearchQuery, setMode]
	);

	const openNotificationsFiltered = useCallback(
		(filter) => {
			navigateToNotifications({ router, filter, method: "replace" });
		},
		[router]
	);

	const openVisitsFiltered = useCallback(
		(filter) => {
			navigateToVisits({ router, filter, method: "replace" });
		},
		[router]
	);

	const rankedResults = useMemo(() => {
		if (!q) return [];

		const results = [];

		if (q === "upcoming" || q.includes("upcoming")) {
			results.push({
				key: "visits_upcoming",
				title: "Upcoming visits",
				subtitle: "Open Visits filtered to upcoming",
				icon: "calendar-outline",
				score: 140,
					onPress: () => openVisitsFiltered("upcoming"),
				});
		}

		if (q === "completed" || q.includes("completed")) {
			results.push({
				key: "visits_completed",
				title: "Completed visits",
				subtitle: "Open Visits filtered to completed",
				icon: "checkmark-circle-outline",
				score: 140,
					onPress: () => openVisitsFiltered("completed"),
				});
		}

		if (q.includes("notification")) {
			results.push({
				key: "notifications_all",
				title: "Notifications",
				subtitle: "Open notifications inbox",
				icon: "notifications-outline",
				score: 120,
					onPress: () => openNotificationsFiltered("all"),
				});
		}

		if (Array.isArray(visits)) {
			for (const v of visits) {
				const id = v?.id ? String(v.id) : null;
				if (!id) continue;
				const title = String(v?.hospital ?? "Visit");
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
					.join(" ");
				const score = scoreText(q, title) + scoreText(q, hay) + 30;
				if (score <= 0) continue;
				results.push({
					key: `visit_${id}`,
					title,
					subtitle: [v?.specialty, v?.date, v?.time].filter(Boolean).join(" • "),
					icon: "calendar-outline",
					score,
					onPress: () => navigateToVisitDetails({ router, visitId: id, method: "replace" }),
				});
			}
		}

		const hospitals = Array.isArray(dbHospitals) ? dbHospitals : [];
		for (const h of hospitals) {
			const id = h?.id ? String(h.id) : null;
			if (!id) continue;
			const name = String(h?.name ?? "");
			const specialties = Array.isArray(h?.specialties) ? h.specialties.join(" ") : "";
			const hay = [name, h?.address, specialties].filter(Boolean).join(" ");
			const score = scoreText(q, name) + scoreText(q, hay) + 40;
			if (score <= 0) continue;
			results.push({
				key: `hospital_${id}`,
				title: name || "Hospital",
				subtitle: [h?.distance, h?.eta].filter(Boolean).join(" • "),
				icon: "business-outline",
				score,
				onPress: () => openHospitalInSOS(name),
			});
		}

		if (Array.isArray(notifications)) {
			for (const n of notifications) {
				const id = n?.id ? String(n.id) : null;
				if (!id) continue;
				const title = String(n?.title ?? "Notification");
				const hay = [n?.title, n?.message, n?.type].filter(Boolean).join(" ");
				const score = scoreText(q, title) + scoreText(q, hay) + 20;
				if (score <= 0) continue;

				const type = n?.type ?? null;
				const defaultFilter =
					type === NOTIFICATION_TYPES.EMERGENCY
						? "emergency"
						: type === NOTIFICATION_TYPES.APPOINTMENT || type === NOTIFICATION_TYPES.VISIT
							? "appointments"
							: "all";

				results.push({
					key: `notification_${id}`,
					title,
					subtitle: String(n?.message ?? ""),
					icon: "notifications-outline",
					score,
					onPress: () => {
						const actionType = n?.actionType ?? null;
						const actionData = n?.actionData ?? {};
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
						if (actionType === "view_summary" && visitId) {
							navigateToVisitDetails({ router, visitId, method: "replace" });
							return;
						}
						if (actionType === "view_appointment" && visitId) {
							navigateToVisitDetails({ router, visitId, method: "replace" });
							return;
						}
						openNotificationsFiltered(defaultFilter);
					},
				});
			}
		}

		return results
			.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
			.slice(0, 18);
	}, [
		dbHospitals,
		commitQuery,
		isBedQuery,
		notifications,
		openHospitalInSOS,
		openNotificationsFiltered,
		openVisitsFiltered,
		q,
		router,
		scoreText,
		setMode,
		visits,
	]);

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<Animated.ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingTop: topPadding, paddingBottom: bottomPadding },
				]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
				keyboardShouldPersistTaps="handled"
				style={{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
				}}
			>
				<View style={[styles.card, { backgroundColor: colors.card, borderRadius: 28, padding: 12 }]}>
					<EmergencySearchBar
						value={query}
						onChangeText={setSearchQuery}
						onBlur={() => commitQuery(query)}
						onClear={() => setSearchQuery("")}
						placeholder="Search..."
						showSuggestions={false}
					/>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card, borderRadius: 36, padding: 20, marginTop: 16 }]}>
					<Text style={[styles.sectionTitle, { 
						color: colors.textMuted,
						fontWeight: "800",
						letterSpacing: 1.5,
						textTransform: "uppercase",
						fontSize: 11,
						marginBottom: 16
					}]}>
						Top Results
					</Text>
					{rankedResults.length > 0 ? (
						<View style={{ gap: 12 }}>
							{rankedResults.map((item) => (
								<Pressable
									key={item.key}
									onPress={() => {
										commitQuery(query);
										item.onPress?.();
									}}
									style={({ pressed }) => [
										styles.row,
										{
											backgroundColor: isDarkMode
												? "rgba(255,255,255,0.04)"
												: "rgba(0,0,0,0.02)",
											borderRadius: 24,
											padding: 16,
											opacity: pressed ? 0.9 : 1,
											transform: [{ scale: pressed ? 0.98 : 1 }]
										},
									]}
								>
									<View style={{ 
										width: 32, 
										height: 32, 
										borderRadius: 10, 
										backgroundColor: COLORS.brandPrimary + '15',
										alignItems: 'center',
										justifyContent: 'center',
										marginRight: 12
									}}>
										<Ionicons name={item.icon} size={16} color={COLORS.brandPrimary} />
									</View>
									<View style={{ flex: 1 }}>
										<Text style={{ 
											color: colors.text, 
											fontWeight: "900",
											letterSpacing: -0.5,
											fontSize: 15
										}} numberOfLines={1}>
											{item.title}
										</Text>
										{item.subtitle ? (
											<Text style={{ 
												color: colors.textMuted, 
												fontWeight: "500", 
												fontSize: 12,
												letterSpacing: 0.2
											}} numberOfLines={1}>
												{item.subtitle}
											</Text>
										) : null}
									</View>
									<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
								</Pressable>
							))}
						</View>
					) : (
						<Text style={{ color: colors.textMuted, fontWeight:'500', fontSize: 13 }}>
							No results yet.
						</Text>
					)}
				</View>

				<View style={[styles.card, { backgroundColor: colors.card, borderRadius: 36, padding: 20, marginTop: 16 }]}>
					<View style={styles.sectionHeaderRow}>
						<Text style={[styles.sectionTitle, { 
							color: colors.textMuted,
							fontWeight: "800",
							letterSpacing: 1.5,
							textTransform: "uppercase",
							fontSize: 11,
							marginBottom: 16
						}]}>
							Recent
						</Text>
						{Array.isArray(recentQueries) && recentQueries.length > 0 ? (
							<Pressable
								onPress={clearHistory}
								style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
							>
								<Text style={{ color: COLORS.brandPrimary, fontWeight: "900", fontSize: 12, letterSpacing: -0.5 }}>
									CLEAR
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
											backgroundColor: isDarkMode
												? "rgba(255,255,255,0.04)"
												: "rgba(0,0,0,0.02)",
											borderRadius: 14,
											padding: 12,
											opacity: pressed ? 0.9 : 1
										},
									]}
								>
									<Ionicons name="time-outline" size={16} color={colors.textMuted} style={{ marginRight: 12 }} />
									<Text style={{ color: colors.text, fontWeight: "600", flex: 1 }}>{item}</Text>
									<Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
								</Pressable>
							))}
						</View>
					) : (
						<Text style={{ color: colors.textMuted, fontWeight:'500', fontSize: 13 }}>
							No recent searches.
						</Text>
					)}
				</View>
			</Animated.ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	content: { flexGrow: 1, padding: 20, gap: 12 },
	card: {
		borderRadius: 30,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
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
		paddingHorizontal: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
