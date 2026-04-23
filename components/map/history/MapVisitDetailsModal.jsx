import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { MAP_SHEET_SNAP_STATES } from "../core/mapSheet.constants";
import MapModalShell from "../surfaces/MapModalShell";
import useResponsiveSurfaceMetrics from "../../../hooks/ui/useResponsiveSurfaceMetrics";
import { useTheme } from "../../../contexts/ThemeContext";
import { resolveHistoryHeroTone } from "./history.theme";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

const getTypeIcon = (requestType) => {
	switch (requestType) {
		case "ambulance":
			return { library: "material", name: "ambulance" };
		case "bed":
			return { library: "material", name: "bed" };
		default:
			return { library: "ion", name: "calendar" };
	}
};

// PULLBACK NOTE: status-tone tokens centralized in history.theme.js (F1)
// OLD: local getTone duplicated inline
// NEW: import { resolveHistoryHeroTone } from "./history.theme"

function DetailRow({ label, value, mutedColor, titleColor, responsiveStyles }) {
	if (!value) return null;
	return (
		<View style={styles.detailRow}>
			<Text
				style={[
					styles.detailLabel,
					responsiveStyles.detailLabel,
					{ color: mutedColor },
				]}
			>
				{label}
			</Text>
			<Text
				style={[
					styles.detailValue,
					responsiveStyles.detailValue,
					{ color: titleColor },
				]}
			>
				{value}
			</Text>
		</View>
	);
}

function ActionRow({
	label,
	icon,
	toneColor,
	onPress,
	responsiveStyles,
	titleColor,
}) {
	return (
		<Pressable
			onPress={onPress}
			style={[styles.actionRow, responsiveStyles.actionRow]}
		>
			<Ionicons
				name={icon}
				size={responsiveStyles.actionIconSize}
				color={toneColor}
			/>
			<Text
				style={[
					styles.actionLabel,
					responsiveStyles.actionLabel,
					{ color: titleColor },
				]}
			>
				{label}
			</Text>
		</Pressable>
	);
}

export default function MapVisitDetailsModal({
	visible,
	historyItem,
	onClose,
	onResume,
	onRateVisit,
	onCallClinic,
	onJoinVideo,
	onBookAgain,
	onCancelVisit,
}) {
	const { isDarkMode } = useTheme();
	const viewportMetrics = useResponsiveSurfaceMetrics({
		presentationMode: "modal",
	});
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
	const surfaceColor = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(15,23,42,0.04)";
	const heroTone = resolveHistoryHeroTone(historyItem?.statusTone, isDarkMode);
	const typeIcon = getTypeIcon(historyItem?.requestType);

	const responsiveStyles = useMemo(() => {
		const orbSize = Math.max(52, Math.round(viewportMetrics.radius.card * 1.72));
		return {
			content: {
				paddingBottom: Math.max(12, viewportMetrics.insets.sectionGap),
				gap: viewportMetrics.insets.largeGap,
			},
			hero: {
				paddingHorizontal: Math.max(
					16,
					viewportMetrics.modal.contentPadding - 2,
				),
				paddingVertical: Math.max(16, viewportMetrics.insets.sectionGap + 2),
				gap: Math.max(14, viewportMetrics.insets.sectionGap),
			},
			heroOrb: {
				width: orbSize,
				height: orbSize,
				borderRadius: Math.round(orbSize / 2),
			},
			heroTitle: {
				fontSize: Math.max(18, viewportMetrics.type.title + 1),
				lineHeight: Math.max(23, viewportMetrics.type.titleLineHeight),
			},
			heroSubtitle: {
				marginTop: 4,
				fontSize: viewportMetrics.type.body,
				lineHeight: viewportMetrics.type.bodyLineHeight,
			},
			heroMeta: {
				marginTop: 6,
				fontSize: viewportMetrics.type.caption,
				lineHeight: viewportMetrics.type.captionLineHeight,
			},
			section: {
				paddingHorizontal: Math.max(
					16,
					viewportMetrics.modal.contentPadding - 2,
				),
				paddingVertical: Math.max(16, viewportMetrics.insets.sectionGap + 1),
			},
			sectionTitle: {
				fontSize: Math.max(16, viewportMetrics.type.title - 1),
				lineHeight: Math.max(20, viewportMetrics.type.titleLineHeight - 4),
			},
			detailLabel: {
				fontSize: viewportMetrics.type.caption,
				lineHeight: viewportMetrics.type.captionLineHeight,
			},
			detailValue: {
				fontSize: Math.max(15, viewportMetrics.type.body),
				lineHeight: Math.max(20, viewportMetrics.type.bodyLineHeight - 2),
			},
			actionRow: {
				paddingVertical: Math.max(14, viewportMetrics.insets.sectionGap - 1),
			},
			actionLabel: {
				fontSize: Math.max(16, viewportMetrics.type.body + 1),
				lineHeight: Math.max(21, viewportMetrics.type.bodyLineHeight),
			},
			actionIconSize: Math.max(21, viewportMetrics.type.body + 4),
			cancelButton: {
				paddingVertical: 16,
			},
		};
	}, [viewportMetrics]);

	const primaryAction =
		historyItem?.canRate && onRateVisit
			? { label: "Rate visit", onPress: onRateVisit }
			: historyItem?.primaryAction === "resume_tracking" ||
				  historyItem?.primaryAction === "resume_request"
				? {
						label:
							historyItem.primaryAction === "resume_tracking"
								? "Resume tracking"
								: "Resume request",
						onPress: onResume,
					}
				: null;
	const whenValue = [historyItem?.dateLabel, historyItem?.timeLabel]
		.filter(Boolean)
		.join(" / ");
	const clinicianLabel = historyItem?.doctorName
		? historyItem?.actorRole || "Doctor"
		: historyItem?.actorRole || "Care team";
	const typeValue =
		historyItem?.visitTypeLabel || historyItem?.requestTypeLabel || null;
	const ratingValue = historyItem?.existingRating
		? `${historyItem.existingRating.toFixed(1)} / 5`
		: null;

	if (!historyItem) return null;

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title="Visit details"
			headerLayout="leading"
			defaultSnapState={MAP_SHEET_SNAP_STATES.HALF}
			minHeightRatio={0.62}
			maxHeightRatio={0.92}
			contentContainerStyle={[styles.content, responsiveStyles.content]}
		>
			<View
				style={[
					styles.hero,
					responsiveStyles.hero,
					{
						backgroundColor: surfaceColor,
						borderRadius: viewportMetrics.radius.card,
					},
				]}
			>
				<View style={styles.heroTopRow}>
					<View
						style={[
							styles.heroOrb,
							responsiveStyles.heroOrb,
							{ backgroundColor: heroTone.orb },
						]}
					>
						{typeIcon.library === "material" ? (
							<MaterialCommunityIcons
								name={typeIcon.name}
								size={26}
								color={heroTone.icon}
							/>
						) : (
							<Ionicons name={typeIcon.name} size={26} color={heroTone.icon} />
						)}
					</View>
					<View style={styles.heroCopy}>
						<Text
							style={[
								styles.heroTitle,
								responsiveStyles.heroTitle,
								{ color: titleColor },
							]}
						>
							{historyItem.title}
						</Text>
						<Text
							style={[
								styles.heroSubtitle,
								responsiveStyles.heroSubtitle,
								{ color: bodyColor },
							]}
						>
							{historyItem.subtitle}
						</Text>
						{historyItem.facilityAddress ? (
							<Text
								style={[
									styles.heroMeta,
									responsiveStyles.heroMeta,
									{ color: mutedColor },
								]}
							>
								{historyItem.facilityAddress}
							</Text>
						) : null}
					</View>
					<View
						style={[
							styles.heroStatusChip,
							{ backgroundColor: heroTone.chip },
						]}
					>
						<Text
							style={[
								styles.heroStatusText,
								{ color: heroTone.chipText },
							]}
						>
							{historyItem.statusLabel}
						</Text>
					</View>
				</View>
			</View>

			{primaryAction?.onPress ? (
				<Pressable
					onPress={primaryAction.onPress}
					style={[
						styles.primaryButton,
						{
							backgroundColor: isDarkMode
								? "rgba(255,255,255,0.08)"
								: "rgba(15,23,42,0.06)",
							borderRadius: viewportMetrics.radius.card - 6,
						},
					]}
				>
					<Text style={[styles.primaryButtonText, { color: titleColor }]}>
						{primaryAction.label}
					</Text>
				</Pressable>
			) : null}

			<View
				style={[
					styles.section,
					responsiveStyles.section,
					{
						backgroundColor: surfaceColor,
						borderRadius: viewportMetrics.radius.card,
					},
				]}
			>
				<Text
					style={[
						styles.sectionTitle,
						responsiveStyles.sectionTitle,
						{ color: titleColor },
					]}
				>
					Details
				</Text>
				<View style={styles.sectionBody}>
					<DetailRow
						label="When"
						value={whenValue}
						mutedColor={mutedColor}
						titleColor={titleColor}
						responsiveStyles={responsiveStyles}
					/>
					<DetailRow
						label="Type"
						value={typeValue}
						mutedColor={mutedColor}
						titleColor={titleColor}
						responsiveStyles={responsiveStyles}
					/>
					<DetailRow
						label="Specialty"
						value={historyItem.specialty}
						mutedColor={mutedColor}
						titleColor={titleColor}
						responsiveStyles={responsiveStyles}
					/>
					<DetailRow
						label={clinicianLabel}
						value={historyItem.doctorName || historyItem.actorName}
						mutedColor={mutedColor}
						titleColor={titleColor}
						responsiveStyles={responsiveStyles}
					/>
					<DetailRow
						label="Room"
						value={historyItem.roomNumber}
						mutedColor={mutedColor}
						titleColor={titleColor}
						responsiveStyles={responsiveStyles}
					/>
					<DetailRow
						label="Reference"
						value={historyItem.displayId || historyItem.requestId || historyItem.id}
						mutedColor={mutedColor}
						titleColor={titleColor}
						responsiveStyles={responsiveStyles}
					/>
					<DetailRow
						label="Payment"
						value={historyItem.paymentSummary}
						mutedColor={mutedColor}
						titleColor={titleColor}
						responsiveStyles={responsiveStyles}
					/>
					<DetailRow
						label="Next visit"
						value={historyItem.nextVisitLabel}
						mutedColor={mutedColor}
						titleColor={titleColor}
						responsiveStyles={responsiveStyles}
					/>
					<DetailRow
						label="Rating"
						value={ratingValue}
						mutedColor={mutedColor}
						titleColor={titleColor}
						responsiveStyles={responsiveStyles}
					/>
					<DetailRow
						label="Feedback"
						value={historyItem.ratingComment}
						mutedColor={mutedColor}
						titleColor={titleColor}
						responsiveStyles={responsiveStyles}
					/>
					<DetailRow
						label="Notes"
						value={historyItem.notes}
						mutedColor={mutedColor}
						titleColor={titleColor}
						responsiveStyles={responsiveStyles}
					/>
				</View>
			</View>

			{historyItem.preparation?.length ? (
				<View
					style={[
						styles.section,
						responsiveStyles.section,
						{
							backgroundColor: surfaceColor,
							borderRadius: viewportMetrics.radius.card,
						},
					]}
				>
					<Text
						style={[
							styles.sectionTitle,
							responsiveStyles.sectionTitle,
							{ color: titleColor },
						]}
					>
						Preparation
					</Text>
					<View style={styles.preparationList}>
						{historyItem.preparation.map((item) => (
							<View key={item} style={styles.preparationRow}>
								<View
									style={[
										styles.preparationDot,
										{ backgroundColor: heroTone.icon },
									]}
								/>
								<Text
									style={[styles.preparationText, { color: bodyColor }]}
								>
									{item}
								</Text>
							</View>
						))}
					</View>
				</View>
			) : null}

			<View
				style={[
					styles.section,
					responsiveStyles.section,
					{
						backgroundColor: surfaceColor,
						borderRadius: viewportMetrics.radius.card,
					},
				]}
			>
				<Text
					style={[
						styles.sectionTitle,
						responsiveStyles.sectionTitle,
						{ color: titleColor },
					]}
				>
					Actions
				</Text>
				<View style={styles.sectionBody}>
					{historyItem.canCallClinic && onCallClinic ? (
						<ActionRow
							label="Call clinic"
							icon="call"
							toneColor="#38BDF8"
							onPress={onCallClinic}
							responsiveStyles={responsiveStyles}
							titleColor={titleColor}
						/>
					) : null}
					{historyItem.canJoinVideo && onJoinVideo ? (
						<ActionRow
							label="Join video"
							icon="videocam"
							toneColor="#8B5CF6"
							onPress={onJoinVideo}
							responsiveStyles={responsiveStyles}
							titleColor={titleColor}
						/>
					) : null}
					{historyItem.canBookAgain && onBookAgain ? (
						<ActionRow
							label="Book again"
							icon="calendar"
							toneColor="#22C55E"
							onPress={onBookAgain}
							responsiveStyles={responsiveStyles}
							titleColor={titleColor}
						/>
					) : null}
				</View>
			</View>

			{historyItem.canCancel && onCancelVisit ? (
				<Pressable
					onPress={onCancelVisit}
					style={[
						styles.cancelButton,
						responsiveStyles.cancelButton,
						{
							backgroundColor: isDarkMode
								? "rgba(244,63,94,0.14)"
								: "rgba(244,63,94,0.08)",
							borderRadius: viewportMetrics.radius.card - 6,
						},
					]}
				>
					<Text style={styles.cancelButtonText}>Cancel Visit</Text>
				</Pressable>
			) : null}
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingTop: 0,
		paddingBottom: 12,
		gap: 16,
	},
	hero: {
		...squircle(28),
	},
	heroTopRow: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
	heroOrb: {
		alignItems: "center",
		justifyContent: "center",
	},
	heroCopy: {
		flex: 1,
		marginLeft: 14,
		minWidth: 0,
	},
	heroTitle: {
		fontWeight: "700",
	},
	heroSubtitle: {
		fontWeight: "500",
	},
	heroMeta: {
		fontWeight: "400",
	},
	heroStatusChip: {
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: 999,
		marginLeft: 12,
	},
	heroStatusText: {
		fontSize: 11,
		fontWeight: "700",
	},
	primaryButton: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 16,
		...squircle(24),
	},
	primaryButtonText: {
		fontSize: 16,
		fontWeight: "700",
	},
	section: {
		...squircle(28),
	},
	sectionTitle: {
		fontWeight: "700",
	},
	sectionBody: {
		marginTop: 14,
	},
	detailRow: {
		marginBottom: 14,
	},
	detailLabel: {
		fontWeight: "500",
	},
	detailValue: {
		marginTop: 4,
		fontWeight: "600",
	},
	actionRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
	},
	actionLabel: {
		fontWeight: "600",
	},
	preparationList: {
		marginTop: 14,
	},
	preparationRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
		marginBottom: 12,
	},
	preparationDot: {
		width: 7,
		height: 7,
		borderRadius: 999,
		marginTop: 7,
	},
	preparationText: {
		flex: 1,
		fontSize: 15,
		lineHeight: 21,
		fontWeight: "400",
	},
	cancelButton: {
		alignItems: "center",
		justifyContent: "center",
		...squircle(24),
	},
	cancelButtonText: {
		color: "#F43F5E",
		fontSize: 16,
		fontWeight: "700",
	},
});
