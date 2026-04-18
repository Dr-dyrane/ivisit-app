import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useVisits } from "../../contexts/VisitsContext";
import getViewportSurfaceMetrics from "../../utils/ui/viewportSurfaceMetrics";
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
	const { width, height } = useWindowDimensions();
	const viewportMetrics = useMemo(
		() =>
			getViewportSurfaceMetrics({
				width,
				height,
				platform: Platform.OS,
				presentationMode: "modal",
			}),
		[height, width],
	);
	const { visits = [] } = useVisits();
	const recentVisits = useMemo(() => (Array.isArray(visits) ? visits.slice(0, 8) : []), [visits]);
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const cardSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title="Recents"
			minHeightRatio={0.78}
			contentContainerStyle={[
				styles.content,
				{
					paddingBottom: Math.max(12, viewportMetrics.insets.sectionGap),
					gap: viewportMetrics.insets.sectionGap,
				},
			]}
		>
			{recentVisits.length > 0 ? (
				<>
					{recentVisits.map((visit, index) => (
						<View
							key={visit?.id || `${visit?.hospital || "visit"}-${index}`}
							style={[
								styles.visitCard,
								{
									backgroundColor: cardSurface,
									borderRadius: viewportMetrics.radius.card,
								},
							]}
						>
							<View style={styles.visitIconWrap}>
								<Ionicons name="time-outline" size={18} color="#86100E" />
							</View>
							<View style={styles.visitCopy}>
								<Text numberOfLines={1} style={[styles.visitTitle, { color: titleColor }]}>
									{visit?.type || "Care visit"}
								</Text>
								<Text numberOfLines={2} style={[styles.visitMeta, { color: mutedColor }]}>
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
						style={[styles.moreAction, { marginTop: Math.max(6, viewportMetrics.insets.sectionGap - 6) }]}
					>
						<Text style={[styles.moreText, { color: titleColor }]}>See more</Text>
						<Ionicons name="chevron-forward" size={16} color={titleColor} />
					</Pressable>
				</>
			) : (
				<View
					style={[
						styles.emptyCard,
						{
							backgroundColor: cardSurface,
							borderRadius: viewportMetrics.radius.card,
						},
					]}
				>
					<Text style={[styles.emptyTitle, { color: titleColor }]}>No recent visits</Text>
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
		paddingHorizontal: 16,
		paddingVertical: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		...squircle(28),
	},
	visitIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "rgba(134,16,14,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},
	visitCopy: {
		flex: 1,
	},
	visitTitle: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
	},
	visitMeta: {
		marginTop: 4,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "400",
	},
	moreAction: {
		marginTop: 6,
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		gap: 6,
		paddingVertical: 4,
	},
	moreText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
	},
	emptyCard: {
		paddingHorizontal: 18,
		paddingVertical: 22,
		alignItems: "center",
		...squircle(28),
	},
	emptyTitle: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "400",
	},
});
