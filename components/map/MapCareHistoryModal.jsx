import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import useResponsiveSurfaceMetrics from "../../hooks/ui/useResponsiveSurfaceMetrics";
import MapModalShell from "./surfaces/MapModalShell";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

function CareBlade({
	colors,
	iconName,
	title,
	subtext,
	onPress,
	titleColor,
	mutedColor,
	responsiveStyles,
}) {
	return (
		<Pressable onPress={onPress} style={[styles.careBlade, responsiveStyles.careBlade]}>
			<LinearGradient
				colors={colors}
				start={{ x: 0.18, y: 0.18 }}
				end={{ x: 0.82, y: 0.9 }}
				style={[styles.bladeIconWrap, responsiveStyles.bladeIconWrap]}
			>
				<MaterialCommunityIcons name={iconName} size={24} color="#FFFFFF" />
			</LinearGradient>
			<View style={styles.bladeCopy}>
				<Text style={[styles.bladeTitle, responsiveStyles.bladeTitle, { color: titleColor }]}>
					{title}
				</Text>
				{subtext ? (
					<Text
						style={[
							styles.bladeSubtext,
							responsiveStyles.bladeSubtext,
							{ color: mutedColor },
						]}
					>
						{subtext}
					</Text>
				) : null}
			</View>
			<Ionicons name="chevron-forward" size={18} color={mutedColor} />
		</Pressable>
	);
}

export default function MapCareHistoryModal({
	visible,
	onClose,
	onChooseCare,
	onBookVisit,
}) {
	const { isDarkMode } = useTheme();
	const viewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "modal" });

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const bladeSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
	const responsiveStyles = useMemo(() => {
		const bladeIconSize = Math.max(42, Math.round(viewportMetrics.radius.card * 1.7));
		return {
			content: {
				paddingBottom: Math.max(12, viewportMetrics.insets.sectionGap),
				gap: viewportMetrics.insets.largeGap,
			},
			bladeStack: {
				gap: viewportMetrics.insets.sectionGap,
			},
			careBlade: {
				paddingHorizontal: Math.max(14, viewportMetrics.modal.contentPadding - 4),
				paddingVertical: Math.max(13, viewportMetrics.insets.sectionGap),
				gap: Math.max(12, Math.round(viewportMetrics.insets.sectionGap * 0.92)),
			},
			bladeIconWrap: {
				width: bladeIconSize,
				height: bladeIconSize,
				borderRadius: Math.round(bladeIconSize / 2),
			},
			bladeTitle: {
				fontSize: Math.max(16, viewportMetrics.type.title - 1),
				lineHeight: Math.max(20, viewportMetrics.type.titleLineHeight - 2),
			},
			bladeSubtext: {
				marginTop: 3,
				fontSize: viewportMetrics.type.caption,
				lineHeight: viewportMetrics.type.captionLineHeight,
			},
		};
	}, [viewportMetrics]);

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title="Choose care"
			headerLayout="leading"
			minHeightRatio={0.78}
			contentContainerStyle={[styles.content, responsiveStyles.content]}
		>
			<View style={[styles.bladeStack, responsiveStyles.bladeStack]}>
				{[
					{
						colors: ["#F97316", "#DC2626"],
						iconName: "ambulance",
						title: "Ambulance",
						subtext: "Fast transport nearby",
						onPress: () => onChooseCare?.("ambulance"),
					},
					{
						colors: ["#38BDF8", "#2563EB"],
						iconName: "bed",
						title: "Bed space",
						subtext: "Available beds nearby",
						onPress: () => onChooseCare?.("bed"),
					},
					{
						colors: ["#14B8A6", "#0F766E"],
						iconName: "hospital-box",
						title: "Ambulance + bed",
						subtext: "Transport and admission",
						onPress: () => onChooseCare?.("both"),
					},
					{
						colors: ["#F59E0B", "#EA580C"],
						iconName: "calendar-check",
						title: "Book a visit",
						subtext: "Clinic or telehealth care",
						onPress: () => onBookVisit?.(),
					},
				].map((item) => (
					<View
						key={item.title}
						style={[
							styles.bladeSurface,
							{
								backgroundColor: bladeSurface,
								borderRadius: viewportMetrics.radius.card,
							},
						]}
					>
						<CareBlade
							{...item}
							titleColor={titleColor}
							mutedColor={mutedColor}
							responsiveStyles={responsiveStyles}
						/>
					</View>
				))}
			</View>
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingTop: 0,
		paddingBottom: 12,
		gap: 18,
	},
	bladeStack: {
		gap: 12,
	},
	bladeSurface: {
		...squircle(28),
	},
	careBlade: {
		flexDirection: "row",
		alignItems: "center",
		...squircle(28),
	},
	bladeIconWrap: {
		alignItems: "center",
		justifyContent: "center",
	},
	bladeCopy: {
		flex: 1,
	},
	bladeTitle: {
		fontWeight: "800",
	},
	bladeSubtext: {
		fontWeight: "400",
	},
});
