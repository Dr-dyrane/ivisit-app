import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusIndicator from "../../ui/StatusIndicator";
import { COLORS } from "../../../constants/colors";

export default function AmbulanceTypeCard({ type, selected, onPress, textColor, mutedColor, cardColor }) {
	const backgroundColor = selected ? `${COLORS.brandPrimary}15` : cardColor;
	const borderColor = selected ? COLORS.brandPrimary : "transparent";
	const iconColor = selected ? COLORS.brandPrimary : textColor;

	const features = useMemo(() => (Array.isArray(type?.features) ? type.features : []), [type?.features]);

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.card,
				{
					backgroundColor,
					borderColor,
					opacity: pressed ? 0.85 : 1,
				},
			]}
		>
			<View style={styles.headerRow}>
				<Ionicons name={type.icon} size={24} color={iconColor} />
				<View style={styles.headerText}>
					<Text style={[styles.name, { color: textColor }]}>{type.name}</Text>
					<Text style={[styles.price, { color: COLORS.brandPrimary }]}>{type.price}</Text>
				</View>
				<StatusIndicator status="available" text={type.eta} size="small" />
			</View>

			<Text style={[styles.description, { color: mutedColor }]}>{type.description}</Text>

			<View style={styles.featuresList}>
				{features.map((feature, index) => (
					<View key={`${type.id}-${index}`} style={styles.feature}>
						<Ionicons name="checkmark" size={12} color="#10B981" />
						<Text style={[styles.featureText, { color: mutedColor }]}>{feature}</Text>
					</View>
				))}
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: 16,
		borderRadius: 18,
		marginBottom: 12,
		borderWidth: 2,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	headerText: {
		flex: 1,
		marginLeft: 12,
	},
	name: {
		fontSize: 16,
		fontWeight: "800",
		letterSpacing: -0.2,
	},
	price: {
		fontSize: 13,
		fontWeight: "800",
		marginTop: 2,
		letterSpacing: 0.4,
	},
	description: {
		fontSize: 13,
		lineHeight: 18,
		marginBottom: 12,
	},
	featuresList: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	feature: {
		flexDirection: "row",
		alignItems: "center",
		marginRight: 14,
		marginBottom: 6,
	},
	featureText: {
		fontSize: 12,
		marginLeft: 6,
	},
});

