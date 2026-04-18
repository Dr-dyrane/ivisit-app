import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import EntryActionButton from "../../../entry/EntryActionButton";
import { COLORS } from "../../../../constants/colors";
import { getAmbulanceVisualProfile } from "../../../emergency/requestModal/ambulanceTierVisuals";
import { getHospitalDetailServiceImageSource } from "../../surfaces/hospitals/mapHospitalDetail.content";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import MapStageGlassPanel from "../shared/MapStageGlassPanel";
import { MAP_SERVICE_DETAIL_COPY } from "./mapServiceDetail.content";
import styles from "./mapServiceDetailStage.styles";

function toAccentRgba(color, alpha) {
	if (typeof color !== "string" || !color.startsWith("#")) {
		return `rgba(134,16,14,${alpha})`;
	}
	const hex = color.slice(1);
	const normalized =
		hex.length === 3
			? hex
					.split("")
					.map((char) => char + char)
					.join("")
			: hex;
	const red = parseInt(normalized.slice(0, 2), 16);
	const green = parseInt(normalized.slice(2, 4), 16);
	const blue = parseInt(normalized.slice(4, 6), 16);
	if (![red, green, blue].every(Number.isFinite)) {
		return `rgba(134,16,14,${alpha})`;
	}
	return `rgba(${red},${green},${blue},${alpha})`;
}

function getTransportTierIconName(visualProfile, isActive = false) {
	if (visualProfile?.key === "critical") {
		return isActive ? "alert-circle" : "alert-circle-outline";
	}
	if (visualProfile?.key === "advanced") {
		return isActive ? "pulse" : "pulse-outline";
	}
	return isActive ? "medkit" : "medkit-outline";
}

function getRoomVisual(title, fallbackAccent) {
	const raw = String(title || "").toLowerCase();
	if (/high-support|icu/.test(raw)) {
		return {
			accent: "#B91C1C",
			activeIconName: "pulse",
			inactiveIconName: "pulse-outline",
		};
	}
	if (/private/.test(raw)) {
		return {
			accent: "#0F766E",
			activeIconName: "shield-checkmark",
			inactiveIconName: "shield-checkmark-outline",
		};
	}
	return {
		accent: fallbackAccent || "#64748B",
		activeIconName: "bed",
		inactiveIconName: "bed-outline",
	};
}

function getServiceOptionVisual(item, serviceType, fallbackAccent) {
	if (serviceType === "ambulance") {
		const visualProfile = getAmbulanceVisualProfile(item);
		return {
			accent: visualProfile.accent,
			activeIconName: getTransportTierIconName(visualProfile, true),
			inactiveIconName: getTransportTierIconName(visualProfile, false),
		};
	}

	return getRoomVisual(item?.title, fallbackAccent);
}

function getServiceOptionIconName(optionVisual, isActive) {
	return isActive ? optionVisual.activeIconName : optionVisual.inactiveIconName;
}

function extractCrewCountLabel(value) {
	const match = String(value || "").match(/(\d+)\s*(?:-?\s*person|paramedic|crew)/i);
	if (!match) return null;
	const count = Number(match[1]);
	if (!Number.isFinite(count) || count <= 0) return null;
	return `${count} crew`;
}

function buildAmbulanceCrewPillLabel(service) {
	const explicitCrewLabel = extractCrewCountLabel(service?.crew);
	if (explicitCrewLabel) return explicitCrewLabel;

	const visualProfile = getAmbulanceVisualProfile(service);
	if (visualProfile?.key === "basic") return "2 crew";
	if (visualProfile?.key === "advanced") return "2+ crew";
	if (visualProfile?.key === "critical") return "2+ crew";
	return "Crew ready";
}

export function MapServiceDetailTopSlot({
	title,
	onClose,
	titleColor,
	closeSurface,
	stageMetrics,
	containerStyle,
}) {
	return (
		<View style={[styles.topSlot, stageMetrics?.topSlot?.containerStyle, containerStyle]}>
			<View style={styles.topSlotSpacer} />
			<Text
				numberOfLines={1}
				style={[styles.topSlotTitle, stageMetrics?.topSlot?.titleStyle, { color: titleColor }]}
			>
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
	stageMetrics,
	surfaceColor,
}) {
	const typeLabel =
		serviceType === "room"
			? MAP_SERVICE_DETAIL_COPY.ROOM_LABEL
			: MAP_SERVICE_DETAIL_COPY.AMBULANCE_LABEL;

	return (
		<MapStageGlassPanel
			style={[styles.headerBlock, stageMetrics?.panel?.cardStyle]}
			backgroundColor={surfaceColor}
			glassTokens={glassTokens}
			isDarkMode={isDarkMode}
		>
			<View style={styles.headerMetaRow}>
				<View style={[styles.headerTypePill, { backgroundColor: nestedSurfaceColor }]}>
					<Text style={[styles.headerTypeLabel, { color: accent }]}>{typeLabel}</Text>
				</View>
				{servicePositionLabel ? (
					<Text style={[styles.positionLabel, { color: mutedColor }]}>{servicePositionLabel}</Text>
				) : null}
			</View>
			<Text
				style={[styles.summary, stageMetrics?.panel?.summaryStyle, { color: mutedColor }]}
				numberOfLines={2}
			>
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
	isDarkMode = false,
	onSelectService,
	onAdvanceSelectedService,
	selectedServiceId,
	serviceItems = [],
	serviceType,
	stageMetrics,
	titleColor,
}) {
	if (!Array.isArray(serviceItems) || serviceItems.length < 2) {
		return null;
	}

	return (
		<View style={[styles.switchRow, stageMetrics?.switch?.rowStyle]}>
			{serviceItems.map((item) => {
				const isActive = (item?.id || item?.title) === selectedServiceId;
				const optionVisual = getServiceOptionVisual(item, serviceType, accent);
				const inactiveSurfaceColor = toAccentRgba(
					optionVisual.accent,
					isDarkMode ? 0.18 : 0.12,
				);
				return (
					<Pressable
						key={item?.id || item?.title}
						onPress={() =>
							isActive
								? onAdvanceSelectedService?.(item)
								: onSelectService?.(item)
						}
						style={({ pressed }) => [
							styles.switchPill,
							stageMetrics?.switch?.pillStyle,
							{
								backgroundColor: isActive
									? COLORS.brandPrimary
									: inactiveSurfaceColor || nestedSurfaceColor,
								opacity: pressed ? 0.92 : 1,
							},
						]}
					>
						<Ionicons
							name={getServiceOptionIconName(optionVisual, isActive)}
							size={14}
							color={isActive ? "#FFFFFF" : optionVisual.accent}
						/>
						<Text
							style={[
								styles.switchPillLabel,
								stageMetrics?.switch?.labelStyle,
								{ color: isActive ? "#FFFFFF" : optionVisual.accent },
							]}
							numberOfLines={1}
						>
							{item?.title || "Option"}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

export function MapServiceDetailHero({
	accent,
	glassTokens,
	imageSource,
	isDarkMode,
	priceLabel,
	panHandlers,
	service,
	serviceType,
	surfaceColor,
	stageMetrics,
	titleColor,
}) {
	const isAmbulance = serviceType === "ambulance";
	const heroPillSurfaceColor = isDarkMode
		? "rgba(8,15,27,0.58)"
		: "rgba(255,255,255,0.86)";
	const heroMetrics = isAmbulance
		? [
				{
					iconName: "people",
					label: buildAmbulanceCrewPillLabel(service),
				},
				{
					iconName: "cash",
					label: priceLabel,
				},
			]
		: [];

	return (
		<MapStageGlassPanel
			style={[styles.heroCard, stageMetrics?.hero?.cardStyle]}
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
			{heroMetrics.length ? (
				<View style={styles.heroOverlay}>
					<View style={[styles.heroMetaRow, stageMetrics?.hero?.metaRowStyle]}>
						{heroMetrics.map((metric) => (
							<View
								key={`${metric.iconName}-${metric.label}`}
								style={[
									styles.metaPill,
									stageMetrics?.hero?.metaPillStyle,
									{ backgroundColor: heroPillSurfaceColor },
								]}
							>
								<Ionicons name={metric.iconName} size={14} color={accent} />
								<Text
									style={[
										styles.metaLabel,
										stageMetrics?.hero?.metaLabelStyle,
										{ color: titleColor },
									]}
									numberOfLines={1}
								>
									{metric.label}
								</Text>
							</View>
						))}
					</View>
				</View>
			) : null}
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
	onAdvanceSelectedService,
	selectedServiceId,
	serviceItems = [],
	serviceType,
	surfaceColor,
	stageMetrics,
	titleColor,
}) {
	if (!Array.isArray(serviceItems) || serviceItems.length < 2) {
		return null;
	}

	const statusFallback =
		serviceType === "room"
			? MAP_SERVICE_DETAIL_COPY.ROOM_STATUS_FALLBACK
			: MAP_SERVICE_DETAIL_COPY.TRANSPORT_STATUS_FALLBACK;

	return (
		<View style={styles.optionList}>
			{serviceItems.map((item, index) => {
				const itemId = item?.id || item?.title;
				const isActive = itemId === selectedServiceId;
				const statusLabel = item?.metaText || statusFallback;
				const priceLabel = item?.priceText || MAP_SERVICE_DETAIL_COPY.PRICE_FALLBACK;
				const imageSource = getHospitalDetailServiceImageSource(item, serviceType);
				const optionVisual = getServiceOptionVisual(item, serviceType, accent);
				const inactiveSurfaceColor =
					(isDarkMode
						? toAccentRgba(optionVisual.accent, 0.14)
						: toAccentRgba(optionVisual.accent, 0.1)) || surfaceColor;

				return (
					<Pressable
						key={itemId}
						onPress={() =>
							isActive
								? onAdvanceSelectedService?.(item)
								: onSelectService?.(item)
						}
						style={({ pressed }) => [
							styles.optionRow,
							stageMetrics?.expanded?.rowStyle,
							index > 0 ? styles.optionRowSpaced : null,
							{
								backgroundColor: isActive ? COLORS.brandPrimary : inactiveSurfaceColor,
								opacity: pressed ? 0.94 : 1,
							},
						]}
					>
						<View style={styles.optionLead}>
							<View
								style={[
									styles.optionIconWrap,
									{
										backgroundColor: isActive
											? "rgba(255,255,255,0.14)"
											: toAccentRgba(optionVisual.accent, 0.12),
									},
								]}
							>
								<Ionicons
									name={getServiceOptionIconName(optionVisual, isActive)}
									size={18}
									color={isActive ? "#FFFFFF" : optionVisual.accent}
								/>
							</View>
							<View style={styles.optionCopy}>
						<Text
							style={[
								styles.optionTitle,
								stageMetrics?.expanded?.titleStyle,
								{ color: isActive ? "#FFFFFF" : titleColor },
							]}
							numberOfLines={1}
						>
									{item?.title || "Option"}
								</Text>
						<Text
							style={[
								styles.optionMeta,
								stageMetrics?.expanded?.metaStyle,
								{ color: isActive ? "rgba(255,255,255,0.82)" : mutedColor },
							]}
							numberOfLines={1}
						>
									{`${statusLabel} - ${priceLabel}`}
								</Text>
							</View>
						</View>
						{imageSource ? (
							<Image
								source={imageSource}
								resizeMode="contain"
								fadeDuration={0}
							style={[styles.optionImage, stageMetrics?.expanded?.imageStyle]}
						/>
						) : null}
						<Ionicons
							name="chevron-forward"
							size={16}
							color={isActive ? "#FFFFFF" : optionVisual.accent}
						/>
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
	stageMetrics,
	titleColor,
}) {
	return (
		<View>
			<Text style={[styles.sectionLabel, { color: mutedColor }]}>What to expect</Text>
			<MapStageGlassPanel
				style={[styles.featureList, stageMetrics?.panel?.cardStyle]}
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
						<Text
							style={[styles.featureText, stageMetrics?.panel?.featureStyle, { color: titleColor }]}
						>
							{feature}
						</Text>
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
	stageMetrics,
}) {
	const label = isSelected
		? serviceType === "room"
			? MAP_SERVICE_DETAIL_COPY.CONTINUE_ROOM
			: MAP_SERVICE_DETAIL_COPY.CONTINUE_TRANSPORT
		: serviceType === "room"
			? MAP_SERVICE_DETAIL_COPY.CONFIRM_ROOM
			: MAP_SERVICE_DETAIL_COPY.CONFIRM_TRANSPORT;

	return (
		<View style={[styles.footerDock, stageMetrics?.footer?.dockStyle, modalContainedStyle]}>
			<EntryActionButton
				label={label}
				onPress={onConfirm}
				variant="primary"
				height={stageMetrics?.footer?.buttonHeight || 50}
				radius={stageMetrics?.footer?.buttonRadius || 24}
				fullWidth
				style={styles.primaryButton}
			/>
		</View>
	);
}
