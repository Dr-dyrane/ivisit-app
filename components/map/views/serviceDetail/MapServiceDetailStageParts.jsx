import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../../../constants/colors";
import MapStageGlassPanel from "../shared/MapStageGlassPanel";
import styles from "./mapServiceDetailStage.styles";

export function MapServiceDetailTopSlot({ title, onClose, titleColor, closeSurface }) {
	return (
		<View style={styles.topSlot}>
			<View style={styles.topSlotSpacer} />
			<Text numberOfLines={1} style={[styles.topSlotTitle, { color: titleColor }]}>
				{title}
			</Text>
			<Pressable onPress={onClose} style={styles.topSlotAction}>
				{({ pressed }) => (
					<View
						style={[
							styles.topSlotCloseButton,
							{ backgroundColor: closeSurface },
							pressed ? styles.topSlotPressed : null,
						]}
					>
						<Ionicons name="close" size={18} color={titleColor} />
					</View>
				)}
			</Pressable>
		</View>
	);
}

export function MapServiceDetailHeader({
	accent,
	copy,
	glassTokens,
	isDarkMode,
	mutedColor,
	panHandlers,
	servicePositionLabel,
	serviceType,
	surfaceColor,
}) {
	return (
		<MapStageGlassPanel
			style={styles.headerBlock}
			backgroundColor={surfaceColor}
			glassTokens={glassTokens}
			isDarkMode={isDarkMode}
			panHandlers={panHandlers}
		>
			<View style={styles.headerMetaRow}>
				<Text style={[styles.eyebrow, { color: accent }]}>
					{serviceType === "room" ? "Room option" : "Transport"}
				</Text>
				{servicePositionLabel ? (
					<Text style={[styles.positionLabel, { color: mutedColor }]}>{servicePositionLabel}</Text>
				) : null}
			</View>
			<Text style={[styles.summary, { color: mutedColor }]}>{copy.summary}</Text>
		</MapStageGlassPanel>
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
	return (
		<View style={[styles.footerDock, modalContainedStyle]}>
			<Pressable
				onPress={onConfirm}
				style={[
					styles.primaryButton,
					{ backgroundColor: isSelected ? "rgba(134,16,14,0.72)" : COLORS.brandPrimary },
				]}
			>
				<Text style={styles.primaryButtonText}>
					{isSelected
						? serviceType === "room"
							? "Room selected"
							: "Transport selected"
						: serviceType === "room"
							? "Select room"
							: "Select transport"}
				</Text>
			</Pressable>
		</View>
	);
}
