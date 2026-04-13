import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import styles from "./mapHospitalDetailStage.styles";

export default function MapHospitalDetailCollapsedRow({
	action,
	title,
	subtitle,
	onExpand,
	onClose,
	titleColor,
	mutedColor,
	isDarkMode,
	iconSurfaceColor,
	iconBorderColor,
}) {
	const iconGlassColors = isDarkMode
		? ["rgba(255,255,255,0.18)", "rgba(148,163,184,0.10)", iconSurfaceColor]
		: ["rgba(255,255,255,0.98)", "rgba(255,255,255,0.86)", iconSurfaceColor];

	return (
		<View style={styles.collapsedRow}>
			<Pressable
				onPress={action.onPress}
				accessibilityLabel={action.accessibilityLabel}
				accessibilityRole="button"
				style={styles.collapsedIconButtonPressable}
			>
				{({ pressed }) => (
					<LinearGradient
						colors={iconGlassColors}
						start={{ x: 0.12, y: 0.06 }}
						end={{ x: 0.88, y: 0.94 }}
						style={[
							styles.collapsedIconButton,
							pressed ? styles.collapsedIconButtonPressed : null,
						]}
					>
						{action.iconType === "material" ? (
							<MaterialCommunityIcons name={action.icon} size={18} color={titleColor} />
						) : (
							<Ionicons name={action.icon} size={16} color={titleColor} />
						)}
					</LinearGradient>
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
				accessibilityRole="button"
				accessibilityLabel="Close hospital details"
				style={styles.collapsedIconButtonPressable}
			>
				{({ pressed }) => (
					<LinearGradient
						colors={iconGlassColors}
						start={{ x: 0.12, y: 0.06 }}
						end={{ x: 0.88, y: 0.94 }}
						style={[
							styles.collapsedIconButton,
							pressed ? styles.collapsedIconButtonPressed : null,
						]}
					>
						<Ionicons name="close" size={18} color={titleColor} />
					</LinearGradient>
				)}
			</Pressable>
		</View>
	);
}
