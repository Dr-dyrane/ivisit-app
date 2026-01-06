// screens/VisitsScreen.jsx - Your medical visits

import { useCallback, useMemo, useRef, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	RefreshControl,
	Animated,
	Image,
	TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useFAB } from "../contexts/FABContext";
import { useVisits } from "../contexts/VisitsContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { COLORS } from "../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VisitCard from "../components/visits/VisitCard";
import VisitFilters from "../components/visits/VisitFilters";
import * as Haptics from "expo-haptics";

const VisitsScreen = () => {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	const { unreadCount } = useNotifications();
	const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { registerFAB } = useFAB();

	// Visits context
	const {
		filteredVisits,
		selectedVisitId,
		filter,
		filters,
		visitCounts,
		isLoading,
		selectVisit,
		setFilterType,
		refreshVisits,
	} = useVisits();

	// Animations
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;
	const pingAnim = useRef(new Animated.Value(1)).current;

	// Consistent with Welcome, Onboarding, Signup, Login screens
	const backgroundColors = isDarkMode
		? ["#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

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
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	useEffect(() => {
		Animated.loop(
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
		).start();
	}, [pingAnim]);

	// Build left component (profile) - memoized to prevent infinite re-renders
	const leftComponent = useMemo(
		() => (
			<TouchableOpacity
				onPress={() => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
					router.push("/(user)/(stacks)/profile");
				}}
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			>
				<Image
					source={
						user?.imageUri
							? { uri: user.imageUri }
							: require("../assets/profile.jpg")
					}
					resizeMode="cover"
					style={{
						width: 36,
						height: 36,
						borderRadius: 18,
						borderWidth: 2,
						borderColor: COLORS.brandPrimary,
					}}
				/>
			</TouchableOpacity>
		),
		[user?.imageUri, router]
	);

	// Build right component (notifications) - memoized to prevent infinite re-renders
	const rightComponent = useMemo(
		() => (
			<TouchableOpacity
				onPress={() => router.push("/(user)/(stacks)/notifications")}
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			>
				<View style={{ position: "relative" }}>
					<Ionicons
						name="notifications-outline"
						size={24}
						color={isDarkMode ? "#FFFFFF" : "#0F172A"}
					/>
					{unreadCount > 0 && (
						<View style={{ position: "absolute", top: -2, right: -2 }}>
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
							<View
								style={{
									width: 10,
									height: 10,
									borderRadius: 999,
									backgroundColor: COLORS.brandPrimary,
									borderWidth: 2,
									borderColor: isDarkMode ? "#0B0F1A" : "#FFFFFF",
								}}
							/>
						</View>
					)}
				</View>
			</TouchableOpacity>
		),
		[isDarkMode, unreadCount, router, pingAnim]
	);

	// Update header when screen is focused
	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Your Visits",
				subtitle: "APPOINTMENTS",
				icon: <Ionicons name="calendar" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent,
				rightComponent,
			});
		}, [resetTabBar, resetHeader, setHeaderState, leftComponent, rightComponent])
	);

	// Register FAB on focus
	useFocusEffect(
		useCallback(() => {
			registerFAB({
				icon: "add-outline",
				visible: true,
				onPress: () => {
					// TODO: Navigate to booking flow
					console.log("[iVisit] Book visit pressed");
				},
			});
		}, [registerFAB])
	);

	const handleScroll = useCallback((event) => {
		handleTabBarScroll(event);
		handleHeaderScroll(event);
	}, [handleTabBarScroll, handleHeaderScroll]);

	const handleVisitSelect = useCallback((visitId) => {
		selectVisit(selectedVisitId === visitId ? null : visitId);
	}, [selectVisit, selectedVisitId]);

	const handleViewDetails = useCallback((visitId) => {
		// TODO: Navigate to visit details
		console.log("[iVisit] View details for visit:", visitId);
	}, []);

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const headerHeight = 70;
	const topPadding = headerHeight + insets.top;

	const hasVisits = filteredVisits.length > 0;

	return (
		<LinearGradient colors={backgroundColors} style={styles.container}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: bottomPadding }]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
				refreshControl={
					<RefreshControl
						refreshing={isLoading}
						onRefresh={refreshVisits}
						tintColor={COLORS.brandPrimary}
						colors={[COLORS.brandPrimary]}
					/>
				}
			>
				{/* Filters */}
				<VisitFilters
					filters={filters}
					selectedFilter={filter}
					onSelect={setFilterType}
					counts={visitCounts}
				/>

				{/* Visit Cards or Empty State */}
				{hasVisits ? (
					<Animated.View style={{ opacity: fadeAnim }}>
						{filteredVisits.map((visit) => (
							<VisitCard
								key={visit.id}
								visit={visit}
								isSelected={selectedVisitId === visit.id}
								onSelect={handleVisitSelect}
								onViewDetails={handleViewDetails}
							/>
						))}
					</Animated.View>
				) : (
					<View style={{
						backgroundColor: colors.card,
						borderRadius: 30,
						padding: 40,
						marginTop: 24,
						alignItems: "center",
						shadowColor: "#000",
						shadowOffset: { width: 0, height: 4 },
						shadowOpacity: isDarkMode ? 0 : 0.03,
						shadowRadius: 10,
					}}>
						<View style={{
							backgroundColor: COLORS.brandPrimary,
							width: 72,
							height: 72,
							borderRadius: 20,
							alignItems: "center",
							justifyContent: "center",
							marginBottom: 20,
						}}>
							<Ionicons name="calendar-outline" size={36} color="#FFFFFF" />
						</View>
						<Text style={{
							fontSize: 19,
							fontWeight: "900",
							color: colors.text,
							letterSpacing: -0.5,
							marginBottom: 8,
						}}>
							No Visits Yet
						</Text>
						<Text style={{
							fontSize: 14,
							color: colors.textMuted,
							textAlign: "center",
							lineHeight: 20,
						}}>
							{filter === "upcoming"
								? "No upcoming appointments scheduled"
								: filter === "completed"
								? "No completed visits yet"
								: "Your medical visits will appear here"}
						</Text>
					</View>
				)}
			</ScrollView>
		</LinearGradient>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		paddingTop: 0,
		padding: 20,
	},
});

export default VisitsScreen;
