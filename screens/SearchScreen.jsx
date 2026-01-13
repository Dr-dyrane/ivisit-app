"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Pressable,
	Animated,
} from "react-native";
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
import SpecialtySelector from "../components/emergency/SpecialtySelector";
import { useSearch } from "../contexts/SearchContext";
import { useVisits } from "../contexts/VisitsContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { useHospitals } from "../hooks/emergency/useHospitals";
import { useEmergencyUI } from "../contexts/EmergencyUIContext";
import { useEmergency, EmergencyMode } from "../contexts/EmergencyContext";
import SettingsIconButton from "../components/headers/SettingsIconButton";
import ActionWrapper from "../components/headers/ActionWrapper";
import SuggestiveContent from "../components/search/SuggestiveContent";
import { NOTIFICATION_TYPES } from "../constants/notifications";
import {
	navigateToNotifications,
	navigateToSOS,
	navigateToVisitDetails,
	navigateToVisits,
} from "../utils/navigationHelpers";

import * as Haptics from "expo-haptics";
import { discoveryService } from "../services/discoveryService";

export default function SearchScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { isDarkMode } = useTheme();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { hospitals: dbHospitals } = useHospitals();
	const { updateSearch } = useEmergencyUI();
	const { mode, setMode, specialties, selectedSpecialty, selectSpecialty } = useEmergency();
	const { query, setSearchQuery, recentQueries, commitQuery, clearHistory } =
		useSearch();
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
				title: "Healthcare Search",
				subtitle: "DISCOVERY",
				icon: <Ionicons name="search" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: <HeaderBackButton />,
				rightComponent: (
					<ActionWrapper>
						<SettingsIconButton />
					</ActionWrapper>
				),
			});
		}, [resetHeader, resetTabBar, setHeaderState])
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
		cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
		divider: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const topPadding = STACK_TOP_PADDING;

	const q = useMemo(
		() => (typeof query === "string" ? query.trim().toLowerCase() : ""),
		[query]
	);

	const isBedQuery = useMemo(() => {
		return /\b(bed|icu|ward|admission|reserve|reservation)\b/i.test(
			query ?? ""
		);
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
			Haptics.selectionAsync();
			const name = typeof hospitalName === "string" ? hospitalName : "";
			commitQuery(name);
			discoveryService.trackSearchSelection({
				query: name,
				source: "search_screen",
				key: "hospital_result",
				extra: { isBedQuery },
			});
			navigateToSOS({
				router,
				setEmergencyMode: setMode,
				setEmergencySearch: updateSearch,
				searchQuery: name,
				mode:
					selectedSpecialty || isBedQuery
						? EmergencyMode.BOOKING
						: EmergencyMode.EMERGENCY,
			});
		},
		[commitQuery, isBedQuery, router, setMode, updateSearch, selectedSpecialty]
	);

	const openNotificationsFiltered = useCallback(
		(filter) => {
			Haptics.selectionAsync();
			navigateToNotifications({ router, filter, method: "replace" });
		},
		[router]
	);

	const openVisitsFiltered = useCallback(
		(filter) => {
			Haptics.selectionAsync();
			navigateToVisits({ router, filter, method: "replace" });
		},
		[router]
	);

	const specialtyCounts = useMemo(() => {
		const counts = {};
		const hospitals = Array.isArray(dbHospitals) ? dbHospitals : [];
		const list = Array.isArray(specialties) ? specialties : [];
		for (const s of list) {
			if (!s) continue;
			const c =
				hospitals.filter(
					(h) =>
						Array.isArray(h?.specialties) &&
						h.specialties.some(
							(x) =>
								x &&
								typeof x === "string" &&
								x.toLowerCase() === s.toLowerCase()
						) &&
						((h?.availableBeds ?? 0) > 0)
				).length || 0;
			counts[s] = c;
		}
		return counts;
	}, [dbHospitals, specialties]);

	const handleSpecialtySelect = useCallback(
		(s) => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			selectSpecialty(s);
			if (s) {
				setMode(EmergencyMode.BOOKING);
			}
		},
		[selectSpecialty, setMode]
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
					subtitle: [v?.specialty, v?.date, v?.time]
						.filter(Boolean)
						.join(" • "),
					icon: "calendar-outline",
					score,
					onPress: () =>
						navigateToVisitDetails({ router, visitId: id, method: "replace" }),
				});
			}
		}

		const hospitals = Array.isArray(dbHospitals) ? dbHospitals : [];
		for (const h of hospitals) {
			const id = h?.id ? String(h.id) : null;
			if (!id) continue;
			const name = String(h?.name ?? "");
			const specialties = Array.isArray(h?.specialties)
				? h.specialties.join(" ")
				: "";
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
						: type === NOTIFICATION_TYPES.APPOINTMENT ||
						  type === NOTIFICATION_TYPES.VISIT
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

		return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 18);
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
				contentContainerStyle={{
					paddingTop: topPadding + 16,
					paddingBottom: 40,
				}}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
				keyboardShouldPersistTaps="handled"
				style={{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
				}}
			>
				{/* Premium Search Bar Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 16,
						marginBottom: 24,
					}}
				>
					<EmergencySearchBar
						value={query}
						onChangeText={setSearchQuery}
						onBlur={() => commitQuery(query)}
						onClear={() => setSearchQuery("")}
						placeholder="Search hospitals, doctors, specialties..."
						showSuggestions={false}
					/>
				</Animated.View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 16,
						marginBottom: 16,
					}}
				>
					{(mode === "booking" || isBedQuery) && Array.isArray(specialties) && specialties.length > 0 ? (
						<SpecialtySelector
							specialties={specialties}
							selectedSpecialty={selectedSpecialty}
							onSelect={handleSpecialtySelect}
							counts={specialtyCounts}
						/>
					) : null}
				</Animated.View>

				{!query ? (
					<View style={{ paddingHorizontal: 12 }}>
						<SuggestiveContent
							onSelectQuery={(q) => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								setSearchQuery(q);
							}}
						/>
					</View>
				) : (
					<Animated.View
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
							paddingHorizontal: 16,
							marginBottom: 24,
						}}
					>
						{/* Service Provider Results Header */}
						<View style={styles.resultsHeader}>
							<Text style={[styles.resultsTitle, { color: colors.text }]}>
								Available Providers
							</Text>
							<View
								style={[
									styles.resultsCount,
									{ backgroundColor: COLORS.brandPrimary + "20" },
								]}
							>
								<Text
									style={[styles.countText, { color: COLORS.brandPrimary }]}
								>
									{rankedResults.length} FOUND
								</Text>
							</View>
						</View>

						{rankedResults.length > 0 ? (
							<View style={{ gap: 20 }}>
								{rankedResults.map((item) => (
									<Pressable
										key={item.key}
										onPress={() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Selection: Impact: Light
											commitQuery(query);
											item.onPress?.();
										}}
										style={({ pressed }) => [
											styles.providerCard,
											{
												backgroundColor: colors.cardBg,
												transform: [{ scale: pressed ? 0.98 : 1 }], // Micro-Scale: Every interactive card scales to 0.98 on press
											},
										]}
									>
										{/* Provider Header */}
										<View style={styles.providerCardHeader}>
											<View style={styles.providerInfo}>
												<View
													style={[
														styles.providerAvatar,
														{ backgroundColor: COLORS.brandPrimary + "15" },
													]}
												>
													<Ionicons
														name={item.icon}
														size={24}
														color={COLORS.brandPrimary}
													/>
												</View>
												<View style={styles.providerDetails}>
													<Text
														style={[
															styles.providerName,
															{ color: colors.text },
														]}
													>
														{item.title}
													</Text>
													{item.subtitle ? (
														<Text
															style={[
																styles.providerRole,
																{ color: colors.textMuted },
															]}
														>
															{item.subtitle}
														</Text>
													) : null}
												</View>
											</View>
											<View style={styles.providerMeta}>
												<View
													style={[
														styles.metaPill,
														{ backgroundColor: COLORS.brandPrimary + "15" },
													]}
												>
													<Ionicons
														name="location"
														size={12}
														color={COLORS.brandPrimary}
													/>
													<Text
														style={[
															styles.metaText,
															{ color: COLORS.brandPrimary },
														]}
													>
														NEARBY
													</Text>
												</View>
											</View>
										</View>

										{/* Service Stats */}
										<View style={styles.serviceStats}>
											<View style={styles.statItem}>
												<Text
													style={[styles.statValue, { color: colors.text }]}
												>
													AVAILABLE
												</Text>
												<Text
													style={[
														styles.statLabel,
														{ color: colors.textMuted },
													]}
												>
													STATUS
												</Text>
											</View>
											<View style={styles.statItem}>
												<Text
													style={[styles.statValue, { color: colors.text }]}
												>
													{item.score > 100 ? "TOP" : "GOOD"}
												</Text>
												<Text
													style={[
														styles.statLabel,
														{ color: colors.textMuted },
													]}
												>
													MATCH
												</Text>
											</View>
											<View style={styles.statItem}>
												<Text
													style={[styles.statValue, { color: colors.text }]}
												>
													NOW
												</Text>
												<Text
													style={[
														styles.statLabel,
														{ color: colors.textMuted },
													]}
												>
													RESPONSE
												</Text>
											</View>
										</View>

										{/* Action Footer */}
										<View
											style={[
												styles.providerFooter,
												{ borderTopColor: colors.divider },
											]}
										>
											<Text
												style={[styles.actionText, { color: colors.textMuted }]}
											>
												TAP TO VIEW DETAILS AND BOOK
											</Text>
											<Ionicons
												name="chevron-forward"
												size={16}
												color={colors.textMuted}
											/>
										</View>

										{/* Corner Seal */}
										<View style={styles.cornerSeal}>
											<Ionicons
												name="checkmark-circle"
												size={28}
												color={COLORS.brandPrimary}
											/>
										</View>
									</Pressable>
								))}
							</View>
						) : (
							<View
								style={[styles.emptyState, { backgroundColor: colors.cardBg }]}
							>
								<Ionicons name="search" size={48} color={colors.textMuted} />
								<Text style={[styles.emptyTitle, { color: colors.text }]}>
									No providers found
								</Text>
								<Text
									style={[styles.emptySubtitle, { color: colors.textMuted }]}
								>
									Try adjusting your search terms or location
								</Text>
							</View>
						)}
					</Animated.View>
				)}

				{/* Recent Searches - Service Provider Style */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 16,
						marginBottom: 24,
					}}
				>
					<View style={styles.recentHeader}>
						<Text style={[styles.recentTitle, { color: colors.text }]}>
							Recent Searches
						</Text>
						<Text style={[styles.recentSubtitle, { color: colors.textMuted }]}>
							Your healthcare discovery history
						</Text>
					</View>

					{Array.isArray(recentQueries) && recentQueries.length > 0 ? (
						<View style={{ gap: 12 }}>
							{recentQueries.map((item, index) => (
								<Pressable
									key={item}
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
										setSearchQuery(item);
									}}
									style={({ pressed }) => [
										styles.recentCard,
										{
											backgroundColor: colors.cardBg,
											transform: [{ scale: pressed ? 0.98 : 1 }],
										},
									]}
								>
									<View style={styles.recentCardHeader}>
										<View style={styles.recentInfo}>
											<View
												style={[
													styles.recentAvatar,
													{ backgroundColor: COLORS.brandPrimary + "15" },
												]}
											>
												<Ionicons
													name="time-outline"
													size={16}
													color={COLORS.brandPrimary}
												/>
											</View>
											<View style={styles.recentDetails}>
												<Text
													style={[styles.recentName, { color: colors.text }]}
												>
													{item}
												</Text>
												<Text
													style={[
														styles.recentRole,
														{ color: colors.textMuted },
													]}
												>
													SEARCH #{recentQueries.length - index}
												</Text>
											</View>
										</View>
										<View style={styles.recentMeta}>
											<Ionicons
												name="chevron-forward"
												size={16}
												color={colors.textMuted}
											/>
										</View>
									</View>
								</Pressable>
							))}
						</View>
					) : (
						<View
							style={[styles.emptyState, { backgroundColor: colors.cardBg }]}
						>
							<Ionicons
								name="time-outline"
								size={48}
								color={colors.textMuted}
							/>
							<Text style={[styles.emptyTitle, { color: colors.text }]}>
								No recent searches
							</Text>
							<Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
								Start searching for healthcare providers
							</Text>
						</View>
					)}

					{Array.isArray(recentQueries) && recentQueries.length > 0 ? (
						<Pressable
							onPress={() => {
								Haptics.notificationAsync(
									Haptics.NotificationFeedbackType.Warning
								);
								clearHistory();
							}}
							style={({ pressed }) => [
								styles.clearButton,
								{
									backgroundColor: colors.cardBg,
									opacity: pressed ? 0.8 : 1,
								},
							]}
						>
							<Ionicons
								name="trash-outline"
								size={16}
								color={COLORS.brandPrimary}
							/>
							<Text
								style={[styles.clearButtonText, { color: COLORS.brandPrimary }]}
							>
								CLEAR SEARCH HISTORY
							</Text>
						</Pressable>
					) : null}
				</Animated.View>
			</Animated.ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	// Premium Search Card
	searchCard: {
		borderRadius: 36, // Primary Artifact
		padding: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.05,
		shadowRadius: 20,
		elevation: 8,
	},

	// Results Header
	resultsHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
	},
	resultsTitle: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -1.0,
	},
	resultsCount: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
	},
	countText: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1.5, // Identity label
		textTransform: "uppercase",
	},

	// Provider Cards - Following Manifesto Design Standards
	providerCard: {
		borderRadius: 36, // Primary Artifact (36px)
		padding: 16, // Consistent with emergency cards
		marginBottom: 20,
		position: "relative",
		// Border-Free Depth: Bioluminescence & Glass
		shadowColor: COLORS.brandPrimary, // Active Glow for selected items
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.15, // High-contrast selected fill
		shadowRadius: 15,
		elevation: 6,
	},

	providerCardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 24,
	},

	providerInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},

	providerAvatar: {
		width: 56, // Identity Widget (14px * 4 = 56px)
		height: 56,
		borderRadius: 14, // Identity / Detail (14px)
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
		// Frosted Glass effect
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},

	providerDetails: {
		flex: 1,
	},

	providerName: {
		fontSize: 20, // Primary Headline: FontWeight: 900, LetterSpacing: -1.0pt
		fontWeight: "900",
		letterSpacing: -1.0,
		marginBottom: 4,
	},

	providerRole: {
		fontSize: 14,
		fontWeight: "600",
	},

	providerMeta: {
		alignItems: "flex-end",
	},

	metaPill: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 12, // Widget / Card-in-Card (24px / 2 = 12px)
		gap: 6,
		// Border-Free Depth
		shadowColor: COLORS.brandPrimary, // Active Glow
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},

	metaText: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1.5,
	},

	// Service Stats
	serviceStats: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 24,
		paddingHorizontal: 4,
	},

	statItem: {
		alignItems: "flex-start",
		flex: 1,
	},

	statValue: {
		fontSize: 15,
		fontWeight: "900", // Vital Stat
		letterSpacing: -0.5,
		marginBottom: 4,
	},

	statLabel: {
		fontSize: 9,
		fontWeight: "800",
		letterSpacing: 1.5, // Identity Label
		textTransform: "uppercase",
	},

	// Provider Footer
	providerFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 20,
		borderTopWidth: 1,
	},

	actionText: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1.5,
	},

	cornerSeal: {
		position: "absolute",
		bottom: -4,
		right: -4,
	},

	// Recent Searches
	recentHeader: {
		marginBottom: 20,
		marginTop: 12,
	},
	recentTitle: {
		fontSize: 24,
		fontWeight: "900",
		letterSpacing: -1.0,
		marginBottom: 8,
	},
	recentSubtitle: {
		fontSize: 15,
		fontWeight: "500",
		lineHeight: 22,
	},

	recentCard: {
		borderRadius: 24, // Widget squircle
		padding: 20,
		marginBottom: 12,
	},

	recentCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	recentInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},

	recentAvatar: {
		width: 44,
		height: 44,
		borderRadius: 14, // Identity squircle
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
	},

	recentDetails: {
		flex: 1,
	},

	recentName: {
		fontSize: 16,
		fontWeight: "800",
		letterSpacing: -0.5,
		marginBottom: 2,
	},

	recentRole: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1.5,
		textTransform: "uppercase",
	},

	recentMeta: {
		alignItems: "center",
	},

	// Clear Button
	clearButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		padding: 20,
		borderRadius: 24,
		marginTop: 12,
	},
	clearButtonText: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 1.5,
		textTransform: "uppercase",
	},
	emptyState: {
		borderRadius: 36,
		padding: 48,
		alignItems: "center",
		justifyContent: "center",
		gap: 16,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "900",
		letterSpacing: -1.0,
	},
	emptySubtitle: {
		fontSize: 15,
		textAlign: "center",
		lineHeight: 22,
		fontWeight: "500",
	},
});
