import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const paletteForTone = (tone, isDarkMode) => {
	const palettes = {
		accent: {
			strong: isDarkMode ? "#38BDF8" : "#0284C7",
			soft: isDarkMode ? "rgba(56,189,248,0.16)" : "rgba(2,132,199,0.10)",
		},
		success: {
			strong: isDarkMode ? "#4ADE80" : "#15803D",
			soft: isDarkMode ? "rgba(74,222,128,0.16)" : "rgba(21,128,61,0.10)",
		},
		warning: {
			strong: isDarkMode ? "#FBBF24" : "#B45309",
			soft: isDarkMode ? "rgba(251,191,36,0.16)" : "rgba(180,83,9,0.10)",
		},
		danger: {
			strong: isDarkMode ? "#FDA29B" : "#B42318",
			soft: isDarkMode ? "rgba(253,162,155,0.14)" : "rgba(180,35,24,0.09)",
		},
	};
	return palettes[tone] || palettes.accent;
};

export default function MapScheduledVisitLifecycleCard({
	lifecycle,
	isDarkMode,
	tokens,
}) {
	const palette = useMemo(
		() => paletteForTone(lifecycle?.statusTone, isDarkMode),
		[isDarkMode, lifecycle?.statusTone],
	);

	if (!lifecycle) return null;

	return (
		<View
			accessibilityRole="summary"
			accessibilityLabel={`${lifecycle.statusLabel}. ${lifecycle.nextLabel}`}
			style={[
				styles.card,
				{
					backgroundColor: tokens.elevatedSurfaceColor,
					borderRadius: tokens.detailCardRadius,
				},
			]}
		>
			<View style={styles.headerRow}>
				<Text style={[styles.title, { color: tokens.titleColor }]}>
					{lifecycle.title}
				</Text>
				<View style={[styles.statusPill, { backgroundColor: palette.soft }]}>
					<Ionicons name={lifecycle.icon} size={13} color={palette.strong} />
					<Text style={[styles.statusText, { color: palette.strong }]}>
						{lifecycle.statusLabel}
					</Text>
				</View>
			</View>

			<View style={styles.progressWrap}>
				<View
					style={[
						styles.progressTrack,
						{ backgroundColor: tokens.connectorTrackColor },
					]}
				>
					<View
						style={[
							styles.progressFill,
							{
								backgroundColor: palette.strong,
								width: `${Math.max(0, Math.min(1, lifecycle.progressValue)) * 100}%`,
							},
						]}
					/>
				</View>

				<View style={styles.stepsRow}>
					{lifecycle.steps.map((step) => {
						const isComplete = step.state === "complete";
						const isCurrent = step.state === "current";
						const isTerminal = step.state === "terminal";
						const isActive = isComplete || isCurrent || isTerminal;
						const markerColor = isTerminal
							? palette.strong
							: isActive
								? palette.strong
								: tokens.connectorTrackColor;
						const iconName = isTerminal
							? "close"
							: isComplete
								? "checkmark"
								: isCurrent
									? "ellipse"
									: null;

						return (
							<View key={step.key} style={styles.step}>
								<View style={[styles.marker, { backgroundColor: markerColor }]}>
									{iconName ? (
										<Ionicons name={iconName} size={isCurrent ? 7 : 14} color="#FFFFFF" />
									) : null}
								</View>
								<Text
									numberOfLines={1}
									style={[
										styles.stepLabel,
										{ color: isActive ? tokens.titleColor : tokens.mutedColor },
									]}
								>
									{step.label}
								</Text>
							</View>
						);
					})}
				</View>
			</View>

			<Text numberOfLines={1} style={[styles.nextLabel, { color: tokens.mutedColor }]}>
				{lifecycle.nextLabel}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		paddingHorizontal: 14,
		paddingVertical: 13,
		borderCurve: "continuous",
		gap: 12,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	title: {
		flex: 1,
		fontSize: 15,
		lineHeight: 19,
		fontWeight: "700",
	},
	statusPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingHorizontal: 9,
		paddingVertical: 5,
		borderRadius: 999,
		borderCurve: "continuous",
	},
	statusText: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
	},
	progressWrap: {
		position: "relative",
		paddingTop: 1,
	},
	progressTrack: {
		position: "absolute",
		left: "16.66%",
		right: "16.66%",
		top: 12,
		height: 3,
		borderRadius: 999,
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		borderRadius: 999,
	},
	stepsRow: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
	step: {
		flex: 1,
		alignItems: "center",
		gap: 5,
		minWidth: 0,
	},
	marker: {
		width: 26,
		height: 26,
		borderRadius: 13,
		alignItems: "center",
		justifyContent: "center",
	},
	stepLabel: {
		fontSize: 10,
		lineHeight: 13,
		fontWeight: "600",
		textAlign: "center",
	},
	nextLabel: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "500",
	},
});
