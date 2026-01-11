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
				// Remove border - use shadow/elevation for depth
				shadowColor: isDarkMode ? '#000' : '#000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: isDarkMode ? 0.3 : 0.1,
				shadowRadius: 2,
				elevation: 2,
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
		borderRadius: 16, // Reduced from 18
		paddingHorizontal: 12, // Reduced from 14
		paddingVertical: 10, // Reduced from 12
		marginHorizontal: 2, // Reduced from 4
		marginBottom: 8, // Reduced from 12
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
