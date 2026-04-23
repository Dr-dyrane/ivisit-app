import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { MAP_SHEET_SNAP_STATES } from "../core/mapSheet.constants";
import MapModalShell from "../surfaces/MapModalShell";
import useResponsiveSurfaceMetrics from "../../../hooks/ui/useResponsiveSurfaceMetrics";
import { useTheme } from "../../../contexts/ThemeContext";
import buildHistoryThemeTokens from "./history.theme";
import { HISTORY_DETAILS_COPY } from "./history.content";
import { historyDetailsStyles } from "./history.styles";
import {
	resolveClinicianLabel,
	resolveDetailsPrimaryAction,
	resolveFacilityLine,
	resolveHistoryDetailsTitle,
	resolveHistoryRequestIcon,
	resolveTypeValue,
	resolveWhenValue,
} from "./history.presentation";

const RATING_STAR_GOLD = "#F6C453";

const toFiniteNumber = (value) => {
	if (typeof value === "string") {
		const normalized = value.replace(/[^0-9.-]/g, "");
		if (!normalized) return null;
		const numeric = Number(normalized);
		return Number.isFinite(numeric) ? numeric : null;
	}
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
};

const normalizeRatingValue = (value) => {
	const numeric = toFiniteNumber(value);
	if (numeric == null) return 0;
	return Math.max(0, Math.min(5, numeric));
};

const formatRatingDisplay = (value) => normalizeRatingValue(value).toFixed(1);

function renderRatingStars(value, activeColor, mutedColor, size = 14) {
	const clamped = normalizeRatingValue(value);
	const stars = [];
	for (let index = 1; index <= 5; index += 1) {
		let iconName = "star-outline";
		let color = mutedColor;
		if (clamped >= index) {
			iconName = "star";
			color = activeColor;
		} else if (clamped >= index - 0.5) {
			iconName = "star-half";
			color = activeColor;
		}
		stars.push(
			<Ionicons key={`rating-star-${index}`} name={iconName} size={size} color={color} />,
		);
	}
	return (
		<View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 4 }}>
			{stars}
		</View>
	);
}

/**
 * Single row in the Details section — label + value.
 * Hidden when value is falsy.
 */
function DetailRow({ label, value, theme, metrics, kind = null, ratingValue = null }) {
	const isRating = kind === "rating";
	const starsNode = isRating
		? renderRatingStars(
				ratingValue,
				RATING_STAR_GOLD,
				theme.mutedColor,
			)
		: null;
	if (!isRating && !value) return null;
	return (
		<View style={historyDetailsStyles.detailRow}>
			<Text
				style={[
					historyDetailsStyles.detailLabel,
					{
						color: theme.mutedColor,
						fontSize: metrics.detailLabelSize,
						lineHeight: metrics.detailLabelLineHeight,
					},
				]}
			>
				{label}
			</Text>
			{isRating ? (
				starsNode
			) : (
				<Text
					style={[
						historyDetailsStyles.detailValue,
						{
							color: theme.titleColor,
							fontSize: metrics.detailValueSize,
							lineHeight: metrics.detailValueLineHeight,
						},
					]}
				>
					{value}
				</Text>
			)}
		</View>
	);
}

/**
 * Action row — label + leading semantic-tone icon.
 */
function ActionRow({ label, icon, toneColor, onPress, theme, metrics }) {
	return (
		<Pressable
			onPress={onPress}
			style={[
				historyDetailsStyles.actionRow,
				{ paddingVertical: metrics.actionRowPadding },
			]}
			accessibilityRole="button"
			accessibilityLabel={label}
		>
			<Ionicons name={icon} size={metrics.actionIconSize} color={toneColor} />
			<Text
				style={[
					historyDetailsStyles.actionLabel,
					{
						color: theme.titleColor,
						fontSize: metrics.actionLabelSize,
						lineHeight: metrics.actionLabelLineHeight,
					},
				]}
			>
				{label}
			</Text>
		</Pressable>
	);
}

/**
 * MapVisitDetailsModal
 *
 * The canonical detail surface for any history item (visit, transport, reservation).
 * Title adapts to requestType. All color/structure passes through history tokens.
 */
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

	const theme = useMemo(
		() =>
			buildHistoryThemeTokens({
				isDarkMode,
				toneKey: historyItem?.statusTone ?? null,
				requestType: historyItem?.requestType ?? null,
				surface: "hero",
			}),
		[isDarkMode, historyItem?.statusTone, historyItem?.requestType],
	);

	const modalTitle = resolveHistoryDetailsTitle(historyItem?.requestType);
	const iconDescriptor = resolveHistoryRequestIcon(historyItem?.requestType);

	const metrics = useMemo(() => {
		const orbSize = Math.max(52, Math.round(viewportMetrics.radius.card * 1.72));
		return {
			contentGap: viewportMetrics.insets.largeGap,
			heroPaddingX: Math.max(16, viewportMetrics.modal.contentPadding - 2),
			heroPaddingY: Math.max(16, viewportMetrics.insets.sectionGap + 2),
			heroGap: Math.max(14, viewportMetrics.insets.sectionGap),
			orbSize,
			orbIconSize: 26,
			heroTitleSize: Math.max(18, viewportMetrics.type.title + 1),
			heroTitleLineHeight: Math.max(23, viewportMetrics.type.titleLineHeight),
			heroSubtitleSize: viewportMetrics.type.body,
			heroSubtitleLineHeight: viewportMetrics.type.bodyLineHeight,
			heroMetaSize: viewportMetrics.type.caption,
			heroMetaLineHeight: viewportMetrics.type.captionLineHeight,
			sectionPaddingX: Math.max(16, viewportMetrics.modal.contentPadding - 2),
			sectionPaddingY: Math.max(16, viewportMetrics.insets.sectionGap + 1),
			sectionTitleSize: Math.max(16, viewportMetrics.type.title - 1),
			sectionTitleLineHeight: Math.max(20, viewportMetrics.type.titleLineHeight - 4),
			detailLabelSize: viewportMetrics.type.caption,
			detailLabelLineHeight: viewportMetrics.type.captionLineHeight,
			detailValueSize: Math.max(15, viewportMetrics.type.body),
			detailValueLineHeight: Math.max(20, viewportMetrics.type.bodyLineHeight - 2),
			actionRowPadding: Math.max(14, viewportMetrics.insets.sectionGap - 1),
			actionLabelSize: Math.max(16, viewportMetrics.type.body + 1),
			actionLabelLineHeight: Math.max(21, viewportMetrics.type.bodyLineHeight),
			actionIconSize: Math.max(21, viewportMetrics.type.body + 4),
			cancelPadding: 16,
		};
	}, [viewportMetrics]);

	const containerRadius = viewportMetrics.radius.card;
	const secondaryRadius = Math.max(14, containerRadius - 6);

	const primaryAction = useMemo(
		() => resolveDetailsPrimaryAction({ historyItem, onRateVisit, onResume }),
		[historyItem, onRateVisit, onResume],
	);

	const whenValue = resolveWhenValue(historyItem);
	const typeValue = resolveTypeValue(historyItem);
	const clinicianLabel = resolveClinicianLabel(historyItem);
	const facilityLine = resolveFacilityLine(historyItem);

	if (!historyItem) return null;

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title={modalTitle}
			headerLayout="leading"
			defaultSnapState={MAP_SHEET_SNAP_STATES.HALF}
			minHeightRatio={0.62}
			maxHeightRatio={0.92}
			contentContainerStyle={[
				historyDetailsStyles.content,
				{ gap: metrics.contentGap },
			]}
		>
			{/* Hero */}
			<View
				style={[
					historyDetailsStyles.hero,
					{
						paddingHorizontal: metrics.heroPaddingX,
						paddingVertical: metrics.heroPaddingY,
						backgroundColor: theme.heroSurface,
						borderRadius: containerRadius,
					},
				]}
			>
				<View style={historyDetailsStyles.heroTopRow}>
					<View
						style={[
							historyDetailsStyles.heroOrb,
							{
								width: metrics.orbSize,
								height: metrics.orbSize,
								borderRadius: Math.round(metrics.orbSize / 2),
								backgroundColor: theme.tone.orb,
							},
						]}
					>
						{iconDescriptor.library === "material" ? (
							<MaterialCommunityIcons
								name={iconDescriptor.name}
								size={metrics.orbIconSize}
								color={theme.tone.icon}
							/>
						) : (
							<Ionicons
								name={iconDescriptor.name}
								size={metrics.orbIconSize}
								color={theme.tone.icon}
							/>
						)}
					</View>
					<View style={historyDetailsStyles.heroCopy}>
						<Text
							style={[
								historyDetailsStyles.heroTitle,
								{
									color: theme.titleColor,
									fontSize: metrics.heroTitleSize,
									lineHeight: metrics.heroTitleLineHeight,
								},
							]}
						>
							{historyItem.title}
						</Text>
						{historyItem.subtitle ? (
							<Text
								style={[
									historyDetailsStyles.heroSubtitle,
									{
										color: theme.bodyColor,
										fontSize: metrics.heroSubtitleSize,
										lineHeight: metrics.heroSubtitleLineHeight,
										marginTop: 4,
									},
								]}
							>
								{historyItem.subtitle}
							</Text>
						) : null}
						{facilityLine ? (
							<Text
								style={[
									historyDetailsStyles.heroMeta,
									{
										color: theme.mutedColor,
										fontSize: metrics.heroMetaSize,
										lineHeight: metrics.heroMetaLineHeight,
										marginTop: 6,
									},
								]}
							>
								{facilityLine}
							</Text>
						) : null}
					</View>
					{historyItem.statusLabel ? (
						<View
							style={[
								historyDetailsStyles.heroStatusChip,
								{ backgroundColor: theme.tone.chip },
							]}
						>
							<Text
								style={[
									historyDetailsStyles.heroStatusText,
									{ color: theme.tone.chipText },
								]}
							>
								{historyItem.statusLabel}
							</Text>
						</View>
					) : null}
				</View>
			</View>

			{/* Primary action */}
			{primaryAction?.onPress ? (
				<Pressable
					onPress={primaryAction.onPress}
					style={[
						historyDetailsStyles.primaryButton,
						{
							backgroundColor: theme.neutralActionSurface,
							borderRadius: secondaryRadius,
						},
					]}
					accessibilityRole="button"
					accessibilityLabel={primaryAction.label}
				>
					<Text
						style={[
							historyDetailsStyles.primaryButtonText,
							{ color: theme.titleColor },
						]}
					>
						{primaryAction.label}
					</Text>
				</Pressable>
			) : null}

			{/* Details */}
			<View
				style={[
					historyDetailsStyles.section,
					{
						paddingHorizontal: metrics.sectionPaddingX,
						paddingVertical: metrics.sectionPaddingY,
						backgroundColor: theme.heroSurface,
						borderRadius: containerRadius,
					},
				]}
			>
				<Text
					style={[
						historyDetailsStyles.sectionTitle,
						{
							color: theme.sectionTitleColor,
							fontSize: metrics.sectionTitleSize,
							lineHeight: metrics.sectionTitleLineHeight,
						},
					]}
				>
					{HISTORY_DETAILS_COPY.sectionTitles.details}
				</Text>
				<View style={historyDetailsStyles.sectionBody}>
					<DetailRow
						label={HISTORY_DETAILS_COPY.detailLabels.when}
						value={whenValue}
						theme={theme}
						metrics={metrics}
					/>
					<DetailRow
						label={HISTORY_DETAILS_COPY.detailLabels.type}
						value={typeValue}
						theme={theme}
						metrics={metrics}
					/>
					<DetailRow
						label={HISTORY_DETAILS_COPY.detailLabels.specialty}
						value={historyItem.specialty}
						theme={theme}
						metrics={metrics}
					/>
					<DetailRow
						label={clinicianLabel}
						value={historyItem.doctorName || historyItem.actorName}
						theme={theme}
						metrics={metrics}
					/>
					<DetailRow
						label={HISTORY_DETAILS_COPY.detailLabels.room}
						value={historyItem.roomNumber}
						theme={theme}
						metrics={metrics}
					/>
					<DetailRow
						label={HISTORY_DETAILS_COPY.detailLabels.reference}
						value={historyItem.displayId || historyItem.requestId || historyItem.id}
						theme={theme}
						metrics={metrics}
					/>
					<DetailRow
						label={HISTORY_DETAILS_COPY.detailLabels.payment}
						value={historyItem.paymentSummary}
						theme={theme}
						metrics={metrics}
					/>
					<DetailRow
						label={HISTORY_DETAILS_COPY.detailLabels.nextVisit}
						value={historyItem.nextVisitLabel}
						theme={theme}
						metrics={metrics}
					/>
					<DetailRow
						label={HISTORY_DETAILS_COPY.detailLabels.myRating || "My rating"}
						value={
							normalizeRatingValue(historyItem?.existingRating) > 0
								? null
								: formatRatingDisplay(historyItem?.existingRating)
						}
						kind="rating"
						ratingValue={historyItem?.existingRating}
						theme={theme}
						metrics={metrics}
					/>
					<DetailRow
						label={HISTORY_DETAILS_COPY.detailLabels.feedback}
						value={historyItem.ratingComment}
						theme={theme}
						metrics={metrics}
					/>
					<DetailRow
						label={HISTORY_DETAILS_COPY.detailLabels.notes}
						value={historyItem.notes}
						theme={theme}
						metrics={metrics}
					/>
				</View>
			</View>

			{/* Preparation (visit-only, when provided) */}
			{historyItem.preparation?.length ? (
				<View
					style={[
						historyDetailsStyles.section,
						{
							paddingHorizontal: metrics.sectionPaddingX,
							paddingVertical: metrics.sectionPaddingY,
							backgroundColor: theme.heroSurface,
							borderRadius: containerRadius,
						},
					]}
				>
					<Text
						style={[
							historyDetailsStyles.sectionTitle,
							{
								color: theme.sectionTitleColor,
								fontSize: metrics.sectionTitleSize,
								lineHeight: metrics.sectionTitleLineHeight,
							},
						]}
					>
						{HISTORY_DETAILS_COPY.sectionTitles.preparation}
					</Text>
					<View style={historyDetailsStyles.preparationList}>
						{historyItem.preparation.map((item) => (
							<View key={item} style={historyDetailsStyles.preparationRow}>
								<View
									style={[
										historyDetailsStyles.preparationDot,
										{ backgroundColor: theme.tone.icon },
									]}
								/>
								<Text
									style={[
										historyDetailsStyles.preparationText,
										{ color: theme.bodyColor },
									]}
								>
									{item}
								</Text>
							</View>
						))}
					</View>
				</View>
			) : null}

			{/* Actions */}
			{(historyItem.canCallClinic && onCallClinic) ||
			(historyItem.canJoinVideo && onJoinVideo) ||
			(historyItem.canBookAgain && onBookAgain) ? (
				<View
					style={[
						historyDetailsStyles.section,
						{
							paddingHorizontal: metrics.sectionPaddingX,
							paddingVertical: metrics.sectionPaddingY,
							backgroundColor: theme.heroSurface,
							borderRadius: containerRadius,
						},
					]}
				>
					<Text
						style={[
							historyDetailsStyles.sectionTitle,
							{
								color: theme.sectionTitleColor,
								fontSize: metrics.sectionTitleSize,
								lineHeight: metrics.sectionTitleLineHeight,
							},
						]}
					>
						{HISTORY_DETAILS_COPY.sectionTitles.actions}
					</Text>
					<View style={historyDetailsStyles.sectionBody}>
						{historyItem.canCallClinic && onCallClinic ? (
							<ActionRow
								label={HISTORY_DETAILS_COPY.actionLabels.callClinic}
								icon="call"
								toneColor={theme.actionCallColor}
								onPress={onCallClinic}
								theme={theme}
								metrics={metrics}
							/>
						) : null}
						{historyItem.canJoinVideo && onJoinVideo ? (
							<ActionRow
								label={HISTORY_DETAILS_COPY.actionLabels.joinVideo}
								icon="videocam"
								toneColor={theme.actionVideoColor}
								onPress={onJoinVideo}
								theme={theme}
								metrics={metrics}
							/>
						) : null}
						{historyItem.canBookAgain && onBookAgain ? (
							<ActionRow
								label={HISTORY_DETAILS_COPY.actionLabels.bookAgain}
								icon="calendar"
								toneColor={theme.actionBookColor}
								onPress={onBookAgain}
								theme={theme}
								metrics={metrics}
							/>
						) : null}
					</View>
				</View>
			) : null}

			{/* Cancel (destructive) */}
			{historyItem.canCancel && onCancelVisit ? (
				<Pressable
					onPress={onCancelVisit}
					style={[
						historyDetailsStyles.cancelButton,
						{
							paddingVertical: metrics.cancelPadding,
							backgroundColor: theme.destructiveActionSurface,
							borderRadius: secondaryRadius,
						},
					]}
					accessibilityRole="button"
					accessibilityLabel={HISTORY_DETAILS_COPY.actionLabels.cancel}
				>
					<Text
						style={{
							color: theme.destructiveActionText,
							fontSize: 16,
							fontWeight: "700",
						}}
					>
						{HISTORY_DETAILS_COPY.actionLabels.cancel}
					</Text>
				</Pressable>
			) : null}
		</MapModalShell>
	);
}
