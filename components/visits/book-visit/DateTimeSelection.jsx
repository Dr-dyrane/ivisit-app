import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameDay } from "date-fns";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";
import { TIME_SLOTS } from "../../../hooks/visits/useBookVisit";

export default function DateTimeSelection({
	dates,
	selectedDate,
	selectedTime,
	onSelectDate,
	onSelectTime,
	onConfirm
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		cardBg: isDarkMode ? "#0B0F1A" : "#FFFFFF",
		selectedBg: isDarkMode ? COLORS.brandPrimary + "20" : COLORS.brandPrimary,
	};

	const cardStyle = {
		backgroundColor: colors.cardBg,
		borderRadius: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: isDarkMode ? 0 : 0.05,
		shadowRadius: 8,
		elevation: 2,
	};

	const selectedStyle = {
		backgroundColor: COLORS.brandPrimary,
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.3,
	};

	return (
		<View style={styles.container}>
			<Text style={[styles.title, { color: colors.text }]}>Select Date & Time</Text>
			
			<View style={{ marginBottom: 24 }}>
				<Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Date</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
					{dates.map((date, index) => {
						const isSelected = selectedDate && isSameDay(date, selectedDate);
						return (
							<Pressable key={index} onPress={() => onSelectDate(date)}>
								<View 
									style={[
										styles.dateCard, 
										cardStyle, 
										isSelected && selectedStyle
									]}
								>
									<Text style={[styles.dayName, { color: isSelected ? "#FFFFFF" : colors.textMuted }]}>
										{format(date, 'EEE')}
									</Text>
									<Text style={[styles.dayNumber, { color: isSelected ? "#FFFFFF" : colors.text }]}>
										{format(date, 'd')}
									</Text>
								</View>
							</Pressable>
						);
					})}
				</ScrollView>
			</View>

			<View style={{ flex: 1 }}>
				<Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Available Slots</Text>
				<FlatList
					data={TIME_SLOTS}
					numColumns={3}
					keyExtractor={item => item}
					columnWrapperStyle={{ gap: 10 }}
					contentContainerStyle={{ gap: 10 }}
					renderItem={({ item }) => {
						const isSelected = selectedTime === item;
						return (
							<Pressable onPress={() => onSelectTime(item)} style={{ flex: 1 }}>
								<View 
									style={[
										styles.timeSlot, 
										cardStyle, 
										isSelected && selectedStyle
									]}
								>
									<Text style={[styles.timeText, { color: isSelected ? "#FFFFFF" : colors.text }]}>
										{item}
									</Text>
								</View>
							</Pressable>
						);
					}}
				/>
			</View>

			<Pressable 
				onPress={onConfirm}
				style={({ pressed }) => [
					styles.primaryButton, 
					{ backgroundColor: COLORS.brandPrimary, opacity: (!selectedDate || !selectedTime) ? 0.5 : (pressed ? 0.9 : 1) }
				]}
				disabled={!selectedDate || !selectedTime}
			>
				<Text style={styles.primaryButtonText}>Continue</Text>
				<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
			</Pressable>
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
	sectionHeader: {
		fontSize: 14,
		fontWeight: "800",
		textTransform: "uppercase",
		letterSpacing: 1,
		marginBottom: 12,
	},
	dateCard: {
		width: 70,
		height: 80,
		alignItems: "center",
		justifyContent: "center",
	},
	dayName: {
		fontSize: 13,
		fontWeight: "500",
		textTransform: "uppercase",
		marginBottom: 4,
	},
	dayNumber: {
		fontSize: 20,
		fontWeight: "900",
	},
	timeSlot: {
		paddingVertical: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	timeText: {
		fontSize: 14,
		fontWeight: "700",
	},
	primaryButton: {
		flexDirection: "row",
		height: 56,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		marginTop: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "800",
	},
});
