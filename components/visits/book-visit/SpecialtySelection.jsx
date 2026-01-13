import React from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";
import * as Haptics from "expo-haptics";

// Map specialties to icons (duplicated for now, could be in a constants file)
const SPECIALTY_ICONS = {
	"Cardiology": "heart",
	"Dermatology": "water",
	"General Practice": "medkit",
	"Neurology": "headset",
	"Orthopedics": "accessibility",
	"Pediatrics": "happy",
	"Psychiatry": "chatbubbles",
	"Dentistry": "nutrition",
	"Ophthalmology": "eye",
	"ENT": "ear",
};

const getSpecialtyIcon = (specialty) => {
	for (const key in SPECIALTY_ICONS) {
		if (specialty.includes(key)) return SPECIALTY_ICONS[key];
	}
	return "medical";
};

export default function SpecialtySelection({
	specialties,
	onSelect,
	onSearchPress
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		searchBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
		cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
	};

	const handlePress = (item) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onSelect(item);
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.text }]}>Select a Specialty</Text>
				<Pressable 
					onPress={() => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						onSearchPress();
					}} 
					style={({ pressed }) => [
						styles.searchTrigger, 
						{ 
							backgroundColor: colors.searchBg,
							opacity: pressed ? 0.8 : 1
						}
					]}
				>
					<Ionicons name="search" size={20} color={colors.textMuted} />
					<Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
						Search specialties...
					</Text>
				</Pressable>
			</View>

			<FlatList
				data={specialties}
				keyExtractor={item => item}
				renderItem={({ item }) => (
					<Pressable 
						onPress={() => handlePress(item)} 
						style={({ pressed }) => [
							styles.listItem, 
							{ 
								backgroundColor: colors.cardBg,
								transform: [{ scale: pressed ? 0.98 : 1 }]
							}
						]}
					>
						<View style={styles.row}>
							<View style={styles.contentRow}>
								<View style={[styles.iconBox, { backgroundColor: COLORS.brandPrimary + '15' }]}>
									<Ionicons name={getSpecialtyIcon(item)} size={24} color={COLORS.brandPrimary} />
								</View>
								<Text style={[styles.listTitle, { color: colors.text }]}>{item}</Text>
							</View>
							<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
						</View>
					</Pressable>
				)}
				contentContainerStyle={{ paddingBottom: 100, gap: 12 }}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 20,
	},
	header: {
		paddingVertical: 24,
	},
	title: {
		fontSize: 28,
		fontWeight: "900",
		marginBottom: 20,
		letterSpacing: -1,
	},
	searchTrigger: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		padding: 16,
		borderRadius: 20,
	},
	searchPlaceholder: {
		fontSize: 16,
		fontWeight: "600",
		letterSpacing: -0.2,
	},
	listItem: {
		padding: 16,
		borderRadius: 28,
		minHeight: 80,
		justifyContent: "center",
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	contentRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
	},
	iconBox: {
		width: 52,
		height: 52,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	listTitle: {
		fontSize: 17,
		fontWeight: "800",
		letterSpacing: -0.4,
	},
});
