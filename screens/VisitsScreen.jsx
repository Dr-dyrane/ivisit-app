// screens/VisitsScreen.jsx - Your medical visits

import { useCallback, useRef, useEffect, useMemo } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	RefreshControl,
	Animated,
	ActivityIndicator,
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
import { COLORS } from "../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VisitCard from "../components/visits/VisitCard";
import VisitFilters from "../components/visits/VisitFilters";
import NotificationIconButton from "../components/headers/NotificationIconButton";
import ProfileAvatarButton from "../components/headers/ProfileAvatarButton";

const VisitsScreen = () => {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { registerFAB } = useFAB();

	// Visits context
	const {
		filteredVisits = [],
		selectedVisitId = null,
		filter = "all",
		filters = [],
		visitCounts = { all: 0, upcoming: 0, completed: 0 },
		isLoading = false,
		selectVisit,
		setFilterType,
		refreshVisits,
	} = useVisits();

	// Animations
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	// Consistent with Welcome, Onboarding, Signup, Login screens
	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

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

	// Modular header components with haptic feedback - memoized to prevent infinite re-renders
	const leftComponent = useMemo(() => <ProfileAvatarButton />, []);
	const rightComponent = useMemo(() => <NotificationIconButton />, []);

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
		}, [
			resetTabBar,
			resetHeader,
			setHeaderState,
			leftComponent,
			rightComponent,
		])
	);

	// Register FAB on focus
	useFocusEffect(
		useCallback(() => {
			registerFAB({
				icon: "add-outline",
				visible: true,
				onPress: () => {
					router.push("/(user)/(stacks)/book-visit");
				},
			});
		}, [registerFAB, router])
	);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleTabBarScroll, handleHeaderScroll]
	);

	const handleVisitSelect = useCallback(
		(visitId) => {
			if (!visitId) return;
			selectVisit(selectedVisitId === visitId ? null : visitId);
		},
		[selectVisit, selectedVisitId]
	);

	const handleViewDetails = useCallback((visitId) => {
		if (!visitId) return;
		router.push(`/(user)/(stacks)/visit/${visitId}`);
	}, [router]);

	const tabBarHeight = Platform.OS === "ios" ? 85 + (insets?.bottom || 0) : 70;
	const bottomPadding = tabBarHeight + 20;
	const headerHeight = 70;
	const topPadding = headerHeight + (insets?.top || 0);

	const hasVisits = Array.isArray(filteredVisits) && filteredVisits.length > 0;

	return (
		<LinearGradient colors={backgroundColors} style={styles.container}>
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
						onRefresh={refreshVisits}
						tintColor={COLORS.brandPrimary}
						colors={[COLORS.brandPrimary]}
					/>
				}
			>
				{isLoading && !hasVisits && (
					<View
						style={{
							backgroundColor: colors.card,
							borderRadius: 30,
							padding: 28,
							marginTop: 24,
							alignItems: "center",
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDarkMode ? 0 : 0.03,
							shadowRadius: 10,
						}}
					>
						<ActivityIndicator color={COLORS.brandPrimary} />
						<Text
							style={{
								marginTop: 14,
								fontSize: 16,
								fontWeight: "900",
								color: colors.text,
								letterSpacing: -0.4,
							}}
						>
							Loading visits
						</Text>
						<Text
							style={{
								marginTop: 6,
								fontSize: 13,
								fontWeight: "600",
								color: colors.textMuted,
								textAlign: "center",
								lineHeight: 18,
							}}
						>
							Syncing your upcoming appointments and history
						</Text>
					</View>
				)}

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
							visit ? (
								<VisitCard
									key={visit?.id}
									visit={visit}
									isSelected={selectedVisitId === visit?.id}
									onSelect={handleVisitSelect}
									onViewDetails={handleViewDetails}
								/>
							) : null
						))}
					</Animated.View>
				) : (
					<View
						style={{
							backgroundColor: colors.card,
							borderRadius: 30,
							padding: 40,
							marginTop: 24,
							alignItems: "center",
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDarkMode ? 0 : 0.03,
							shadowRadius: 10,
						}}
					>
						<View
							style={{
								backgroundColor: COLORS.brandPrimary,
								width: 72,
								height: 72,
								borderRadius: 20,
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 20,
							}}
						>
							<Ionicons name="calendar-outline" size={36} color="#FFFFFF" />
						</View>
						<Text
							style={{
								fontSize: 19,
								fontWeight: "900",
								color: colors.text,
								letterSpacing: -0.5,
								marginBottom: 8,
							}}
						>
							No Visits Yet
						</Text>
						<Text
							style={{
								fontSize: 14,
								color: colors.textMuted,
								textAlign: "center",
								lineHeight: 20,
							}}
						>
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
