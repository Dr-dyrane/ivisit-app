import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	LayoutAnimation,
    Platform,
    UIManager,
    Alert,
    Animated,
    ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import {
	getMiniProfileColors,
	getMiniProfileLayout,
	getMiniProfileTones,
} from "./miniProfile/miniProfile.model";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// SelectionToolbar - Reusable selection toolbar component
// PULLBACK NOTE: Extracted from EmergencyContactsScreen for reusability
// OLD: Inline toolbar in EmergencyContactsScreen
// NEW: Reusable SelectionToolbar component
// REASON: Modularize emergency contacts UI
export function SelectionToolbar({ selectedCount, onClear, onDelete, isDarkMode }) {
	const miniProfileColors = getMiniProfileColors(isDarkMode);

	return (
		<Animated.View
			style={{
				position: 'absolute',
				top: 72,
				left: 12,
				right: 12,
				zIndex: 1000,
				backgroundColor: isDarkMode ? '#0B0F1A' : '#FFFFFF',
				borderRadius: 24,
				padding: 16,
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				shadowColor: COLORS.brandPrimary,
				shadowOpacity: 0.15,
				shadowOffset: { width: 0, height: 8 },
				shadowRadius: 16,
				elevation: 8,
				borderColor: COLORS.brandPrimary + '40',
				borderWidth: 1,
			}}
		>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
				<Ionicons name="checkmark-circle" size={24} color={COLORS.brandPrimary} />
				<Text style={{ fontSize: 16, fontWeight: '800', color: isDarkMode ? '#FFFFFF' : '#0F172A' }}>
					{selectedCount} selected
				</Text>
			</View>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
				<TouchableOpacity
					onPress={onClear}
					style={{
						paddingHorizontal: 12,
						paddingVertical: 8,
						borderRadius: 16,
						backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
					}}
				>
					<Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#FFFFFF' : '#0F172A' }}>
						Clear
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={onDelete}
					style={{
						paddingHorizontal: 12,
						paddingVertical: 8,
						borderRadius: 16,
						backgroundColor: 'rgba(239, 68, 68, 0.1)',
					}}
				>
					<Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.error }}>
						Delete
					</Text>
				</TouchableOpacity>
			</View>
		</Animated.View>
	);
}

// ContactsLoadingState - Loading indicator for contacts
// PULLBACK NOTE: Extracted from EmergencyContactsScreen for reusability
// OLD: Inline loading state in EmergencyContactsScreen
// NEW: Reusable ContactsLoadingState component
// REASON: Modularize emergency contacts UI
export function ContactsLoadingState({ isDarkMode }) {
	const miniProfileColors = getMiniProfileColors(isDarkMode);

	return (
		<ContactGroup isDarkMode={isDarkMode}>
			<View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}>
				<ActivityIndicator color={COLORS.brandPrimary} />
				<Text style={{ color: miniProfileColors.muted, fontWeight: "500" }}>
					Loading contacts...
				</Text>
			</View>
		</ContactGroup>
	);
}

// ContactsEmptyState - Empty state for contacts
// PULLBACK NOTE: Extracted from EmergencyContactsScreen for reusability
// OLD: Inline empty state in EmergencyContactsScreen
// NEW: Reusable ContactsEmptyState component
// REASON: Modularize emergency contacts UI
export function ContactsEmptyState({ isDarkMode }) {
	const miniProfileColors = getMiniProfileColors(isDarkMode);

	return (
		<ContactGroup isDarkMode={isDarkMode}>
			<View style={{ padding: 16, alignItems: "center" }}>
				<Text style={{ color: miniProfileColors.text, fontWeight: "600", fontSize: 17 }}>
					No contacts yet
				</Text>
				<Text style={{ color: miniProfileColors.muted, fontWeight: "500", fontSize: 15, marginTop: 8 }}>
					Add at least one trusted contact
				</Text>
			</View>
		</ContactGroup>
	);
}

// ContactGroup - Groups ContactCard components in a shared container
// PULLBACK NOTE: Created to match mini profile grouping structure
// OLD: Each ContactCard was standalone with its own background
// NEW: Group container wraps multiple cards with shared background
// REASON: Apply mini profile doctrine to emergency contacts
export function ContactGroup({ children, isDarkMode, style }) {
	const miniProfileColors = getMiniProfileColors(isDarkMode);
	const layout = getMiniProfileLayout({});

	return (
		<View
			style={[
				{
					backgroundColor: miniProfileColors.card,
					borderRadius: layout.groups.radius,
					borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
					overflow: "hidden",
				},
				style,
			]}
		>
			{children}
		</View>
	);
}

const ContactCard = ({ contact, isDarkMode, onEdit, onDelete, isSelected, onToggleSelect, isLast = false }) => {
	const [unmasked, setUnmasked] = useState(false);
	const [selected, setSelected] = useState(false);
	const [holdTimer, setHoldTimer] = useState(null);
	const { colors } = useTheme();
	const miniProfileColors = getMiniProfileColors(isDarkMode);
	const miniProfileTones = getMiniProfileTones(isDarkMode);
	const layout = getMiniProfileLayout({});

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
					backgroundColor: "transparent",
					borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
					borderBottomColor: miniProfileColors.divider,
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