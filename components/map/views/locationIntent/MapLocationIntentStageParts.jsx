import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";

// Styles
const styles = StyleSheet.create({
	topRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 8,
	},
	topRowCollapsed: {
		paddingTop: 16,
		paddingBottom: 16,
	},
	locationPill: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		flex: 1,
		marginRight: 12,
	},
	locationPillCollapsed: {
		paddingVertical: 10,
	},
	locationText: {
		fontSize: 16,
		fontWeight: "600",
		marginLeft: 8,
		flex: 1,
	},
	locationHeader: {
		flex: 1,
		marginRight: 16,
	},
	locationTitle: {
		fontSize: 20,
		fontWeight: "700",
		lineHeight: 24,
	},
	locationSubtitle: {
		fontSize: 15,
		fontWeight: "400",
		lineHeight: 20,
		marginTop: 2,
	},
	closeButton: {
		marginLeft: 8,
	},
	bodyContent: {
		padding: 16,
	},
	section: {
		marginBottom: 24,
	},
	statusSection: {
		alignItems: "center",
		paddingVertical: 24,
	},
	statusIcon: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
	},
	statusTitle: {
		fontSize: 22,
		fontWeight: "700",
		textAlign: "center",
		marginBottom: 8,
	},
	statusSubtitle: {
		fontSize: 16,
		fontWeight: "400",
		textAlign: "center",
		lineHeight: 22,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 12,
	},
	option: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		borderRadius: 12,
		borderCurve: "continuous",
		marginBottom: 8,
	},
	optionLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	optionText: {
		marginLeft: 12,
		flex: 1,
	},
	optionTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 2,
	},
	optionSubtitle: {
		fontSize: 14,
		fontWeight: "400",
		lineHeight: 18,
	},
});

// Responsive styles function
const getMapLocationIntentStageResponsiveStyles = (presentationMode, contentMaxWidth) => {
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: {};

	return {
		topRow: modalContainedStyle,
		topRowCollapsed: modalContainedStyle,
		locationPill: modalContainedStyle,
		locationPillCollapsed: modalContainedStyle,
		locationText: {},
		locationHeader: modalContainedStyle,
		locationTitle: {},
		locationSubtitle: {},
		closeButton: {},
		bodyContent: modalContainedStyle,
		section: {},
		statusSection: {},
		statusIcon: {},
		statusTitle: {},
		statusSubtitle: {},
		sectionTitle: {},
		option: modalContainedStyle,
		optionLeft: {},
		optionText: {},
		optionTitle: {},
		optionSubtitle: {},
	};
};

export function MapLocationIntentCollapsedTopRow({
	responsiveStyles,
	modalContainedStyle,
	tokens,
	onExpand,
	onClose,
	currentLocation,
	isDarkMode,
}) {
	const street = currentLocation?.street || "Set location";
	const city = currentLocation?.city || "";
	const state = currentLocation?.state || "";
	const locationText = city && state ? `${street}, ${city}, ${state}` : street;

	return (
		<View style={[styles.topRow, responsiveStyles?.topRow || {}, styles.topRowCollapsed, responsiveStyles?.topRowCollapsed || {}, modalContainedStyle]}>
			<Pressable
				onPress={onExpand}
				style={[
					styles.locationPill,
					responsiveStyles?.locationPill || {},
					styles.locationPillCollapsed,
					responsiveStyles?.locationPillCollapsed || {},
					{
						borderRadius: tokens.cardRadius,
						borderCurve: "continuous",
						backgroundColor: tokens.searchSurface,
					},
				]}
			>
				<Ionicons name="location" size={18} color={tokens.titleColor} />
				<Text style={[styles.locationText, responsiveStyles?.locationText || {}, { color: tokens.titleColor }]} numberOfLines={1}>
					{locationText}
				</Text>
			</Pressable>

			<MapHeaderIconButton
				onPress={onClose}
				accessibilityLabel="Close location"
				backgroundColor={tokens.closeSurface}
				color={tokens.titleColor}
				style={[
					styles.closeButton,
					responsiveStyles?.closeButton || {},
				]}
			/>
		</View>
	);
}

export function MapLocationIntentActiveTopRow({
	responsiveStyles,
	modalContainedStyle,
	tokens,
	onClose,
	currentLocation,
	isDarkMode,
}) {
	const street = currentLocation?.street || "Set location";
	const city = currentLocation?.city || "";
	const state = currentLocation?.state || "";
	const locationText = city && state ? `${street}, ${city}, ${state}` : street;

	return (
		<View style={[styles.topRow, responsiveStyles?.topRow || {}, modalContainedStyle]}>
			<View style={[styles.locationHeader, responsiveStyles?.locationHeader || {}]}>
				<Text style={[styles.locationTitle, responsiveStyles?.locationTitle || {}, { color: tokens.titleColor }]}>
					{street}
				</Text>
				{(city || state) && (
					<Text style={[styles.locationSubtitle, responsiveStyles?.locationSubtitle || {}, { color: tokens.bodyColor }]}>
						{city && state ? `${city}, ${state}` : city || state}
					</Text>
				)}
			</View>

			<MapHeaderIconButton
				onPress={onClose}
				accessibilityLabel="Close location"
				backgroundColor={tokens.closeSurface}
				color={tokens.titleColor}
				style={[
					styles.closeButton,
					responsiveStyles?.closeButton || {},
				]}
			/>
		</View>
	);
}

export function MapLocationIntentBodyContent({
	responsiveStyles,
	tokens,
	onOpenSearch,
	onOpenProfile,
	isDarkMode,
}) {
	return (
		<View style={[styles.bodyContent, responsiveStyles?.bodyContent || {}]}>
			{/* Status Section */}
			<View style={[styles.section, styles.statusSection]}>
				<View style={[styles.statusIcon, { backgroundColor: tokens.brandPrimary + "20" }]}>
					<Ionicons 
						name="location-outline" 
						size={32} 
						color={tokens.brandPrimary || "#0EA5E9"} 
					/>
				</View>
				<Text style={[styles.statusTitle, { color: tokens.titleColor }]}>
					Location Services
				</Text>
				<Text style={[styles.statusSubtitle, { color: tokens.mutedText }]}>
					Coming soon
				</Text>
			</View>

			{/* Options Section */}
			<View style={styles.section}>
				<Text style={[styles.sectionTitle, { color: tokens.mutedText }]}>
					Set location
				</Text>
				
				{/* Search Option */}
				<Pressable
					onPress={onOpenSearch}
					style={[styles.option, { backgroundColor: tokens.cardSurface }]}
				>
					<View style={styles.optionLeft}>
						<Ionicons 
							name="search" 
							size={20} 
							color={tokens.titleColor} 
						/>
						<View style={styles.optionText}>
							<Text style={[styles.optionTitle, { color: tokens.titleColor }]}>
								Search location
							</Text>
							<Text style={[styles.optionSubtitle, { color: tokens.mutedText }]}>
								Set location using search
							</Text>
						</View>
					</View>
					<Ionicons 
						name="chevron-forward" 
						size={16} 
						color={tokens.mutedText} 
					/>
				</Pressable>

				{/* Profile Option */}
				<Pressable
					onPress={onOpenProfile}
					style={[styles.option, { backgroundColor: tokens.cardSurface }]}
				>
					<View style={styles.optionLeft}>
						<Ionicons 
							name="person-outline" 
							size={20} 
							color={tokens.titleColor} 
						/>
						<View style={styles.optionText}>
							<Text style={[styles.optionTitle, { color: tokens.titleColor }]}>
								Profile settings
							</Text>
							<Text style={[styles.optionSubtitle, { color: tokens.mutedText }]}>
								Manage saved locations
							</Text>
						</View>
					</View>
					<Ionicons 
						name="chevron-forward" 
						size={16} 
						color={tokens.mutedText} 
					/>
				</Pressable>
			</View>
		</View>
	);
}

// Export the responsive styles function
export { getMapLocationIntentStageResponsiveStyles };
