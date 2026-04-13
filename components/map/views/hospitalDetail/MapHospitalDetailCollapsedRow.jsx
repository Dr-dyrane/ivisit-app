import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import styles from "./mapHospitalDetailStage.styles";

export default function MapHospitalDetailCollapsedRow({
	action,
	title,
	subtitle,
	onExpand,
	onClose,
	titleColor,
	mutedColor,
	iconSurfaceColor,
}) {
	return (
		<View style={styles.collapsedRow}>
			<Pressable
				onPress={action.onPress}
				accessibilityLabel={action.accessibilityLabel}
				style={[styles.collapsedIconButton, { backgroundColor: iconSurfaceColor }]}
			>
				{action.iconType === "material" ? (
					<MaterialCommunityIcons name={action.icon} size={18} color={titleColor} />
				) : (
					<Ionicons name={action.icon} size={16} color={titleColor} />
				)}
			</Pressable>

			<Pressable onPress={onExpand} style={styles.collapsedSummaryPressable}>
				<View style={styles.collapsedSummaryCard}>
					<Text numberOfLines={1} style={[styles.collapsedTitle, { color: titleColor }]}>
						{title}
					</Text>
					<Text numberOfLines={1} style={[styles.collapsedSubtitle, { color: mutedColor }]}>
						{subtitle}
					</Text>
				</View>
			</Pressable>

			<Pressable
				onPress={onClose}
				style={[styles.collapsedIconButton, { backgroundColor: iconSurfaceColor }]}
			>
				<Ionicons name="close" size={18} color={titleColor} />
			</Pressable>
		</View>
	);
}
