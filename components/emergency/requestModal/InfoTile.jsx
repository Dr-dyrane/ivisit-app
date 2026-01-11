import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { COLORS } from '../../../constants/colors';

export default function InfoTile({ 
	label, 
	value, 
	textColor, 
	mutedColor, 
	cardColor, 
	valueColor,
	icon 
}) {
	const { isDarkMode } = useTheme();
	
	// Ensure value is always a string to prevent React rendering errors
	const safeValue = typeof value === 'object' ? JSON.stringify(value) : String(value || '');
	
	return (
		<View style={[
			styles.card, 
			{ 
				backgroundColor: cardColor,
				// Enhanced shadow system with multiple layers for depth
				shadowColor: isDarkMode ? '#000' : '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: isDarkMode ? 0.15 : 0.08,
				shadowRadius: 8,
				elevation: 3,
				// Add subtle border for definition
				borderWidth: 0.5,
				borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
			}
		]}>
			<View style={styles.labelRow}>
				{icon && (
					<Ionicons 
						name={icon} 
						size={12} 
						color={isDarkMode ? COLORS.textMutedDark : mutedColor} 
						style={styles.labelIcon}
					/>
				)}
				<Text style={[styles.label, { color: isDarkMode ? COLORS.textMutedDark : mutedColor }]}>
					{label}
				</Text>
			</View>
			<Text style={[styles.value, { color: valueColor ?? textColor }]} numberOfLines={1}>
				{safeValue}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		flexBasis: "47%",
		flexGrow: 1,
		borderRadius: 16, // Modern rounded corners
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginHorizontal: 2,
		marginBottom: 8,
		// Add subtle inner shadow effect for depth
		// iOS: inner shadow via border and shadow
		// Android: handled by elevation
	},
	labelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	labelIcon: {
		marginRight: 4,
	},
	label: {
		fontSize: 11, // Reduced from 12
		fontWeight: "600",
		letterSpacing: 0.2,
		opacity: 0.9,
	},
	value: {
		marginTop: 2, // Reduced from 8
		fontSize: 14, // Reduced from 15
		fontWeight: "700",
		letterSpacing: -0.1,
	},
});
