import React, { useState, useRef, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Animated, StyleSheet, Platform } from "react-native";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";
import { useVisits } from "../../contexts/VisitsContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { discoveryService } from "../../services/discoveryService";
import * as Haptics from "expo-haptics";

const SuggestiveContent = ({ onSelectQuery }) => {
	const { isDarkMode } = useTheme();
	const { visits } = useVisits();
	const { notifications } = useNotifications();
	const [activeTab, setActiveTab] = useState("for-you");
	const [trendingItems, setTrendingItems] = useState([]);
	const [newsItems, setNewsItems] = useState([]);
	const fadeAnim = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		const loadDiscoveryData = async () => {
			const [trending, news] = await Promise.all([
				discoveryService.getTrending(),
				discoveryService.getNews()
			]);
			setTrendingItems(trending);
			setNewsItems(news);
		};
		loadDiscoveryData();
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

	const handleItemSelect = (query) => {
		Haptics.selectionAsync();
		onSelectQuery(query);
	};

	const tabs = [
		{ id: "for-you", label: "For You", icon: "person" },
		{ id: "trending", label: "Trending", icon: "trending-up" },
		{ id: "news", label: "Health News", icon: "newspaper" },
	];

	// Derive For You from real Context
	const forYouItems = useMemo(() => {
		const items = [];
		
		// Add recent visit if exists
		if (visits && visits.length > 0) {
			const lastVisit = visits[0];
			items.push({
				id: `v-${lastVisit.id}`,
				title: lastVisit.hospital || "Medical Visit",
				subtitle: "From your history",
				icon: "time-outline",
				query: lastVisit.hospital
			});
		}

		// Add recent medical notification if exists
		const medicalNotif = notifications.find(n => n.type === 'appointment' || n.type === 'visit');
		if (medicalNotif) {
			items.push({
				id: `n-${medicalNotif.id}`,
				title: medicalNotif.title,
				subtitle: "Suggested for you",
				icon: "notifications-outline",
				query: medicalNotif.title
			});
		}

		// Fallback/Default
		if (items.length < 2) {
			items.push({
				id: "def-1",
				title: "General Checkup",
				subtitle: "Routine health screening",
				icon: "medical-outline",
				query: "General checkup"
			});
		}

		return items;
	}, [visits, notifications]);

	const renderTabContent = () => {
		switch (activeTab) {
			case "for-you":
				return (
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
						{forYouItems.map(item => (
							<Pressable 
								key={item.id} 
								onPress={() => handleItemSelect(item.query)}
								style={({ pressed }) => [
									styles.horizontalCard,
									{ 
										backgroundColor: colors.cardBg,
										transform: [{ scale: pressed ? 0.96 : 1 }] 
									}
								]}
							>
								<View style={[styles.iconBox, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}>
									<Ionicons name={item.icon} size={20} color={COLORS.brandPrimary} />
								</View>
								<View style={styles.textStack}>
									<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
										{item.title}
									</Text>
									<Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
										{item.subtitle}
									</Text>
								</View>
								<View style={styles.checkmarkWrapper}>
									<Ionicons name="checkmark-circle" size={18} color={COLORS.brandPrimary} />
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
								onPress={() => handleItemSelect(item.query)}
								style={({ pressed }) => [
									styles.horizontalCard,
									{ 
										backgroundColor: colors.cardBg,
										transform: [{ scale: pressed ? 0.96 : 1 }] 
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
								<View style={styles.checkmarkWrapper}>
									<Ionicons name="checkmark-circle" size={18} color={COLORS.brandPrimary} />
								</View>
							</Pressable>
						))}
					</ScrollView>
				);
			case "news":
				return (
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
						{newsItems.map(item => (
							<Pressable 
								key={item.id}
								onPress={() => handleItemSelect(item.title)}
								style={({ pressed }) => [
									styles.newsCard,
									{ 
										backgroundColor: colors.cardBg,
										transform: [{ scale: pressed ? 0.96 : 1 }] 
									}
								]}
							>
								<View style={styles.newsHeaderRow}>
									<View style={[styles.iconBox, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}>
										<Ionicons name={item.icon || "newspaper"} size={18} color={COLORS.brandPrimary} />
									</View>
									<View style={{ flex: 1 }}>
										<Text style={styles.newsSource} numberOfLines={1}>{item.source}</Text>
										<Text style={[styles.newsTime, { color: colors.textMuted }]}>{item.time}</Text>
									</View>
								</View>
								<Text style={[styles.newsTitleText, { color: colors.text }]} numberOfLines={2}>
									{item.title}
								</Text>
								<View style={styles.checkmarkWrapper}>
									<Ionicons name="checkmark-circle" size={18} color={COLORS.brandPrimary} />
								</View>
							</Pressable>
						))}
					</ScrollView>
				);
			default:
				return null;
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DISCOVERY</Text>
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
		maxWidth: 220,
		padding: 14,
		borderRadius: 24,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		position: 'relative',
		...Platform.select({
			ios: {
				shadowOffset: { width: 0, height: 4 },
				shadowRadius: 8,
				shadowColor: "#000",
				shadowOpacity: 0.05,
			},
			android: { elevation: 2 },
		}),
	},
	iconBox: {
		width: 42,
		height: 42,
		borderRadius: 14,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 4,
	},
	textStack: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: "900",
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
		borderRadius: 24,
		gap: 12,
		position: 'relative',
		...Platform.select({
			ios: {
				shadowOffset: { width: 0, height: 4 },
				shadowRadius: 8,
				shadowColor: "#000",
				shadowOpacity: 0.05,
			},
			android: { elevation: 2 },
		}),
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
		fontWeight: "900",
		fontSize: 15,
		lineHeight: 20,
		letterSpacing: -0.3,
	},
	checkmarkWrapper: {
		position: "absolute",
		right: -4,
		bottom: -4,
	},
});

export default SuggestiveContent;
