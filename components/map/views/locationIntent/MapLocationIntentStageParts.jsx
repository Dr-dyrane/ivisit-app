import React, { useMemo } from "react";
import { View } from "react-native";
import MapVisitDetailCollapsedRow from "../visitDetail/MapVisitDetailCollapsedRow";
import trackingStyles from "../tracking/mapTracking.styles";
import {
	MapTrackingTopSlot,
	TrackingCtaButton,
	TrackingDetailsCard,
	TrackingTeamHeroCard,
} from "../tracking/parts/MapTrackingParts";
import styles from "./mapLocationIntent.styles";

function getActionTone(action) {
	if (action?.tone === "search") {
		return {
			iconColor: "#86100E",
		};
	}

	if (action?.tone === "saved") {
		return {
			iconColor: "#0F766E",
		};
	}

	return {
		iconColor: "#1D4ED8",
	};
}

function buildCollapsedAction({
	showToggle,
	onToggle,
	toggleAccessibilityLabel,
	toggleIconName,
}) {
	if (!showToggle || typeof onToggle !== "function") {
		return null;
	}

	return {
		onPress: onToggle,
		accessibilityLabel: toggleAccessibilityLabel,
		icon: toggleIconName,
		primary: false,
	};
}

function buildDetailRows(rows = []) {
	return rows.map((row) => ({
		label: row.label,
		value: row.value,
		icon: row.iconName || "information-circle-outline",
	}));
}

export function MapLocationIntentCollapsedTopRow({
	model,
	titleColor,
	mutedColor,
	actionSurfaceColor,
	onToggle,
	toggleAccessibilityLabel,
	toggleIconName,
	onClose,
	showToggle = true,
}) {
	const action = useMemo(
		() =>
			buildCollapsedAction({
				showToggle,
				onToggle,
				toggleAccessibilityLabel,
				toggleIconName,
			}),
		[onToggle, showToggle, toggleAccessibilityLabel, toggleIconName],
	);

	return (
		<MapVisitDetailCollapsedRow
			action={action}
			title={model.headerTitle}
			subtitle={model.headerSubtitle}
			onExpand={onToggle}
			onClose={onClose}
			titleColor={titleColor}
			mutedColor={mutedColor}
			iconSurfaceColor={actionSurfaceColor}
		/>
	);
}

export function MapLocationIntentActiveTopRow({
	model,
	titleColor,
	mutedColor,
	actionSurfaceColor,
	onToggle,
	toggleAccessibilityLabel,
	toggleIconName,
	onClose,
	showToggle = true,
}) {
	return (
		<MapTrackingTopSlot
			title={model.headerTitle}
			subtitle={model.headerSubtitle}
			titleColor={titleColor}
			mutedColor={mutedColor}
			actionSurfaceColor={actionSurfaceColor}
			onToggle={onToggle}
			showToggle={showToggle}
			toggleIconName={toggleIconName}
			toggleAccessibilityLabel={toggleAccessibilityLabel}
			showClose
			onClose={onClose}
			closeAccessibilityLabel="Close location sheet"
		/>
	);
}

export function MapLocationIntentBodyContent({
	model,
	titleColor,
	mutedColor,
	heroSurfaceColor,
	groupSurfaceColor,
	infoSurfaceColor,
	onUseCurrentLocation,
	onOpenSearch,
	onOpenProfile,
	isDarkMode,
}) {
	const detailRows = useMemo(() => buildDetailRows(model.info.rows), [model.info.rows]);
	const detailGradientColors = isDarkMode
		? ["rgba(255,255,255,0.04)", "rgba(15,23,42,0.12)"]
		: ["rgba(255,255,255,0.20)", "rgba(248,250,252,0.08)"];
	const detailRowSurface = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(255,255,255,0.46)";
	const actions = useMemo(
		() =>
			model.actions.map((action) => {
				if (action.key === "device") {
					return {
						key: action.key,
						label: action.title,
						iconName: action.iconName,
						onPress: onUseCurrentLocation,
						tone: action.tone,
					};
				}
				if (action.key === "search") {
					return {
						key: action.key,
						label: action.title,
						iconName: action.iconName,
						onPress: onOpenSearch,
						tone: action.tone,
					};
				}
				return {
					key: action.key,
					label: action.title,
					iconName: action.iconName,
					onPress: onOpenProfile,
					tone: action.tone,
				};
			}),
		[model.actions, onOpenProfile, onOpenSearch, onUseCurrentLocation],
	);

	return (
		<View style={styles.bodyScrollContent}>
			<TrackingTeamHeroCard
				title={model.hero.title}
				subtitle={model.hero.subtitle}
				rightMeta={model.hero.rightMeta}
				progressValue={0}
				avatarIcon={model.hero.iconName}
				backgroundColor={heroSurfaceColor}
				progressColor="transparent"
				titleColor={titleColor}
				mutedColor={mutedColor}
			/>

			<View style={styles.sectionGap} />

			<View style={[trackingStyles.ctaGroupCard, { backgroundColor: groupSurfaceColor }]}>
				{actions.map((action, index) => {
					const tone = getActionTone(action);
					return (
						<TrackingCtaButton
							key={action.key}
							action={action}
							isGrouped
							isDarkMode={isDarkMode}
							showDivider={index < actions.length - 1}
							iconColor={tone.iconColor}
							labelColor={titleColor}
						/>
					);
				})}
			</View>

			<View style={styles.sectionGap} />

			<TrackingDetailsCard
				surfaceColor={infoSurfaceColor}
				detailCardRadius={28}
				detailGradientColors={detailGradientColors}
				mutedColor={mutedColor}
				requestSurfaceColor={detailRowSurface}
				trackingDetailRows={detailRows}
				isDarkMode={isDarkMode}
				titleColor={titleColor}
				headerLabel={model.info.title}
				valueNumberOfLines={1}
			/>
		</View>
	);
}
