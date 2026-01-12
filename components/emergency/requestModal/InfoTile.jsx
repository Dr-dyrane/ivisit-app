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
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 3 },
				shadowOpacity: isDarkMode ? 0.2 : 0.08,
				shadowRadius: 10,
				elevation: 4,
			}
		]}>
			<View style={styles.labelRow}>
				{icon && (
					<Ionicons 
						name={icon} 
						size={14} 
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
		flexBasis: "48%",
		flexGrow: 1,
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginHorizontal: 2,
		marginBottom: 8,
	},
	labelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 6,
	},
	labelIcon: {
		marginRight: 6,
	},
	label: {
		fontSize: 12,
		fontWeight: "700",
		letterSpacing: 0.2,
		opacity: 0.9,
	},
	value: {
		marginTop: 2,
		fontSize: 16,
		fontWeight: "800",
		letterSpacing: -0.2,
	},
});
