import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EmergencySearchBar from "../../../emergency/EmergencySearchBar";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import MapSearchSheetSections from "../../surfaces/search/MapSearchSheetSections";
import MapExploreIntentProfileTrigger from "../exploreIntent/MapExploreIntentProfileTrigger";
import { styles as searchStyles } from "../../surfaces/search/mapSearchSheet.styles";
import styles from "./mapSearchStage.styles";

export function MapSearchCollapsedTopRow({
	modalContainedStyle,
	tokens,
	onExpand,
	onOpenProfile,
	profileImageSource,
	isSignedIn,
	isDarkMode,
}) {
	return (
		<View style={[styles.topRow, styles.topRowCollapsed, modalContainedStyle]}>
			<Pressable
				onPress={onExpand}
				style={[
					styles.searchPill,
					styles.searchPillCollapsed,
					{
						borderRadius: tokens.cardRadius,
						borderCurve: "continuous",
						backgroundColor: tokens.searchSurface,
					},
				]}
			>
				<Ionicons name="search" size={18} color={tokens.titleColor} />
				<Text style={[styles.searchText, { color: tokens.titleColor }]}>Search</Text>
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
	modalContainedStyle,
	searchInputRef,
	model,
	snapState,
	handleExpand,
	tokens,
	isDarkMode,
}) {
	return (
		<View style={[styles.topRow, modalContainedStyle]}>
			<EmergencySearchBar
				ref={searchInputRef}
				value={model.query}
				onChangeText={model.setSearchQuery}
				onFocus={() => {
					if (snapState === MAP_SHEET_SNAP_STATES.HALF) {
						handleExpand();
					}
				}}
				onBlur={() => model.commitQuery(model.query)}
				onClear={() => model.setSearchQuery("")}
				placeholder="Search hospitals, specialties, or area"
				showSuggestions={false}
				autoFocus={false}
				compact
				style={[searchStyles.searchBar, styles.activeSearchBar]}
			/>
			<Pressable
				onPress={model.handleDismiss}
				hitSlop={10}
				style={[
					styles.closeButton,
					model.isDismissing && styles.closeButtonDisabled,
					{ backgroundColor: tokens.closeSurface },
				]}
			>
				<Ionicons name="close" size={17} color={model.titleColor} />
			</Pressable>
		</View>
	);
}

export function MapSearchBodyContent({ model }) {
	return (
		<View style={searchStyles.content}>
			<MapSearchSheetSections model={model} />
		</View>
	);
}
