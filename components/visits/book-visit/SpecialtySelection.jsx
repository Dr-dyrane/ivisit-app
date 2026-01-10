import React from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";

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
		searchBg: isDarkMode ? "#0B0F1A" : "#F3E7E7", // Match EmergencySearchBar
		cardBg: isDarkMode ? "#0B0F1A" : "#FFFFFF",
	};

	const cardStyle = {
		backgroundColor: colors.cardBg,
		borderRadius: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: isDarkMode ? 0 : 0.05,
		shadowRadius: 8,
		elevation: 2,
	};

	return (
		<View style={styles.container}>
			<Text style={[styles.title, { color: colors.text }]}>Select a Specialty</Text>
			
			<Pressable onPress={onSearchPress} style={{ marginBottom: 24 }}>
				<View style={[styles.searchTrigger, { backgroundColor: colors.searchBg }]}>
					<Ionicons name="search" size={20} color={isDarkMode ? "#64748B" : "#94A3B8"} />
					<Text style={[styles.searchPlaceholder, { color: isDarkMode ? "#64748B" : "#94A3B8" }]}>
						Search hospitals, specialties...
					</Text>
				</View>
			</Pressable>

			<FlatList
				data={specialties}
				keyExtractor={item => item}
				renderItem={({ item }) => (
					<Pressable onPress={() => onSelect(item)} style={{ marginBottom: 12 }}>
						<View style={[styles.listItem, cardStyle]}>
							<View style={styles.row}>
								<View style={styles.contentRow}>
									<View style={[styles.iconBox, { backgroundColor: COLORS.brandPrimary + '15' }]}>
										<Ionicons name={getSpecialtyIcon(item)} size={24} color={COLORS.brandPrimary} />
									</View>
									<Text style={[styles.listTitle, { color: colors.text }]}>{item}</Text>
								</View>
								<Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
							</View>
						</View>
					</Pressable>
				)}
				contentContainerStyle={{ paddingBottom: 100 }}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "900",
		marginBottom: 16,
		letterSpacing: -0.5,
	},
	searchTrigger: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		padding: 16,
		borderRadius: 16, // Match EmergencySearchBar likely radius
	},
	searchPlaceholder: {
		fontSize: 16,
		fontWeight: "500",
	},
	listItem: {
		padding: 16,
		minHeight: 70,
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
		width: 48,
		height: 48,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	listTitle: {
		fontSize: 16,
		fontWeight: "700",
	},
});
