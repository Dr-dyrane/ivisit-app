// screens/VisitsScreen.jsx - Your medical visits

import { useCallback, useRef, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	RefreshControl,
	Animated,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useFAB } from "../contexts/FABContext";
import { useVisits } from "../contexts/VisitsContext";
import { COLORS } from "../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VisitCard from "../components/visits/VisitCard";
import VisitFilters from "../components/visits/VisitFilters";

const VisitsScreen = () => {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { handleScroll } = useTabBarVisibility();
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
	const slideAnim = useRef(new Animated.Value(20)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 400,
				useNativeDriver: true,
			}),
			Animated.spring(slideAnim, {
				toValue: 0,
				friction: 8,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

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

	const handleVisitSelect = useCallback((visitId) => {
		selectVisit(selectedVisitId === visitId ? null : visitId);
	}, [selectVisit, selectedVisitId]);

	const handleViewDetails = useCallback((visitId) => {
		// TODO: Navigate to visit details
		console.log("[iVisit] View details for visit:", visitId);
	}, []);

	const colors = {
		background: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
		text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
		textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
		card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;

	const hasVisits = filteredVisits.length > 0;

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
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
				{/* Header */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						marginBottom: 20,
						marginTop: insets.top,
					}}
				>
					<Text style={[styles.title, { color: colors.text }]}>
						Your Visits
					</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						Manage your medical appointments
					</Text>
				</Animated.View>

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
					<View style={[styles.emptyState, { backgroundColor: colors.card }]}>
						<Ionicons
							name="calendar-outline"
							size={64}
							color={COLORS.brandPrimary}
						/>
						<Text style={[styles.emptyTitle, { color: colors.text }]}>
							No Visits Yet
						</Text>
						<Text style={[styles.emptyText, { color: colors.textMuted }]}>
							{filter === "upcoming"
								? "No upcoming appointments scheduled"
								: filter === "completed"
								? "No completed visits yet"
								: "Your medical visits will appear here"}
						</Text>
					</View>
				)}
			</ScrollView>
		</View>
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
		padding: 20,
	},
	title: {
		fontSize: 28,
		fontWeight: "800",
		letterSpacing: -0.5,
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
	},
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
	emptyText: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
});

export default VisitsScreen;
