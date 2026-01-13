import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";

const SuggestiveContent = ({ onSelectQuery }) => {
	const { isDarkMode } = useTheme();
	const [activeTab, setActiveTab] = useState("for-you");

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#FFFFFF",
		tabActive: COLORS.brandPrimary,
		tabInactive: isDarkMode ? "#1E293B" : "#F1F5F9",
	};

	const tabs = [
		{ id: "for-you", label: "For You" },
		{ id: "trending", label: "Trending" },
		{ id: "news", label: "Health News" },
	];

	const trendingItems = [
		{ id: "1", query: "Cardiologists near me", category: "Trending in Lagos" },
		{ id: "2", query: "Yellow Fever Vaccine", category: "Health Alerts" },
		{ id: "3", query: "24/7 Pharmacies", category: "Most Searched" },
		{ id: "4", query: "Pediatricians", category: "Popular" },
	];

	const newsItems = [
		{ 
			id: "n1", 
			title: "New ICU Wing at Reddington", 
			source: "Hospital Update", 
			time: "2h ago",
			icon: "business-outline"
		},
		{ 
			id: "n2", 
			title: "Free Dental Checkups this Saturday", 
			source: "Public Health", 
			time: "5h ago",
			icon: "medical-outline"
		},
		{ 
			id: "n3", 
			title: "Flu Season Peak: Stay Protected", 
			source: "Health Alert", 
			time: "1d ago",
			icon: "alert-circle-outline"
		},
	];

	const forYouItems = [
		{ 
			id: "f1", 
			title: "Recent Visit: Lagoon Hospital", 
			subtitle: "2 weeks ago",
			icon: "time-outline",
			query: "Lagoon Hospital"
		},
		{ 
			id: "f2", 
			title: "Suggested: General Checkup", 
			subtitle: "It's been 6 months",
			icon: "calendar-outline",
			query: "General checkup"
		},
	];

	const renderTabContent = () => {
		switch (activeTab) {
			case "for-you":
				return (
					<View style={{ gap: 16 }}>
						{forYouItems.map(item => (
							<Pressable 
								key={item.id} 
								onPress={() => onSelectQuery(item.query)}
								style={({ pressed }) => ({
									flexDirection: "row",
									alignItems: "center",
									gap: 16,
									opacity: pressed ? 0.7 : 1
								})}
							>
								<View style={{ 
									width: 48, 
									height: 48, 
									borderRadius: 16, 
									backgroundColor: colors.tabInactive,
									alignItems: "center",
									justifyContent: "center"
								}}>
									<Ionicons name={item.icon} size={22} color={COLORS.brandPrimary} />
								</View>
								<View>
									<Text style={{ color: colors.text, fontWeight: "900", fontSize: 16, letterSpacing: -0.5 }}>
										{item.title}
									</Text>
									<Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "500" }}>
										{item.subtitle}
									</Text>
								</View>
							</Pressable>
						))}
					</View>
				);
			case "trending":
				return (
					<View style={{ gap: 20 }}>
						{trendingItems.map((item, index) => (
							<Pressable 
								key={item.id} 
								onPress={() => onSelectQuery(item.query)}
								style={({ pressed }) => ({
									opacity: pressed ? 0.7 : 1
								})}
							>
								<Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
									{index + 1} · {item.category}
								</Text>
								<Text style={{ color: colors.text, fontWeight: "900", fontSize: 17, letterSpacing: -0.5 }}>
									{item.query}
								</Text>
							</Pressable>
						))}
					</View>
				);
			case "news":
				return (
					<View style={{ gap: 20 }}>
						{newsItems.map(item => (
							<View key={item.id} style={{ flexDirection: "row", gap: 16 }}>
								<View style={{ 
									width: 52, 
									height: 52, 
									borderRadius: 18, 
									backgroundColor: colors.tabInactive,
									alignItems: "center",
									justifyContent: "center"
								}}>
									<Ionicons name={item.icon} size={24} color={COLORS.brandPrimary} />
								</View>
								<View style={{ flex: 1 }}>
									<View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
										<Text style={{ color: COLORS.brandPrimary, fontWeight: "800", fontSize: 11, textTransform: "uppercase" }}>
											{item.source}
										</Text>
										<Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "500" }}>
											{item.time}
										</Text>
									</View>
									<Text style={{ color: colors.text, fontWeight: "900", fontSize: 16, lineHeight: 22, letterSpacing: -0.3 }}>
										{item.title}
									</Text>
								</View>
							</View>
						))}
					</View>
				);
			default:
				return null;
		}
	};

	return (
		<View style={{ marginTop: 20 }}>
			{/* Tab Bar */}
			<ScrollView 
				horizontal 
				showsHorizontalScrollIndicator={false} 
				style={{ marginBottom: 24 }}
				contentContainerStyle={{ gap: 8 }}
			>
				{tabs.map(tab => (
					<Pressable
						key={tab.id}
						onPress={() => setActiveTab(tab.id)}
						style={{
							paddingHorizontal: 20,
							paddingVertical: 10,
							borderRadius: 20,
							backgroundColor: activeTab === tab.id ? colors.tabActive : colors.tabInactive,
						}}
					>
						<Text style={{ 
							color: activeTab === tab.id ? "#FFFFFF" : colors.textMuted,
							fontWeight: "900",
							fontSize: 14,
							letterSpacing: -0.2
						}}>
							{tab.label}
						</Text>
					</Pressable>
				))}
			</ScrollView>

			{/* Content Card */}
			<View style={{ 
				backgroundColor: colors.card, 
				borderRadius: 36, 
				padding: 24,
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 10 },
				shadowOpacity: 0.05,
				shadowRadius: 20,
				elevation: 5
			}}>
				{renderTabContent()}
			</View>
		</View>
	);
};

export default SuggestiveContent;
