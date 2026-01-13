import React, { useState, useRef, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Animated, StyleSheet, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";
import { useVisits } from "../../contexts/VisitsContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { discoveryService } from "../../services/discoveryService";
import * as Haptics from "expo-haptics";
import SpecialtySelector from "../emergency/SpecialtySelector";

const SuggestiveContent = ({ onSelectQuery }) => {
	const { isDarkMode } = useTheme();
	const { visits } = useVisits();
	const { notifications } = useNotifications();
	const [activeTab, setActiveTab] = useState("quick-actions");
	const [trendingItems, setTrendingItems] = useState([]);
	const fadeAnim = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		const loadTrendingData = async () => {
			const trending = await discoveryService.getTrending();
			setTrendingItems(trending);
		};
		loadTrendingData();
	}, []);

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
		tabActive: COLORS.brandPrimary,
		tabInactive: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
		activeGlow: COLORS.brandPrimary + (isDarkMode ? "25" : "15"),
	};

	const handleTabChange = (tabId) => {
		if (activeTab === tabId) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		
		Animated.timing(fadeAnim, {
			toValue: 0,
			duration: 150,
			useNativeDriver: true,
		}).start(() => {
			setActiveTab(tabId);
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 200,
				useNativeDriver: true,
			}).start();
		});
	};

	const handleItemSelect = (query, meta) => {
		Haptics.selectionAsync();
		discoveryService.trackSearchSelection({
			query,
			source: "suggestive",
			key: meta?.key || meta?.id || null,
			extra: meta || null,
		});
		onSelectQuery(query);
	};

	const tabs = [
		{ id: "quick-actions", label: "Quick Actions", icon: "flash" },
		{ id: "specialties", label: "Specialties", icon: "medical" },
		{ id: "trending", label: "Trending", icon: "trending-up" },
	];

	// Quick Actions for life-saving scenarios
	const quickActionItems = useMemo(() => {
		const items = [];
		
		// Emergency - Always first
		items.push({
			id: "emergency",
			title: "Emergency SOS",
			subtitle: "Get immediate help",
			icon: "alert-circle",
			color: "#EF4444",
			query: "emergency",
			isEmergency: true
		});

		// Last hospital visit if exists
		if (visits && visits.length > 0) {
			const lastVisit = visits[0];
			items.push({
				id: `v-${lastVisit.id}`,
				title: lastVisit.hospital || "Last Visit",
				subtitle: "Book again",
				icon: "location",
				color: COLORS.brandPrimary,
				query: lastVisit.hospital
			});
		}

		// Common urgent needs
		items.push({
			id: "pharmacy",
			title: "24/7 Pharmacy",
			subtitle: "Find nearby pharmacies",
			icon: "medical",
			color: "#10B981",
			query: "pharmacy"
		});

		items.push({
			id: "hospital",
			title: "Hospitals Near Me",
			subtitle: "Find nearest hospitals",
			icon: "business",
			color: "#3B82F6",
			query: "hospital"
		});

		return items;
	}, [visits]);

	// Recent searches from context
	const recentItems = useMemo(() => {
		// This would come from SearchContext recentQueries
		// For now, show some common healthcare searches
		return [
			{
				id: "r1",
				title: "Cardiologists",
				subtitle: "Heart specialists",
				icon: "heart",
				color: COLORS.brandPrimary,
				query: "cardiologists"
			},
			{
				id: "r2", 
				title: "Pediatricians",
				subtitle: "Child healthcare",
				icon: "child",
				color: COLORS.brandPrimary,
				query: "pediatricians"
			},
			{
				id: "r3",
				title: "Dental Care",
				subtitle: "Dentists & orthodontics",
				icon: "medical",
				color: COLORS.brandPrimary,
				query: "dental"
			}
		];
	}, []);

	const renderTabContent = () => {
		switch (activeTab) {
			case "quick-actions":
				return (
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
						{quickActionItems.map(item => (
							<Pressable 
								key={item.id} 
								onPress={() => item.isEmergency ? handleItemSelect("emergency", item) : handleItemSelect(item.query, item)}
								style={({ pressed }) => [
									styles.horizontalCard,
									{ 
										backgroundColor: item.color + (isDarkMode ? "20" : "10"),
										transform: [{ scale: pressed ? 0.98 : 1 }] // Micro-Scale: Every interactive card scales to 0.98 on press
									}
								]}
							>
								<View style={[styles.iconBox, { backgroundColor: item.color }]}>
									<Ionicons name={item.icon} size={24} color="#FFFFFF" />
								</View>
								<View style={styles.textStack}>
									<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
										{item.title}
									</Text>
									<Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
										{item.subtitle}
									</Text>
								</View>
								<View style={[
									styles.checkmarkWrapper,
									{
										backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF", // Frosted Glass background
									}
								]}>
									<Ionicons name="arrow-forward" size={18} color={item.color} />
								</View>
							</Pressable>
						))}
					</ScrollView>
				);
			case "trending":
				return (
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
						{trendingItems.map((item, index) => (
							<Pressable 
								key={item.id} 
								onPress={() => handleItemSelect(item.query, item)}
								style={({ pressed }) => [
									styles.horizontalCard,
									{ 
										backgroundColor: colors.cardBg,
										transform: [{ scale: pressed ? 0.98 : 1 }] // Micro-Scale: Every interactive card scales to 0.98 on press 
									}
								]}
							>
								<View style={[styles.iconBox, { backgroundColor: COLORS.brandPrimary }]}>
									<Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 14 }}>{index + 1}</Text>
								</View>
								<View style={styles.textStack}>
									<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
										{item.query}
									</Text>
									<Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
										{item.category}
									</Text>
								</View>
								<View style={[
									styles.checkmarkWrapper,
									{
										backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF", // Frosted Glass background
									}
								]}>
									<Ionicons name="trending-up" size={18} color={COLORS.brandPrimary} />
								</View>
							</Pressable>
						))}
					</ScrollView>
				);
			case "specialties":
				return (
					<SpecialtySelector 
						specialties={["General Care", "Emergency", "Cardiology", "Neurology", "Oncology", "Pediatrics", "Orthopedics", "ICU", "Trauma", "Urgent Care"]}
						selectedSpecialty={null}
						onSelect={onSelectQuery}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>HEALTHCARE DISCOVERY</Text>
			</View>

			<ScrollView 
				horizontal 
				showsHorizontalScrollIndicator={false} 
				style={styles.tabScroll}
				contentContainerStyle={styles.tabContainer}
			>
				{tabs.map(tab => (
					<Pressable
						key={tab.id}
						onPress={() => handleTabChange(tab.id)}
						style={({ pressed }) => [
							styles.tabButton,
							{ 
								backgroundColor: activeTab === tab.id ? colors.tabActive : colors.tabInactive,
								transform: [{ scale: pressed ? 0.95 : 1 }]
							}
						]}
					>
						<Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? "#FFFFFF" : colors.textMuted} style={{ marginRight: 8 }} />
						<Text style={[
							styles.tabText,
							{ color: activeTab === tab.id ? "#FFFFFF" : colors.textMuted }
						]}>
							{tab.label}
						</Text>
					</Pressable>
				))}
			</ScrollView>

			<Animated.View style={{ opacity: fadeAnim }}>
				{renderTabContent()}
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginTop: 8,
	},
	header: {
		paddingHorizontal: 4,
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 1.5,
		textTransform: "uppercase",
	},
	tabScroll: {
		marginBottom: 20,
	},
	tabContainer: {
		paddingHorizontal: 4,
		gap: 10,
	},
	tabButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 20,
	},
	tabText: {
		fontWeight: "900",
		fontSize: 13,
		letterSpacing: -0.3,
	},
	horizontalScroll: {
		paddingLeft: 4,
		paddingRight: 20,
		paddingBottom: 8,
		gap: 12,
	},
	horizontalCard: {
		minWidth: 180,
		padding: 16, // Consistent with manifesto
		borderRadius: 24, // Widget / Card-in-Card (24px)
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		position: 'relative',
		// Border-Free Depth: Bioluminescence & Glass
		shadowColor: COLORS.brandPrimary, // Active Glow
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 4,
	},
	iconBox: {
		width: 48, // Widget / Card-in-Card (24px * 2)
		height: 48,
		borderRadius: 14, // Identity / Detail (14px)
		justifyContent: "center",
		alignItems: "center",
		// Frosted Glass effect
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	textStack: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: "900", // Primary Headline: FontWeight: 900, LetterSpacing: -1.0pt
		letterSpacing: -0.5,
	},
	cardSubtitle: {
		fontSize: 11,
		fontWeight: '600',
		marginTop: 1,
		opacity: 0.7,
	},
	newsCard: {
		width: 240,
		padding: 16,
		borderRadius: 24, // Primary Artifact (36px) - smaller for suggestion cards
		gap: 12,
		position: 'relative',
		// Border-Free Depth: Bioluminescence & Glass
		shadowColor: COLORS.brandPrimary, // Active Glow
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 4,
	},
	newsHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	newsSource: {
		color: COLORS.brandPrimary,
		fontWeight: "800",
		fontSize: 11,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	newsTime: {
		fontSize: 10,
		fontWeight: "600",
		marginTop: 1,
	},
	newsTitleText: {
		fontWeight: "900", // Primary Headline
		fontSize: 15,
		lineHeight: 20,
		letterSpacing: -0.3, // Editorial Weight
	},
	checkmarkWrapper: {
		position: "absolute",
		right: -4,
		bottom: -4,
		width: 32, // Proper badge size
		height: 32,
		borderRadius: 16, // Perfect circle
		alignItems: "center",
		justifyContent: "center",
		// The Signature Interaction: "The Corner Seal"
		shadowColor: COLORS.brandPrimary, // Active Glow
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
});

export default SuggestiveContent;
