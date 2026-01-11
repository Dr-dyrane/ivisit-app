import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';

export default function RequestBedFAB({ 
	onPress, 
	isLoading, 
	isActive = true, // Bed booking is always active once options are selected
	bedType,
	bedCount,
	style 
}) {
	const [scaleAnim] = useState(new Animated.Value(1));

	const handlePressIn = () => {
		Animated.spring(scaleAnim, {
			toValue: 0.95,
			useNativeDriver: true,
		}).start();
	};

	const handlePressOut = () => {
		Animated.spring(scaleAnim, {
			toValue: 1,
			useNativeDriver: true,
		}).start();
	};

	const handlePress = () => {
		if (!isLoading && onPress) {
			onPress();
		}
	};

	const getButtonText = () => {
		if (isLoading) return "Reserving...";
		if (bedCount > 1) return `Reserve ${bedCount} Beds`;
		return "Reserve Bed";
	};

	const getSubText = () => {
		if (isLoading) return "";
		if (bedType === "private") return "Private room selected";
		return "Standard bed selected";
	};

	const getIcon = () => {
		if (isLoading) return "refresh"; // Spinner icon
		return "bed"; // Bed icon for booking
	};

	return (
		<View style={[styles.container, style]}>
			<TouchableOpacity
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onPress={handlePress}
				activeOpacity={0.8}
				style={[
					styles.fab,
					isActive && styles.fabActive,
					// Always use booking style (no dispatched mode for bed booking)
					styles.fabBooking
				]}
				disabled={isLoading || !isActive}
			>
				<Animated.View style={[styles.fabContent, { transform: [{ scale: scaleAnim }] }]}>
					{isLoading ? (
						<ActivityIndicator size="small" color="#FFFFFF" />
					) : (
						<Ionicons 
							name={getIcon()} 
							size={24} 
							color="#FFFFFF" 
						/>
					)}
				</Animated.View>
			</TouchableOpacity>
			
			{/* Enhanced label */}
			<View style={styles.labelContainer}>
				<Text style={styles.labelText}>
					{getButtonText()}
				</Text>
				{getSubText() && (
					<Text style={styles.subLabelText}>
						{getSubText()}
					</Text>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		bottom: 40, // Lowered from 60
		right: 24,
		zIndex: 3000, // Same z-index for consistency
		alignItems: 'flex-end',
	},
	fab: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: COLORS.brandPrimary,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 20,
		shadowColor: COLORS.brandPrimary,
		shadowOffset: {
			width: 0,
			height: 10,
		},
		shadowOpacity: 0.5,
		shadowRadius: 20,
		marginBottom: 12,
	},
	fabActive: {
		backgroundColor: COLORS.brandPrimary,
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.6,
		transform: [{ scale: 1.05 }],
	},
	fabBooking: {
		// Bed booking specific styling - same as ambulance for consistency
		backgroundColor: COLORS.brandPrimary,
		shadowColor: COLORS.brandPrimary,
	},
	fabContent: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	labelContainer: {
		alignItems: 'flex-end',
		minWidth: 120,
	},
	labelText: {
		fontSize: 15,
		fontWeight: '800',
		color: COLORS.brandPrimary,
		textAlign: 'right',
		letterSpacing: -0.3,
	},
	subLabelText: {
		fontSize: 12,
		fontWeight: '400', // Reduced from 600
		color: '#64748B',
		textAlign: 'right',
		marginTop: 3,
		letterSpacing: -0.2,
	},
});
