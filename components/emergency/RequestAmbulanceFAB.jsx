import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function RequestAmbulanceFAB({ 
	onPress, 
	isLoading, 
	isActive, 
	selectedAmbulanceType,
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
		if (isLoading) return "Requesting...";
		if (selectedAmbulanceType) return `Request ${selectedAmbulanceType.name || selectedAmbulanceType.title}`;
		return "Select Ambulance";
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
					isLoading && styles.fabLoading
				]}
				disabled={isLoading || !isActive}
			>
				<Animated.View style={[styles.fabContent, { transform: [{ scale: scaleAnim }] }]}>
					{isLoading ? (
						<Ionicons name="hourglass-outline" size={24} color="#FFFFFF" />
					) : (
						<Ionicons name="medical" size={24} color="#FFFFFF" />
					)}
				</Animated.View>
			</TouchableOpacity>
			
			{/* Enhanced label */}
			<View style={styles.labelContainer}>
				<Text style={styles.labelText}>
					{getButtonText()}
				</Text>
				{!isLoading && isActive && (
					<Text style={styles.subLabelText}>
						Tap to confirm
					</Text>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		bottom: 40,
		right: 24,
		zIndex: 3000, // Even higher z-index
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
	fabLoading: {
		backgroundColor: COLORS.textMuted,
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
		fontWeight: '600',
		color: '#64748B',
		textAlign: 'right',
		marginTop: 3,
		letterSpacing: -0.2,
	},
});
