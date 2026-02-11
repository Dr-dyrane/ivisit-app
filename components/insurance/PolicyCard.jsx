import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
	if (UIManager.setLayoutAnimationEnabledExperimental) {
		UIManager.setLayoutAnimationEnabledExperimental(true);
	}
}

const PolicyCard = ({ policy, isDarkMode, onEdit, onDelete, onSetDefault, onLinkPayment }) => {
	const [unmasked, setUnmasked] = useState(false);
	const [selected, setSelected] = useState(false);
	const [holdTimer, setHoldTimer] = useState(null);
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
	const isDefault = policy.is_default;

	const handlePress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setUnmasked(!unmasked);
	};

	const handlePressIn = () => {
		const timer = setTimeout(() => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setSelected(!selected);
		}, 500);
		setHoldTimer(timer);
	};

	const handlePressOut = () => {
		if (holdTimer) {
			clearTimeout(holdTimer);
			setHoldTimer(null);
		}
	};

	// Auto-select if it is default (visual cue)
	useEffect(() => {
		if (isDefault) {
			// Optional: maybe distinct style for default?
		}
	}, [isDefault]);

	return (
		<TouchableOpacity
			activeOpacity={0.9}
			onPress={handlePress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[
				styles.policyCard,
				{
					backgroundColor: isDarkMode ? "#0B0F1A" : "#FFFFFF",
					shadowColor: isDefault ? COLORS.brandPrimary : unmasked ? COLORS.brandPrimary : selected ? COLORS.brandPrimary : "#000",
					shadowOpacity: isDefault ? 0.15 : unmasked ? 0.2 : selected ? 0.3 : 0.08,
					borderColor: isDefault ? COLORS.brandPrimary : unmasked ? COLORS.brandPrimary + "40" : selected ? COLORS.brandPrimary + "60" : "transparent",
					borderWidth: (isDefault || unmasked || selected) ? 1.5 : 0,
					transform: [{ scale: selected ? 0.98 : 1 }]
				},
			]}
		>
			{/* Corner Seal - Default Indicator */}
			{isDefault && (
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

			<View style={styles.cardHeader}>
				<View style={styles.providerInfo}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
						<Text
							style={[styles.editorialSubtitle, { color: COLORS.brandPrimary }]}
						>
							PROVIDER
						</Text>
						{isDefault && (
							<View style={{ backgroundColor: COLORS.brandPrimary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
								<Text style={{ fontSize: 9, fontWeight: '800', color: COLORS.brandPrimary }}>DEFAULT</Text>
							</View>
						)}
					</View>
					<Text style={[styles.providerName, { color: textColor }]}>
						{policy.provider_name}
					</Text>
				</View>
				<View
					style={[
						styles.iconBox,
						{ backgroundColor: COLORS.brandPrimary + "15" },
					]}
				>
					<Ionicons
						name={unmasked ? "eye-off" : "shield-checkmark"}
						size={22}
						color={COLORS.brandPrimary}
					/>
				</View>
			</View>

			<View
				style={[
					styles.dataWidget,
					{
						backgroundColor: isDarkMode
							? "rgba(255,255,255,0.03)"
							: "rgba(0,0,0,0.02)",
					},
				]}
			>
				<View>
					<Text style={[styles.editorialSubtitle, { color: mutedColor }]}>
						POLICY NUMBER
					</Text>
					<Text style={[styles.policyNumber, { color: textColor }]}>
						{unmasked
							? policy.policy_number
							: `•••• •••• ${policy.policy_number.slice(-4)}`}
					</Text>
				</View>

				{unmasked && policy.group_number && (
					<View style={{ marginTop: 16 }}>
						<Text style={[styles.editorialSubtitle, { color: mutedColor }]}>
							GROUP
						</Text>
						<Text style={[styles.groupNumber, { color: textColor }]}>
							{policy.group_number}
						</Text>
					</View>
				)}

				{/* Linked Payment Method */}
				{policy.linked_payment_method && (
					<View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
						<Ionicons name="card" size={16} color={mutedColor} />
						<Text style={{ fontSize: 13, fontWeight: '600', color: textColor }}>
							{policy.linked_payment_method.brand} •••• {policy.linked_payment_method.last4}
						</Text>
						<Text style={{ fontSize: 11, color: mutedColor }}>
							(Exp: {policy.linked_payment_method.expiry})
						</Text>
					</View>
				)}
			</View>

			{/* Hint Text */}
			{!unmasked && !selected && (
				<Text style={[styles.hintText, { color: mutedColor }]}>
					Tap to reveal • Hold to select
				</Text>
			)}

			{!unmasked ? (
				<Text style={[styles.hintText, { color: mutedColor }]}>
					Tap to reveal details
				</Text>
			) : (
				<View style={{ gap: 12, marginTop: 24 }}>
					<View style={{ flexDirection: "row", gap: 12 }}>
						{/* Make Default Button */}
						{!isDefault && (
							<TouchableOpacity
								onPress={() => onSetDefault(policy.id)}
								style={{
									flex: 1,
									height: 44,
									borderRadius: 14,
									backgroundColor: COLORS.brandPrimary + '15',
									alignItems: "center",
									justifyContent: "center",
									borderWidth: 1,
									borderColor: COLORS.brandPrimary + '30',
								}}
							>
								<Text style={{ fontWeight: "800", color: COLORS.brandPrimary, fontSize: 12 }}>Make Default</Text>
							</TouchableOpacity>
						)}

						{/* Link Payment Button */}
						<TouchableOpacity
							onPress={() => onLinkPayment(policy)}
							style={{
								flex: 1,
								height: 44,
								borderRadius: 14,
								backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
								<Ionicons name="checkmark-circle" size={14} color={textColor} />
								<Text style={{ fontWeight: "700", color: textColor, fontSize: 12 }}>
									{policy.linked_payment_method ? "Update Card" : "Link Payment"}
								</Text>
							</View>
						</TouchableOpacity>
					</View>

					<View style={{ flexDirection: "row", gap: 12 }}>
						<TouchableOpacity
							onPress={() => onEdit(policy)}
							style={{
								flex: 1,
								height: 44,
								borderRadius: 14,
								backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Text style={{ fontWeight: "700", color: textColor }}>Edit</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => onDelete(policy.id, isDefault)}
							style={{
								flex: 1,
								height: 44,
								borderRadius: 14,
								backgroundColor: isDefault ? "rgba(255,255,255,0.05)" : "rgba(239, 68, 68, 0.1)",
								alignItems: "center",
								justifyContent: "center",
								opacity: isDefault ? 0.5 : 1
							}}
							disabled={isDefault}
						>
							<Text style={{ fontWeight: "700", color: isDefault ? mutedColor : COLORS.error }}>
								{isDefault ? "Active" : "Remove"}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	policyCard: {
		borderRadius: 24,
		padding: 24,
		marginBottom: 16,
		shadowOffset: { width: 0, height: 8 },
		shadowRadius: 16,
	},
	cornerSeal: {
		position: 'absolute',
		top: -8,
		right: -8,
		zIndex: 10,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 24,
	},
	providerInfo: {
		flex: 1,
		marginRight: 16,
	},
	editorialSubtitle: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1.5,
		textTransform: "uppercase",
	},
	providerName: {
		fontSize: 20,
		fontWeight: "900",
		letterSpacing: -0.5,
		lineHeight: 26,
	},
	iconBox: {
		width: 48,
		height: 48,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	dataWidget: {
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
	},
	policyNumber: {
		fontSize: 18,
		fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
		fontWeight: "700",
		letterSpacing: -0.5,
		marginTop: 4,
	},
	groupNumber: {
		fontSize: 16,
		fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
		fontWeight: "600",
		letterSpacing: -0.5,
		marginTop: 4,
	},
	hintText: {
		fontSize: 12,
		fontWeight: "500",
		textAlign: "center",
		opacity: 0.7,
	},
});

export default PolicyCard;
