import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

// Search-focused specialties
const SEARCH_SPECIALTIES = [
	{ id: "cardiologists", name: "Cardiologists", icon: "heart-pulse" },
	{ id: "pediatricians", name: "Pediatricians", icon: "baby-face-outline" },
	{ id: "hospitals", name: "Hospitals", icon: "hospital-building" },
	{ id: "pharmacies", name: "24/7 Pharmacies", icon: "medical-bag" },
	{ id: "dental", name: "Dental Care", icon: "tooth" },
	{ id: "mental-health", name: "Mental Health", icon: "brain" },
	{ id: "emergency", name: "Emergency Care", icon: "ambulance" },
];

export default function SearchSpecialtySelector({ onSelect }) {
	const { isDarkMode } = useTheme();
	const lastCallTime = useRef(0);
	const DEBOUNCE_MS = 300;

	const handleSelect = (specialtyId) => {
		const now = Date.now();
		if (now - lastCallTime.current < DEBOUNCE_MS) return;
		lastCallTime.current = now;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		
		// Call parent with search query
		onSelect(specialtyId);
	};

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: mutedColor }]}>SEARCH SPECIALTIES</Text>
			</View>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				decelerationRate="normal"
			>
				{SEARCH_SPECIALTIES.map((specialty) => (
					<Pressable
						key={specialty.id}
						onPress={() => handleSelect(specialty.id)}
						style={({ pressed }) => [
							styles.card,
							{
								backgroundColor: pressed ? "rgba(134, 239, 172, 0.1)" : "transparent",
								transform: [{ scale: pressed ? 0.96 : 1 }],
							},
						]}
					>
						<View style={styles.iconBox}>
							<MaterialCommunityIcons
								name={specialty.icon}
								size={24}
								color={COLORS.brandPrimary}
							/>
						</View>
						
						<View style={styles.textStack}>
							<Text style={[styles.specialtyName, { color: textColor }]}>
								{specialty.name}
							</Text>
						</View>
					</Pressable>
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: 8,
		marginBottom: 0,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 14,
		paddingHorizontal: 4,
		gap: 8,
	},
	title: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 1.5,
		textTransform: "uppercase",
	},
	scrollContent: {
		paddingLeft: 4,
		paddingRight: 20,
		paddingBottom: 8,
		gap: 12,
	},
	card: {
		minWidth: 120,
		paddingVertical: 16,
		paddingHorizontal: 12,
		borderRadius: 16,
		alignItems: 'center',
		position: "relative",
	},
	iconBox: {
		width: 48,
		height: 48,
		borderRadius: 12,
		backgroundColor: 'rgba(134, 239, 172, 0.1)',
		justifyContent: "center",
		alignItems: "center",
	},
	textStack: {
		flex: 1,
		justifyContent: 'center',
	},
	specialtyName: {
		fontSize: 14,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
});
