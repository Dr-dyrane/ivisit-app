import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";

export default function BedBookingOptions({
	bedType,
	onBedTypeChange,
	bedCount,
	onBedCountChange,
	textColor,
	mutedColor,
	cardColor,
}) {
	return (
		<View style={{ width: "100%" }}>
			<Text style={[styles.label, { color: mutedColor }]}>Bed Type</Text>
			<View style={styles.row}>
				<TypeButton
					active={bedType === "standard"}
					label="Standard"
					icon="bed-patient"
					iconFamily="fontisto"
					onPress={() => onBedTypeChange("standard")}
					textColor={textColor}
					cardColor={cardColor}
				/>
				<TypeButton
					active={bedType === "private"}
					label="Private"
					icon="shield-checkmark-outline"
					onPress={() => onBedTypeChange("private")}
					textColor={textColor}
					cardColor={cardColor}
				/>
			</View>

			<Text style={[styles.label, { color: mutedColor, marginTop: 14 }]}>
				Beds
			</Text>
			<View style={[styles.counter, { backgroundColor: cardColor }]}>
				<Pressable
					onPress={() => onBedCountChange(Math.max(1, bedCount - 1))}
					style={({ pressed }) => [styles.counterBtn, { opacity: pressed ? 0.6 : 1 }]}
					hitSlop={10}
				>
					<Ionicons name="remove" size={18} color={COLORS.brandPrimary} />
				</Pressable>
				<Text style={[styles.counterValue, { color: textColor }]}>{bedCount}</Text>
				<Pressable
					onPress={() => onBedCountChange(Math.min(3, bedCount + 1))}
					style={({ pressed }) => [styles.counterBtn, { opacity: pressed ? 0.6 : 1 }]}
					hitSlop={10}
				>
					<Ionicons name="add" size={18} color={COLORS.brandPrimary} />
				</Pressable>
			</View>
		</View>
	);
}

function TypeButton({
	active,
	label,
	icon,
	iconFamily,
	onPress,
	textColor,
	cardColor,
}) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.typeButton,
				{
					backgroundColor: active ? `${COLORS.brandPrimary}15` : cardColor,
					borderColor: active ? COLORS.brandPrimary : "transparent",
					opacity: pressed ? 0.85 : 1,
				},
			]}
		>
			{iconFamily === "fontisto" ? (
				<Fontisto
					name={icon}
					size={16}
					color={active ? COLORS.brandPrimary : textColor}
				/>
			) : (
				<Ionicons
					name={icon}
					size={18}
					color={active ? COLORS.brandPrimary : textColor}
				/>
			)}
			<Text
				style={[
					styles.typeText,
					{ color: active ? COLORS.brandPrimary : textColor },
				]}
			>
				{label}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	label: {
		fontSize: 11,
		fontWeight: "900",
		letterSpacing: 1.6,
		textTransform: "uppercase",
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 10,
	},
	typeButton: {
		flexBasis: "47%",
		flexGrow: 1,
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginHorizontal: 4,
		borderWidth: 2,
		flexDirection: "row",
		alignItems: "center",
	},
	typeText: {
		marginLeft: 10,
		fontSize: 13,
		fontWeight: "900",
		letterSpacing: 0.4,
	},
	counter: {
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 10,
	},
	counterBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(134,16,14,0.08)",
	},
	counterValue: {
		fontSize: 18,
		fontWeight: "900",
		letterSpacing: -0.2,
	},
});
