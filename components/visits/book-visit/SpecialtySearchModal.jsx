import React from "react";
import {
	View,
	Text,
	Modal,
	TextInput,
	FlatList,
	Pressable,
	StyleSheet,
	KeyboardAvoidingView,
	TouchableWithoutFeedback,
	Keyboard,
	Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";

// Map specialties to icons
const SPECIALTY_ICONS = {
	"Cardiology": "heart",
	"Dermatology": "water",
	"General Practice": "medkit",
	"Neurology": "headset", // Approximation
	"Orthopedics": "accessibility",
	"Pediatrics": "happy",
	"Psychiatry": "chatbubbles",
	"Dentistry": "nutrition", // Tooth not available in all sets, nutrition implies mouth
	"Ophthalmology": "eye",
	"ENT": "ear",
};

const getSpecialtyIcon = (specialty) => {
	// Simple matching
	for (const key in SPECIALTY_ICONS) {
		if (specialty.includes(key)) return SPECIALTY_ICONS[key];
	}
	return "medical";
};

export default function SpecialtySearchModal({
	visible,
	onClose,
	searchQuery,
	onSearchChange,
	specialties,
	onSelect
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		inputBg: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
		modalBg: isDarkMode ? "#121826" : "#FFFFFF",
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={onClose}
		>
			<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
				<View style={styles.modalOverlay}>
					<KeyboardAvoidingView 
						behavior={Platform.OS === "ios" ? "padding" : undefined} 
						style={{ width: "100%" }}
					>
						<View style={[styles.searchModalContent, { backgroundColor: colors.modalBg }]}>
							<View style={styles.modalHeader}>
								<Text style={[styles.modalTitle, { color: colors.text }]}>Search Specialty</Text>
								<Pressable onPress={onClose} style={styles.closeButton}>
									<Ionicons name="close" size={24} color={colors.text} />
								</Pressable>
							</View>
							
							<View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
								<Ionicons name="search" size={20} color={colors.textMuted} />
								<TextInput
									style={[styles.searchInput, { color: colors.text }]}
									placeholder="Cardiology, Dermatology..."
									placeholderTextColor={colors.textMuted}
									value={searchQuery}
									onChangeText={onSearchChange}
									autoFocus
								/>
							</View>

							<FlatList
								data={specialties}
								keyExtractor={item => item}
								renderItem={({ item }) => (
									<Pressable onPress={() => onSelect(item)} style={styles.modalListItem}>
										<View style={styles.specialtyRow}>
											<View style={[styles.iconBox, { backgroundColor: COLORS.brandPrimary + '15' }]}>
												<Ionicons name={getSpecialtyIcon(item)} size={20} color={COLORS.brandPrimary} />
											</View>
											<Text style={[styles.listTitle, { color: colors.text }]}>{item}</Text>
										</View>
										<Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
									</Pressable>
								)}
								contentContainerStyle={{ paddingBottom: 20 }}
								keyboardShouldPersistTaps="handled"
							/>
						</View>
					</KeyboardAvoidingView>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modalOverlay: { 
		flex: 1, 
		backgroundColor: "rgba(0,0,0,0.5)", 
		justifyContent: "flex-end" 
	},
	searchModalContent: { 
		maxHeight: "90%", 
		borderTopLeftRadius: 24, 
		borderTopRightRadius: 24, 
		padding: 20 
	},
	modalHeader: { 
		flexDirection: "row", 
		justifyContent: "space-between", 
		alignItems: "center", 
		marginBottom: 20 
	},
	modalTitle: { 
		fontSize: 20, 
		fontWeight: "800" 
	},
	closeButton: { 
		padding: 4 
	},
	searchBar: { 
		flexDirection: "row", 
		alignItems: "center", 
		gap: 10, 
		padding: 12, 
		borderRadius: 12, 
		marginBottom: 20 
	},
	searchInput: { 
		flex: 1, 
		fontSize: 16, 
		fontWeight: "500" 
	},
	modalListItem: { 
		paddingVertical: 12, 
		borderBottomWidth: 1, 
		borderBottomColor: "rgba(150,150,150,0.1)", 
		flexDirection: "row", 
		justifyContent: "space-between",
		alignItems: "center"
	},
	specialtyRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	iconBox: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	listTitle: { 
		fontSize: 16, 
		fontWeight: "500" 
	},
});
