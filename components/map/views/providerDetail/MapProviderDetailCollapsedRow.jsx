// components/map/views/providerDetail/MapProviderDetailCollapsedRow.jsx
//
// Collapsed row for PROVIDER_DETAIL sheet phase.
// Pixel-exact mirror of MapHospitalDetailCollapsedRow:
//   [action button] [summary pressable — name + distance] [close button]

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import styles from "./mapProviderDetailStage.styles";

export default function MapProviderDetailCollapsedRow({
	action,
	title,
	subtitle,
	onExpand,
	onClose,
	titleColor,
	mutedColor,
	iconSurfaceColor,
	tintColor = "#64748B",
}) {
	const iconGlassColors = [iconSurfaceColor, iconSurfaceColor];
	const actionColors    = action?.primary
		? [`${tintColor}B8`, `${tintColor}E8`]
		: iconGlassColors;
	const actionIconColor = action?.primary ? "#F8FAFC" : titleColor;

	function ActionIcon() {
		if (!action) return <Ionicons name="chevron-forward" size={17} color={titleColor} />;
		if (action.iconType === "material") {
			return <MaterialCommunityIcons name={action.icon} size={17} color={actionIconColor} />;
		}
		return <Ionicons name={action.icon ?? "chevron-forward"} size={17} color={actionIconColor} />;
	}

	return (
		<View style={styles.collapsedRow}>
			{/* Leading action button */}
			<Pressable
				onPress={action?.onPress}
				accessibilityLabel={action?.accessibilityLabel ?? "Provider action"}
				accessibilityRole="button"
				style={styles.collapsedIconButtonPressable}
			>
				{({ pressed }) => (
					<LinearGradient
						colors={actionColors}
						start={{ x: 0.12, y: 0.06 }}
						end={{ x: 0.88, y: 0.94 }}
						style={[
							styles.collapsedIconButton,
							action?.primary ? styles.collapsedIconButtonPrimary : null,
							pressed ? styles.collapsedIconButtonPressed : null,
						]}
					>
						<ActionIcon />
					</LinearGradient>
				)}
			</Pressable>

			{/* Summary pressable */}
			<Pressable onPress={onExpand} style={styles.collapsedSummaryPressable}>
				<View style={styles.collapsedSummaryCard}>
					<Text numberOfLines={1} style={[styles.collapsedTitle, { color: titleColor }]}>
						{title}
					</Text>
					{subtitle ? (
						<Text numberOfLines={1} style={[styles.collapsedSubtitle, { color: mutedColor }]}>
							{subtitle}
						</Text>
					) : null}
				</View>
			</Pressable>

			{/* Close button */}
			<Pressable
				onPress={onClose}
				accessibilityRole="button"
				accessibilityLabel="Close provider details"
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
						<Ionicons name="close" size={17} color={titleColor} />
					</LinearGradient>
				)}
			</Pressable>
		</View>
	);
}
