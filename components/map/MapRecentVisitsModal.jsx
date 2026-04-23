import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useVisits } from "../../contexts/VisitsContext";
import useResponsiveSurfaceMetrics from "../../hooks/ui/useResponsiveSurfaceMetrics";
import {
	selectGroupedHistoryBuckets,
	selectHistoryCount,
} from "../../hooks/visits/useVisitHistorySelectors";
import MapModalShell from "./surfaces/MapModalShell";
import { resolveHistoryRowTone } from "./history/history.theme";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

const getItemIcon = (item) => {
	switch (item?.requestType) {
		case "ambulance":
			return { name: "ambulance", library: "material" };
		case "bed":
			return { name: "bed", library: "material" };
		default:
			return { name: "calendar", library: "ion" };
	}
};

// PULLBACK NOTE: status-tone tokens centralized in history.theme.js (F1)
// OLD: local getToneColors duplicated inline
// NEW: import { resolveHistoryRowTone } from "./history/history.theme"

function HistoryRow({
	item,
	onPress,
	titleColor,
	mutedColor,
	cardSurface,
	isDarkMode,
	responsiveStyles,
}) {
	const icon = getItemIcon(item);
	const toneColors = resolveHistoryRowTone(item?.statusTone, isDarkMode);

	return (
		<Pressable
			onPress={() => onPress?.(item)}
			style={[
				styles.rowCard,
				responsiveStyles.rowCard,
				{
					backgroundColor: cardSurface,
					borderRadius: responsiveStyles.cardRadius,
				},
			]}
		>
			<View
				style={[
					styles.rowIconWrap,
					responsiveStyles.rowIconWrap,
					{ backgroundColor: toneColors.orb },
				]}
			>
				{icon.library === "material" ? (
					<MaterialCommunityIcons name={icon.name} size={responsiveStyles.iconSize} color={toneColors.icon} />
				) : (
					<Ionicons name={icon.name} size={responsiveStyles.iconSize} color={toneColors.icon} />
				)}
			</View>

			<View style={styles.rowCopy}>
				<Text numberOfLines={1} style={[styles.rowTitle, responsiveStyles.rowTitle, { color: titleColor }]}>
					{item.title}
				</Text>
				<Text numberOfLines={2} style={[styles.rowSubtitle, responsiveStyles.rowSubtitle, { color: mutedColor }]}>
					{item.subtitle}
				</Text>
			</View>

			<View style={styles.rowMeta}>
				<View
					style={[
						styles.statusChip,
						{ backgroundColor: toneColors.chip },
					]}
				>
					<Text style={[styles.statusChipText, { color: toneColors.chipText }]}>
						{item.statusLabel}
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={16} color={mutedColor} />
			</View>
		</Pressable>
	);
}

export default function MapRecentVisitsModal({
	visible,
	onClose,
	onSelectVisit,
	onChooseCare,
}) {
	const { isDarkMode } = useTheme();
	const viewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "modal" });
	const { visits = [] } = useVisits();
	const groupedHistory = useMemo(() => selectGroupedHistoryBuckets(visits), [visits]);
	const historyCount = useMemo(() => selectHistoryCount(visits), [visits]);
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
	const cardSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";

	const responsiveStyles = useMemo(() => {
		const iconSize = Math.max(20, Math.round(viewportMetrics.type.body * 1.22));
		const orbSize = Math.max(42, Math.round(viewportMetrics.radius.card * 1.54));
		return {
			content: {
				paddingBottom: Math.max(12, viewportMetrics.insets.sectionGap),
				gap: viewportMetrics.insets.sectionGap,
			},
			section: {
				gap: Math.max(8, viewportMetrics.insets.sectionGap - 2),
			},
			sectionHeader: {
				paddingTop: Math.max(4, viewportMetrics.insets.sectionGap - 8),
			},
			sectionTitle: {
				fontSize: Math.max(14, viewportMetrics.type.caption + 1),
				lineHeight: Math.max(18, viewportMetrics.type.captionLineHeight),
			},
			rowCard: {
				paddingHorizontal: Math.max(14, viewportMetrics.modal.contentPadding - 2),
				paddingVertical: Math.max(14, viewportMetrics.insets.sectionGap),
				gap: Math.max(12, viewportMetrics.insets.sectionGap),
			},
			rowIconWrap: {
				width: orbSize,
				height: orbSize,
				borderRadius: Math.round(orbSize / 2),
			},
			rowTitle: {
				fontSize: Math.max(15, viewportMetrics.type.body),
				lineHeight: Math.max(20, viewportMetrics.type.bodyLineHeight - 4),
			},
			rowSubtitle: {
				marginTop: 3,
				fontSize: viewportMetrics.type.caption,
				lineHeight: Math.max(17, viewportMetrics.type.captionLineHeight + 1),
			},
			emptyCard: {
				paddingHorizontal: Math.max(18, viewportMetrics.modal.contentPadding),
				paddingVertical: Math.max(22, viewportMetrics.insets.largeGap),
			},
			emptyTitle: {
				fontSize: Math.max(16, viewportMetrics.type.title),
				lineHeight: Math.max(22, viewportMetrics.type.titleLineHeight - 2),
			},
			emptyBody: {
				marginTop: 8,
				fontSize: viewportMetrics.type.body,
				lineHeight: viewportMetrics.type.bodyLineHeight,
			},
			emptyAction: {
				marginTop: Math.max(16, viewportMetrics.insets.sectionGap),
				paddingHorizontal: Math.max(16, viewportMetrics.modal.contentPadding - 2),
				paddingVertical: 14,
			},
			emptyActionText: {
				fontSize: Math.max(15, viewportMetrics.type.body),
				lineHeight: Math.max(20, viewportMetrics.type.bodyLineHeight - 4),
			},
			cardRadius: viewportMetrics.radius.card,
			iconSize,
		};
	}, [viewportMetrics]);

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title={historyCount > 0 ? "History" : "Your history"}
			headerLayout="leading"
			minHeightRatio={0.78}
			contentContainerStyle={[styles.content, responsiveStyles.content]}
		>
			{groupedHistory.length > 0 ? (
				groupedHistory.map((group) => (
					<View key={group.key} style={[styles.section, responsiveStyles.section]}>
						<View style={[styles.sectionHeader, responsiveStyles.sectionHeader]}>
							<Text style={[styles.sectionTitle, responsiveStyles.sectionTitle, { color: mutedColor }]}>
								{group.label}
							</Text>
						</View>
						{group.items.map((item) => (
							<HistoryRow
								key={item.id}
								item={item}
								onPress={onSelectVisit}
								titleColor={titleColor}
								mutedColor={bodyColor}
								cardSurface={cardSurface}
								isDarkMode={isDarkMode}
								responsiveStyles={responsiveStyles}
							/>
						))}
					</View>
				))
			) : (
				<View
					style={[
						styles.emptyCard,
						responsiveStyles.emptyCard,
						{
							backgroundColor: cardSurface,
							borderRadius: responsiveStyles.cardRadius,
						},
					]}
				>
					<Text style={[styles.emptyTitle, responsiveStyles.emptyTitle, { color: titleColor }]}>
						No care history yet
					</Text>
					<Text style={[styles.emptyBody, responsiveStyles.emptyBody, { color: mutedColor }]}>
						Your completed care, upcoming visits, and active requests will appear here.
					</Text>
					{typeof onChooseCare === "function" ? (
						<Pressable
							onPress={onChooseCare}
							style={[
								styles.emptyAction,
								responsiveStyles.emptyAction,
								{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.08)"
										: "rgba(15,23,42,0.06)",
									borderRadius: responsiveStyles.cardRadius - 6,
								},
							]}
						>
							<Text
								style={[
									styles.emptyActionText,
									responsiveStyles.emptyActionText,
									{ color: titleColor },
								]}
							>
								Choose care
							</Text>
						</Pressable>
					) : null}
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
	section: {
		gap: 8,
	},
	sectionHeader: {},
	sectionTitle: {
		fontWeight: "700",
		textTransform: "none",
	},
	rowCard: {
		flexDirection: "row",
		alignItems: "center",
		...squircle(28),
	},
	rowIconWrap: {
		alignItems: "center",
		justifyContent: "center",
	},
	rowCopy: {
		flex: 1,
		minWidth: 0,
	},
	rowTitle: {
		fontWeight: "700",
	},
	rowSubtitle: {
		fontWeight: "400",
	},
	rowMeta: {
		alignItems: "flex-end",
		gap: 10,
		marginLeft: 10,
	},
	statusChip: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
	},
	statusChipText: {
		fontSize: 11,
		fontWeight: "700",
	},
	emptyCard: {
		alignItems: "flex-start",
		...squircle(28),
	},
	emptyTitle: {
		fontWeight: "700",
	},
	emptyBody: {
		fontWeight: "400",
	},
	emptyAction: {
		alignSelf: "stretch",
		alignItems: "center",
		justifyContent: "center",
		...squircle(24),
	},
	emptyActionText: {
		fontWeight: "700",
	},
});
