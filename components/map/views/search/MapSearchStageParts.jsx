import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EmergencySearchBar from "../../../emergency/EmergencySearchBar";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import MapSearchSheetSections from "../../surfaces/search/MapSearchSheetSections";
import MapExploreIntentProfileTrigger from "../exploreIntent/MapExploreIntentProfileTrigger";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import { styles as searchStyles } from "../../surfaces/search/mapSearchSheet.styles";
import styles from "./mapSearchStage.styles";

export function MapSearchCollapsedTopRow({
	responsiveStyles,
	modalContainedStyle,
	tokens,
	onExpand,
	onOpenProfile,
	profileImageSource,
	isSignedIn,
	isDarkMode,
}) {
	return (
		<View style={[styles.topRow, responsiveStyles.topRow, styles.topRowCollapsed, modalContainedStyle]}>
			<Pressable
				onPress={onExpand}
				style={[
					styles.searchPill,
					responsiveStyles.searchPill,
					styles.searchPillCollapsed,
					responsiveStyles.searchPillCollapsed,
					{
						borderRadius: tokens.cardRadius,
						borderCurve: "continuous",
						backgroundColor: tokens.searchSurface,
					},
				]}
			>
				<Ionicons name="search" size={18} color={tokens.titleColor} />
				<Text style={[styles.searchText, responsiveStyles.searchText, { color: tokens.titleColor }]}>Search</Text>
			</Pressable>

			<MapExploreIntentProfileTrigger
				onPress={onOpenProfile}
				userImageSource={profileImageSource}
				isSignedIn={isSignedIn}
				isCollapsed
			/>
		</View>
	);
}

export function MapSearchActiveTopRow({
	responsiveStyles,
	modalContainedStyle,
	searchInputRef,
	model,
	snapState,
	handleExpand,
	onSearchFocus,
	onSearchBlur,
	tokens,
	isDarkMode,
}) {
	return (
		<View style={[styles.topRow, responsiveStyles.topRow, modalContainedStyle]}>
			<EmergencySearchBar
				ref={searchInputRef}
				value={model.query}
				onChangeText={model.setSearchQuery}
				onFocus={() => {
					onSearchFocus?.();
					if (snapState === MAP_SHEET_SNAP_STATES.HALF) {
						handleExpand();
					}
				}}
				onBlur={() => {
					onSearchBlur?.();
					model.commitQuery(model.query);
				}}
				onClear={() => model.setSearchQuery("")}
				placeholder="Search hospitals, specialties, or area"
				showSuggestions={false}
				autoFocus={false}
				compact
				style={[searchStyles.searchBar, styles.activeSearchBar]}
			/>
			<MapHeaderIconButton
				onPress={model.handleDismiss}
				accessibilityLabel="Close search"
				backgroundColor={tokens.closeSurface}
				color={model.titleColor}
				style={[
					styles.closeButton,
					responsiveStyles.closeButton,
					model.isDismissing && styles.closeButtonDisabled,
				]}
			/>
		</View>
	);
}

export function MapSearchBodyContent({ model, responsiveStyles }) {
	return (
		<View style={searchStyles.content}>
			<MapSearchSheetSections model={model} />
		</View>
	);
}
