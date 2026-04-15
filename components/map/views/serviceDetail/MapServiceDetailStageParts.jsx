import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import EntryActionButton from "../../../entry/EntryActionButton";
import { getHospitalDetailServiceImageSource } from "../../surfaces/hospitals/mapHospitalDetail.content";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import MapStageGlassPanel from "../shared/MapStageGlassPanel";
import { MAP_SERVICE_DETAIL_COPY } from "./mapServiceDetail.content";
import styles from "./mapServiceDetailStage.styles";

export function MapServiceDetailTopSlot({ title, onClose, titleColor, closeSurface }) {
	return (
		<View style={styles.topSlot}>
			<View style={styles.topSlotSpacer} />
			<Text numberOfLines={1} style={[styles.topSlotTitle, { color: titleColor }]}>
				{title}
			</Text>
			<MapHeaderIconButton
				onPress={onClose}
				accessibilityLabel="Close service details"
				backgroundColor={closeSurface}
				color={titleColor}
				pressableStyle={styles.topSlotAction}
				style={styles.topSlotCloseButton}
			/>
		</View>
	);
}

export function MapServiceDetailHeader({
	accent,
	copy,
	glassTokens,
	isDarkMode,
	mutedColor,
	nestedSurfaceColor,
	positionLabel,
	servicePositionLabel,
	serviceType,
	surfaceColor,
}) {
	const typeLabel =
		serviceType === "room"
			? MAP_SERVICE_DETAIL_COPY.ROOM_LABEL
			: MAP_SERVICE_DETAIL_COPY.AMBULANCE_LABEL;

	return (
		<MapStageGlassPanel
			style={styles.headerBlock}
			backgroundColor={surfaceColor}
			glassTokens={glassTokens}
			isDarkMode={isDarkMode}
		>
			<View style={styles.headerMetaRow}>
				<View style={[styles.headerTypePill, { backgroundColor: nestedSurfaceColor }]}>
					<View style={[styles.headerTypeDot, { backgroundColor: accent }]} />
					<Text style={[styles.headerTypeLabel, { color: accent }]}>{typeLabel}</Text>
				</View>
				{servicePositionLabel ? (
					<Text style={[styles.positionLabel, { color: mutedColor }]}>{servicePositionLabel}</Text>
				) : null}
			</View>
			<Text style={[styles.summary, { color: mutedColor }]} numberOfLines={2}>
				{copy.summary}
			</Text>
			{positionLabel ? (
				<Text style={[styles.headerAssistiveLabel, { color: mutedColor }]}>{positionLabel}</Text>
			) : null}
		</MapStageGlassPanel>
	);
}

export function MapServiceDetailSwitchRow({
	accent,
	mutedColor,
	nestedSurfaceColor,
	onSelectService,
	selectedServiceId,
	serviceItems = [],
	serviceType,
	titleColor,
}) {
	if (!Array.isArray(serviceItems) || serviceItems.length < 2) {
		return null;
	}
	const activeSurfaceColor =
		serviceType === "room" ? "rgba(100,116,139,0.14)" : "rgba(134,16,14,0.12)";

	return (
		<View>
			<Text style={[styles.sectionLabel, styles.switchLabel, { color: mutedColor }]}>
				{serviceType === "room"
					? MAP_SERVICE_DETAIL_COPY.CHOOSE_ROOM
					: MAP_SERVICE_DETAIL_COPY.CHOOSE_TRANSPORT}
			</Text>
			<View style={styles.switchRow}>
				{serviceItems.map((item) => {
					const isActive = (item?.id || item?.title) === selectedServiceId;
					return (
						<Pressable
							key={item?.id || item?.title}
							onPress={() => onSelectService?.(item)}
							style={({ pressed }) => [
								styles.switchPill,
								{
									backgroundColor: isActive
										? activeSurfaceColor
										: nestedSurfaceColor,
									opacity: pressed ? 0.92 : 1,
								},
							]}
						>
							<View style={[styles.switchAccent, { backgroundColor: accent }]} />
							<Text
								style={[
									styles.switchPillLabel,
									{ color: isActive ? accent : titleColor },
								]}
								numberOfLines={1}
							>
								{item?.title || "Option"}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

export function MapServiceDetailHero({
	glassTokens,
	imageSource,
	isDarkMode,
	panHandlers,
	surfaceColor,
}) {
	return (
		<MapStageGlassPanel
			style={styles.heroCard}
			backgroundColor={surfaceColor}
			glassTokens={glassTokens}
			isDarkMode={isDarkMode}
			panHandlers={panHandlers}
		>
			{imageSource ? (
				<Image source={imageSource} resizeMode="contain" fadeDuration={0} style={styles.heroImage} />
			) : null}
			<LinearGradient
				pointerEvents="none"
				colors={
					isDarkMode
						? ["rgba(255,255,255,0.05)", "rgba(15,23,42,0.18)"]
						: ["rgba(255,255,255,0.36)", "rgba(15,23,42,0.055)"]
				}
				style={StyleSheet.absoluteFillObject}
			/>
		</MapStageGlassPanel>
	);
}

export function MapServiceDetailMetrics({
	accent,
	nestedSurfaceColor,
	priceLabel,
	statusLabel,
	titleColor,
}) {
	return (
		<View style={styles.metricRow}>
			<View
				style={[
					styles.metricPill,
					styles.metricPillSpaced,
					{ backgroundColor: nestedSurfaceColor },
				]}
			>
				<View style={styles.metricIconBox}>
					<Ionicons name="checkmark-circle-outline" size={15} color={accent} />
				</View>
				<Text style={[styles.metricText, { color: titleColor }]}>{statusLabel}</Text>
			</View>
			<View style={[styles.metricPill, { backgroundColor: nestedSurfaceColor }]}>
				<View style={styles.metricIconBox}>
					<Ionicons name="cash-outline" size={15} color={accent} />
				</View>
				<Text style={[styles.metricText, { color: titleColor }]}>{priceLabel}</Text>
			</View>
		</View>
	);
}

export function MapServiceDetailOptionList({
	accent,
	isDarkMode,
	mutedColor,
	onSelectService,
	selectedServiceId,
	serviceItems = [],
	serviceType,
	surfaceColor,
	titleColor,
}) {
	if (!Array.isArray(serviceItems) || serviceItems.length < 2) {
		return null;
	}

	const statusFallback =
		serviceType === "room"
			? MAP_SERVICE_DETAIL_COPY.ROOM_STATUS_FALLBACK
			: MAP_SERVICE_DETAIL_COPY.TRANSPORT_STATUS_FALLBACK;
	const activeSurfaceColor =
		serviceType === "room" ? "rgba(100,116,139,0.14)" : "rgba(134,16,14,0.12)";

	return (
		<View style={styles.optionList}>
			{serviceItems.map((item, index) => {
				const itemId = item?.id || item?.title;
				const isActive = itemId === selectedServiceId;
				const statusLabel = item?.metaText || statusFallback;
				const priceLabel = item?.priceText || MAP_SERVICE_DETAIL_COPY.PRICE_FALLBACK;
				const imageSource = getHospitalDetailServiceImageSource(item, serviceType);

				return (
					<Pressable
						key={itemId}
						onPress={() => onSelectService?.(item)}
						style={({ pressed }) => [
							styles.optionRow,
							index > 0 ? styles.optionRowSpaced : null,
							{
								backgroundColor: isActive
									? activeSurfaceColor
									: isDarkMode
										? "rgba(255,255,255,0.055)"
										: surfaceColor,
								opacity: pressed ? 0.94 : 1,
							},
						]}
					>
						<View style={styles.optionCopy}>
							<Text style={[styles.optionTitle, { color: titleColor }]} numberOfLines={1}>
								{item?.title || "Option"}
							</Text>
							<Text style={[styles.optionMeta, { color: mutedColor }]} numberOfLines={2}>
								{`${statusLabel} • ${priceLabel}`}
							</Text>
						</View>
						{imageSource ? (
							<Image
								source={imageSource}
								resizeMode="contain"
								fadeDuration={0}
								style={styles.optionImage}
							/>
						) : null}
						{isActive ? (
							<View style={[styles.optionStatePill, { backgroundColor: activeSurfaceColor }]}>
								<Text style={[styles.optionStateText, { color: accent }]}>
									{MAP_SERVICE_DETAIL_COPY.CURRENT_PILL}
								</Text>
							</View>
						) : (
							<Ionicons name="chevron-forward" size={16} color={mutedColor} />
						)}
					</Pressable>
				);
			})}
		</View>
	);
}

export function MapServiceDetailFeatures({
	accent,
	copy,
	glassTokens,
	isDarkMode,
	mutedColor,
	nestedSurfaceColor,
	panHandlers,
	titleColor,
}) {
	return (
		<View>
			<Text style={[styles.sectionLabel, { color: mutedColor }]}>What to expect</Text>
			<MapStageGlassPanel
				style={styles.featureList}
				backgroundColor={nestedSurfaceColor}
				glassTokens={glassTokens}
				isDarkMode={isDarkMode}
				panHandlers={panHandlers}
			>
				{copy.features.map((feature, index) => (
					<View
						key={feature}
						style={[styles.featureRow, index > 0 ? styles.featureRowSpaced : null]}
					>
						<View style={[styles.featureDot, { backgroundColor: accent }]} />
						<Text style={[styles.featureText, { color: titleColor }]}>{feature}</Text>
					</View>
				))}
			</MapStageGlassPanel>
		</View>
	);
}

export function MapServiceDetailFooter({
	isSelected,
	modalContainedStyle,
	onConfirm,
	serviceType,
}) {
	const label = isSelected
		? serviceType === "room"
			? "Room selected"
			: "Transport selected"
		: serviceType === "room"
			? "Select room"
			: "Select transport";

	return (
		<View style={[styles.footerDock, modalContainedStyle]}>
			<EntryActionButton
				label={label}
				onPress={onConfirm}
				variant="primary"
				height={54}
				radius={22}
				fullWidth
				style={styles.primaryButton}
			/>
		</View>
	);
}
