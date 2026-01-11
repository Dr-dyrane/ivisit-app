import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function RequestAmbulanceFAB({ 
	onPress, 
	isLoading, 
	isActive, 
	selectedAmbulanceType,
	mode = "request", // "request" or "dispatched"
	requestData,
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
		if (isLoading) return mode === "dispatched" ? "Tracking..." : "Requesting...";
		if (mode === "dispatched") return "Track Ambulance";
		if (selectedAmbulanceType) {
			const name = selectedAmbulanceType?.name || selectedAmbulanceType?.title || "Ambulance";
			return `Request ${String(name)}`;
		}
		return "Select Ambulance";
	};

	const getSubText = () => {
		if (mode === "dispatched") return "View live tracking";
		if (isLoading) return "";
		return "Tap to confirm";
	};

	const getIcon = () => {
		if (isLoading) return "refresh"; // Spinner icon
		if (mode === "dispatched") return "location";
		return "medical";
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
					mode === "dispatched" && styles.fabDispatched
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
		bottom: 60, // Moved 5% higher (from 40 to 60)
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
	fabDispatched: {
		backgroundColor: COLORS.brandPrimary, // Use brand primary instead of green
		shadowColor: COLORS.brandPrimary,
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
