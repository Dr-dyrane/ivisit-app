import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	LayoutAnimation,
    Platform,
    UIManager,
    Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const ContactCard = ({ contact, isDarkMode, onEdit, onDelete, isSelected, onToggleSelect }) => {
	const [unmasked, setUnmasked] = useState(false);
	const [selected, setSelected] = useState(false);
	const [holdTimer, setHoldTimer] = useState(null);
	const { colors } = useTheme();

	// Sync with external selection state
	useEffect(() => {
		setSelected(isSelected);
	}, [isSelected]);

	const handlePress = () => {
		if (selected) {
			// If selected, treat as normal tap to reveal
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setUnmasked(!unmasked);
		} else {
			// If not selected, treat as normal tap to reveal
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setUnmasked(!unmasked);
		}
	};

	const handlePressIn = () => {
		const timer = setTimeout(() => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setSelected(!selected);
			onToggleSelect(contact.id);
		}, 500);
		setHoldTimer(timer);
	};

	const handlePressOut = () => {
		if (holdTimer) {
			clearTimeout(holdTimer);
			setHoldTimer(null);
		}
	};

	return (
		<TouchableOpacity
			onPress={handlePress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			activeOpacity={0.9}
			style={[
				styles.contactCard,
				{
					backgroundColor: isDarkMode ? "#0B0F1A" : "#FFFFFF",
					shadowColor: unmasked ? COLORS.brandPrimary : selected ? COLORS.brandPrimary : "#000",
					shadowOpacity: unmasked ? 0.2 : selected ? 0.3 : 0.03,
					borderColor: unmasked ? COLORS.brandPrimary + '40' : selected ? COLORS.brandPrimary + '60' : 'transparent',
					borderWidth: (unmasked || selected) ? 1 : 0,
					transform: [{ scale: selected ? 0.98 : 1 }]
				},
			]}
		>
			{/* Corner Seal - Selection Indicator */}
			{selected && (
				<View style={styles.cornerSeal}>
					<Ionicons 
						name="checkmark-circle" 
						size={24} 
						color={COLORS.brandPrimary}
						style={{
							backgroundColor: '#FFFFFF',
							borderRadius: 12,
							padding: 2
						}}
					/>
				</View>
			)}

			{/* Identity Widget - Following manifesto spec */}
			<View style={styles.identityWidget}>
				<View style={[styles.iconContainer, { backgroundColor: COLORS.brandPrimary + '15' }]}>
					<Ionicons
						name="person"
						size={20}
						color={COLORS.brandPrimary}
					/>
				</View>
				<View style={styles.identityInfo}>
					<Text style={[styles.contactName, { color: isDarkMode ? "#FFFFFF" : "#0F172A" }]}>
						{contact?.name ?? "--"}
					</Text>
					<Text style={[styles.identityLabel, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
						{contact?.relationship || "Contact"}
					</Text>
				</View>
			</View>

			{/* Data Grid - Following manifesto spec */}
			<View style={styles.dataGrid}>
				{contact?.phone ? (
					<View style={styles.dataItem}>
						<Ionicons
							name="call"
							size={14}
							color={isDarkMode ? "#94A3B8" : "#64748B"}
						/>
						<Text style={[styles.dataValue, { color: isDarkMode ? "#FFFFFF" : "#0F172A" }]}>
							{unmasked 
								? contact.phone 
								: `•••• •••• ${contact.phone.slice(-4)}`}
						</Text>
					</View>
				) : null}
				{contact?.email ? (
					<View style={styles.dataItem}>
						<Ionicons
							name="mail"
							size={14}
							color={isDarkMode ? "#94A3B8" : "#64748B"}
						/>
						<Text style={[styles.dataValue, { color: isDarkMode ? "#FFFFFF" : "#0F172A" }]}>
							{unmasked 
								? contact.email 
								: `•••••@••••.com`}
						</Text>
					</View>
				) : null}
			</View>

			{/* Hint Text */}
			{!unmasked && !selected && (
				<Text style={[styles.hintText, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
					Tap to reveal • Hold to select
				</Text>
			)}

			{/* Actions Row (Only visible when expanded) */}
			{unmasked && (
				<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
					<TouchableOpacity
						onPress={() => onEdit(contact)}
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							gap: 8,
							paddingVertical: 8,
							paddingHorizontal: 16,
							borderRadius: 20,
							backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
						}}
					>
						<Ionicons name="pencil" size={16} color={isDarkMode ? "#FFFFFF" : "#0F172A"} />
						<Text style={{ fontWeight: "700", color: isDarkMode ? "#FFFFFF" : "#0F172A", fontSize: 14 }}>Edit</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => {
							Alert.alert(
								"Delete Contact",
								"Are you sure you want to delete this contact?",
								[
									{ text: "Cancel", style: "cancel" },
									{
										text: "Delete",
										style: "destructive",
										onPress: () => onDelete(contact.id)
									}
								]
							);
						}}
						style={{
							width: 44,
							height: 44,
							borderRadius: 22,
							backgroundColor: 'rgba(239, 68, 68, 0.1)',
							alignItems: 'center',
							justifyContent: 'center'
						}}
					>
						<Ionicons name="remove" size={24} color={COLORS.error} />
					</TouchableOpacity>
				</View>
			)}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	contactCard: {
		borderRadius: 36,
		padding: 24,
		position: "relative",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	identityWidget: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 16,
	},
	iconContainer: {
		width: 56,
		height: 56,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
	},
	identityInfo: {
		flex: 1,
	},
	contactName: { 
		fontSize: 19, 
		fontWeight: "900", 
		letterSpacing: -1.0 
	},
	identityLabel: { 
		fontSize: 10, 
		fontWeight: "800", 
		letterSpacing: 1.5,
		textTransform: "uppercase",
		marginTop: 4,
	},
	dataGrid: {
		gap: 8,
	},
	dataItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	dataValue: {
		fontSize: 15,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
	cornerSeal: {
		position: "absolute",
		bottom: -4,
		right: -4,
		width: 36,
		height: 36,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: '#FFFFFF',
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	hintText: {
		fontSize: 11,
		fontWeight: "600",
		textAlign: "center",
		marginTop: 16,
		opacity: 0.6,
		letterSpacing: 0.5,
	},
});

export default ContactCard;