import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";

export default function EmergencyRequestModalFooter({
	visible,
	disabled,
	isLoading,
	onPress,
	backgroundColor,
	textColor,
	label = "REQUEST SERVICE",
	showHint = true,
}) {
	if (!visible) return null;

	return (
		<View style={[styles.container, { backgroundColor }]}>
			<Pressable
				onPress={onPress}
				disabled={disabled || isLoading}
				style={({ pressed }) => [
					styles.button,
					{
						backgroundColor: COLORS.brandPrimary,
						opacity: disabled || isLoading ? 0.55 : pressed ? 0.85 : 1,
					},
				]}
			>
				<Ionicons name="medical" size={20} color="#FFFFFF" />
				<Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
					{isLoading ? "REQUESTING..." : label}
				</Text>
			</Pressable>
			{showHint && (
				<Text style={[styles.hint, { color: textColor }]}>
					{disabled ? "Select an ambulance type to continue." : ""}
				</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 20,
		paddingTop: 10,
		paddingBottom: 18,
	},
	button: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 16,
		borderRadius: 18,
	},
	buttonText: {
		fontSize: 13,
		fontWeight: "900",
		letterSpacing: 1.8,
		marginLeft: 10,
	},
	hint: {
		marginTop: 10,
		fontSize: 12,
		fontWeight:'400',
		opacity: 0.8,
	},
});
