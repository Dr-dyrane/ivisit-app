import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useVisits } from "../../contexts/VisitsContext";
import useResponsiveSurfaceMetrics from "../../hooks/ui/useResponsiveSurfaceMetrics";
import { navigateToVisits } from "../../utils/navigationHelpers";
import MapModalShell from "./surfaces/MapModalShell";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

function formatVisitSupport(visit) {
	const hospital = visit?.hospital || visit?.hospitalName || "iVisit care";
	const date = typeof visit?.date === "string" ? visit.date : "";
	const time = typeof visit?.time === "string" ? visit.time : "";
	return [hospital, date, time].filter(Boolean).join(" | ");
}

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
}) {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const viewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "modal" });
	const { visits = [] } = useVisits();
	const recentVisits = useMemo(() => (Array.isArray(visits) ? visits.slice(0, 3) : []), [visits]);
	const hasVisits = recentVisits.length > 0;

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const bladeSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
	const responsiveStyles = useMemo(() => {
		const bladeIconSize = Math.max(42, Math.round(viewportMetrics.radius.card * 1.7));
		const visitIconSize = Math.max(36, Math.round(viewportMetrics.radius.card * 1.48));
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
			recentSection: {
				marginTop: Math.max(8, viewportMetrics.insets.sectionGap - 4),
			},
			recentHeader: {
				marginBottom: Math.max(10, viewportMetrics.insets.sectionGap - 2),
			},
			recentTitle: {
				fontSize: Math.max(16, viewportMetrics.type.title),
				lineHeight: viewportMetrics.type.titleLineHeight,
			},
			recentAction: {
				fontSize: viewportMetrics.type.caption,
				lineHeight: viewportMetrics.type.captionLineHeight,
			},
			visitCard: {
				paddingHorizontal: Math.max(14, viewportMetrics.modal.contentPadding - 2),
				paddingVertical: Math.max(14, viewportMetrics.insets.sectionGap),
				gap: Math.max(10, viewportMetrics.insets.sectionGap - 2),
				marginBottom: Math.max(8, viewportMetrics.insets.sectionGap - 2),
			},
			visitIconWrap: {
				width: visitIconSize,
				height: visitIconSize,
				borderRadius: Math.round(visitIconSize / 2),
			},
			visitTitle: {
				fontSize: Math.max(15, viewportMetrics.type.body),
				lineHeight: Math.max(20, viewportMetrics.type.bodyLineHeight - 4),
			},
			visitMeta: {
				marginTop: 4,
				fontSize: viewportMetrics.type.caption,
				lineHeight: Math.max(17, viewportMetrics.type.captionLineHeight + 1),
			},
		};
	}, [viewportMetrics]);

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title="Choose care"
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

			{hasVisits ? (
				<View style={[styles.recentSection, responsiveStyles.recentSection]}>
					<View style={[styles.recentHeader, responsiveStyles.recentHeader]}>
						<Text
							style={[
								styles.recentTitle,
								responsiveStyles.recentTitle,
								{ color: titleColor },
							]}
						>
							Recent visits
						</Text>
						<Pressable
							onPress={() => {
								onClose();
								navigateToVisits({ router });
							}}
						>
							<Text
								style={[
									styles.recentAction,
									responsiveStyles.recentAction,
									{ color: mutedColor },
								]}
							>
								See more
							</Text>
						</Pressable>
					</View>

					{recentVisits.map((visit, index) => (
						<View
							key={visit?.id || `${visit?.hospital || "visit"}-${index}`}
							style={[
								styles.visitCard,
								responsiveStyles.visitCard,
								{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.06)"
										: "rgba(15,23,42,0.04)",
									borderRadius: viewportMetrics.radius.card,
								},
							]}
						>
							<View style={[styles.visitIconWrap, responsiveStyles.visitIconWrap]}>
								<Ionicons name="time-outline" size={18} color="#86100E" />
							</View>
							<View style={styles.visitCopy}>
								<Text
									numberOfLines={1}
									style={[styles.visitTitle, responsiveStyles.visitTitle, { color: titleColor }]}
								>
									{visit?.type || "Care visit"}
								</Text>
								<Text
									numberOfLines={2}
									style={[styles.visitMeta, responsiveStyles.visitMeta, { color: bodyColor }]}
								>
									{formatVisitSupport(visit)}
								</Text>
							</View>
						</View>
					))}
				</View>
			) : null}
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
	recentSection: {
		marginTop: 8,
	},
	recentHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	recentTitle: {
		fontWeight: "800",
	},
	recentAction: {
		fontWeight: "700",
	},
	visitCard: {
		flexDirection: "row",
		alignItems: "center",
		...squircle(26),
	},
	visitIconWrap: {
		backgroundColor: "rgba(134, 16, 14, 0.10)",
		alignItems: "center",
		justifyContent: "center",
	},
	visitCopy: {
		flex: 1,
	},
	visitTitle: {
		fontWeight: "800",
	},
	visitMeta: {
		fontWeight: "400",
	},
});
