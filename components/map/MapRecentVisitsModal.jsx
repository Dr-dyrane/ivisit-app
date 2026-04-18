import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

function formatVisitMeta(visit) {
	const hospital = visit?.hospital || visit?.hospitalName || "iVisit care";
	const date = typeof visit?.date === "string" ? visit.date : "";
	const time = typeof visit?.time === "string" ? visit.time : "";
	return [hospital, date, time].filter(Boolean).join(" | ");
}

export default function MapRecentVisitsModal({ visible, onClose }) {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const viewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "modal" });
	const { visits = [] } = useVisits();
	const recentVisits = useMemo(() => (Array.isArray(visits) ? visits.slice(0, 8) : []), [visits]);
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const cardSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";
	const responsiveStyles = useMemo(() => {
		const visitIconSize = Math.max(36, Math.round(viewportMetrics.radius.card * 1.48));
		return {
			content: {
				paddingBottom: Math.max(12, viewportMetrics.insets.sectionGap),
				gap: viewportMetrics.insets.sectionGap,
			},
			visitCard: {
				paddingHorizontal: Math.max(14, viewportMetrics.modal.contentPadding - 2),
				paddingVertical: Math.max(14, viewportMetrics.insets.sectionGap),
				gap: Math.max(10, viewportMetrics.insets.sectionGap - 2),
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
			moreAction: {
				marginTop: Math.max(6, viewportMetrics.insets.sectionGap - 6),
			},
			moreText: {
				fontSize: viewportMetrics.type.caption,
				lineHeight: viewportMetrics.type.captionLineHeight,
			},
			emptyCard: {
				paddingHorizontal: Math.max(18, viewportMetrics.modal.contentPadding),
				paddingVertical: Math.max(20, viewportMetrics.insets.largeGap),
			},
			emptyTitle: {
				fontSize: Math.max(15, viewportMetrics.type.body),
				lineHeight: Math.max(20, viewportMetrics.type.bodyLineHeight - 4),
			},
		};
	}, [viewportMetrics]);

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title="Recents"
			minHeightRatio={0.78}
			contentContainerStyle={[styles.content, responsiveStyles.content]}
		>
			{recentVisits.length > 0 ? (
				<>
					{recentVisits.map((visit, index) => (
						<View
							key={visit?.id || `${visit?.hospital || "visit"}-${index}`}
							style={[
								styles.visitCard,
								responsiveStyles.visitCard,
								{
									backgroundColor: cardSurface,
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
									style={[styles.visitMeta, responsiveStyles.visitMeta, { color: mutedColor }]}
								>
									{formatVisitMeta(visit)}
								</Text>
							</View>
						</View>
					))}
					<Pressable
						onPress={() => {
							onClose?.();
							navigateToVisits({ router });
						}}
						style={[styles.moreAction, responsiveStyles.moreAction]}
					>
						<Text style={[styles.moreText, responsiveStyles.moreText, { color: titleColor }]}>
							See more
						</Text>
						<Ionicons name="chevron-forward" size={16} color={titleColor} />
					</Pressable>
				</>
			) : (
				<View
					style={[
						styles.emptyCard,
						responsiveStyles.emptyCard,
						{
							backgroundColor: cardSurface,
							borderRadius: viewportMetrics.radius.card,
						},
					]}
				>
					<Text style={[styles.emptyTitle, responsiveStyles.emptyTitle, { color: titleColor }]}>
						No recent visits
					</Text>
				</View>
			)}
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingTop: 0,
		paddingBottom: 12,
		gap: 12,
	},
	visitCard: {
		flexDirection: "row",
		alignItems: "center",
		...squircle(28),
	},
	visitIconWrap: {
		backgroundColor: "rgba(134,16,14,0.10)",
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
	moreAction: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		gap: 6,
		paddingVertical: 4,
	},
	moreText: {
		fontWeight: "700",
	},
	emptyCard: {
		alignItems: "center",
		...squircle(28),
	},
	emptyTitle: {
		fontWeight: "400",
	},
});
