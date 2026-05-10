import React, { useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MapVisitDetailCollapsedRow from "../visitDetail/MapVisitDetailCollapsedRow";
import { MapTrackingTopSlot } from "../tracking/parts/MapTrackingParts";
import IntentOrb from "../../shared/IntentOrb";
import MapHistoryGroup from "../../history/MapHistoryGroup";
import styles from "./mapLocationIntent.styles";
import {
	LOCATION_INTENT_MODES,
	MANUAL_LOCATION_STEPS,
} from "./mapLocationIntent.model";
import { MAP_LOCATION_INTENT_COPY } from "./mapLocationIntent.content";
import { getPlaceOrbHierarchy, getPlaceOrbSubtext } from "./mapLocationIntent.helpers";

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

export function MapLocationIntentHeroMeta({
	label,
	iconName = "radio-button-on",
	titleColor,
	mutedColor,
	surfaceColor,
}) {
	if (!label) return null;

	return (
		<View style={[styles.currentCardMeta, { backgroundColor: surfaceColor }]}>
			<Ionicons name={iconName} size={11} color={titleColor} />
			<Text
				style={[styles.currentCardMetaText, { color: mutedColor }]}
				numberOfLines={1}
			>
				{label}
			</Text>
		</View>
	);
}

export function MapLocationIntentBodyContent({
	model,
	titleColor,
	mutedColor,
	heroSurfaceColor,
	groupSurfaceColor,
	infoSurfaceColor,
	heroGradientColors,
	heroGlowColor,
	onUseCurrentLocation,
	onOpenSearch,
	onSelectSavedPlace,
	onSelectRecentLocation,
	onOpenManualIntro,
	onStartPinAdjust,
	onConfirmSelection,
	searchQuery,
	onSearchQueryChange,
	searchResults,
	selectedLocation,
	onPickSearchResult,
	recents,
	savedPlaces,
	mode,
	manualDraft,
	onManualDraftChange,
	onNextManualStep,
	onPrevManualStep,
	onBackToDefault,
	manualStepIndex,
	isExpanded,
	isDarkMode,
	responsiveMetrics,
}) {
	const currentManualStep = MANUAL_LOCATION_STEPS[manualStepIndex] || null;
	const permissionLabel = model?.sourceLabel || "Location state";
	const isSearching = mode === LOCATION_INTENT_MODES.ADDRESS_SEARCH;
	const isManualIntro = mode === LOCATION_INTENT_MODES.MANUAL_INTRO;
	const isManualStep = mode === LOCATION_INTENT_MODES.MANUAL_STEP;
	const isConfirming =
		mode === LOCATION_INTENT_MODES.CONFIRM ||
		mode === LOCATION_INTENT_MODES.PLACE_SELECTED ||
		mode === LOCATION_INTENT_MODES.PIN_ADJUST;
	const showDefaultSections = !isManualIntro && !isManualStep && !isConfirming;
	const visibleResults = isExpanded ? searchResults.slice(0, 7) : searchResults.slice(0, 4);
	const sectionLabelStyle = responsiveMetrics?.section?.labelStyle || null;
	const sectionTriggerStyle = responsiveMetrics?.section?.triggerStyle || null;
	const recentLocationItems = recents.slice(0, 6).map((recent, index) => ({
		id: recent.id || `${recent.address || recent.label || "recent"}-${index}`,
		requestType: "visit",
		title: recent.label || "Recent location",
		subtitle: recent.address || "",
		timeLabel: recent.timeLabel || "",
		statusLabel: recent.kindLabel || "Recent",
		statusTone: "default",
		...recent,
	}));
	const recentRowMetrics = {
		iconSize: 20,
		orbSize: 40,
		gap: 12,
		titleSize: 15,
		titleLineHeight: 20,
		subtitleSize: 12,
		subtitleLineHeight: 16,
		chevronSize: 16,
	};

	return (
		<View style={styles.bodyScrollContent}>
			<View style={styles.topRow}>
				{isSearching ? (
					<View style={[styles.searchPill, styles.searchInputPill, { backgroundColor: groupSurfaceColor }]}>
						<Ionicons name="search" size={19} color={titleColor} />
						<TextInput
							value={searchQuery}
							onChangeText={onSearchQueryChange}
							placeholder={model.searchPlaceholder}
							placeholderTextColor={mutedColor}
							autoFocus
							style={[styles.searchInput, { color: titleColor }]}
						/>
					</View>
				) : (
					<Pressable
						onPress={onOpenSearch}
						accessibilityRole="button"
						accessibilityLabel="Search address or place"
						style={[styles.searchPill, { backgroundColor: groupSurfaceColor }]}
					>
						<Ionicons name="search" size={19} color={titleColor} />
						<Text style={[styles.searchText, { color: mutedColor }]}>
							{model.searchPlaceholder}
						</Text>
					</Pressable>
				)}

				<Pressable
					onPress={onOpenManualIntro}
					accessibilityRole="button"
					accessibilityLabel="Enter address manually"
					style={({ pressed }) => [
						styles.avatarPressable,
						{ transform: [{ scale: pressed ? 0.96 : 1 }] },
					]}
				>
					<LinearGradient
						colors={["#60A5FA", "#3B82F6"]}
						start={{ x: 0.18, y: 0.18 }}
						end={{ x: 0.82, y: 0.9 }}
						style={styles.avatarImageShell}
					>
						<MaterialCommunityIcons name="map-plus" size={22} color="#FFFFFF" />
					</LinearGradient>
				</Pressable>
			</View>
			{isSearching && visibleResults.length > 0 ? (
				<View style={[styles.listCard, { backgroundColor: groupSurfaceColor }]}>
					{visibleResults.map((item, index) => (
						<View key={`${item.placeId || item.primaryText}-${index}`}>
							<Pressable
								onPress={() => onPickSearchResult(item)}
								style={({ pressed }) => [
									styles.listRow,
									pressed ? styles.rowPressed : null,
								]}
							>
								<View style={styles.listRowTextWrap}>
									<Text
										style={[styles.listRowTitle, { color: titleColor }]}
										numberOfLines={1}
									>
										{item.primaryText || "Selected place"}
									</Text>
									<Text
										style={[styles.listRowSubtitle, { color: mutedColor }]}
										numberOfLines={1}
									>
										{item.secondaryText || item.formattedAddress || ""}
									</Text>
								</View>
								<Ionicons name="chevron-forward" size={16} color={mutedColor} />
							</Pressable>
							{index < visibleResults.length - 1 ? (
								<View
									style={[
										styles.rowDivider,
										{ backgroundColor: mutedColor + "35" },
									]}
								/>
							) : null}
						</View>
					))}
				</View>
			) : null}

			{showDefaultSections ? (
				<>
					<Pressable
						onPress={onUseCurrentLocation}
						accessibilityRole="button"
						accessibilityLabel={`Use pickup location: ${model.headerTitle}`}
						style={({ pressed }) => [
							styles.currentCard,
							{ backgroundColor: heroSurfaceColor },
							pressed ? styles.rowPressed : null,
						]}
					>
						{heroGradientColors?.length ? (
							<LinearGradient
								pointerEvents="none"
								colors={heroGradientColors}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={styles.currentCardGradient}
							/>
						) : null}
						<View
							pointerEvents="none"
							style={[styles.currentCardGlow, { backgroundColor: heroGlowColor }]}
						/>
						<View style={styles.currentCardContent}>
							<View
								style={[styles.currentCardAvatar, { backgroundColor: groupSurfaceColor }]}
							>
								<Ionicons name="locate-outline" size={20} color={titleColor} />
							</View>
							<View style={styles.currentCardCopy}>
								<Text style={[styles.currentCardAddress, { color: titleColor }]}>
									{model.headerTitle}
								</Text>
								<Text style={[styles.currentCardBody, { color: mutedColor }]}>
									{model.headerSubtitle}
								</Text>
							</View>
							<MapLocationIntentHeroMeta
								label={permissionLabel}
								titleColor={titleColor}
								mutedColor={mutedColor}
								surfaceColor={groupSurfaceColor}
							/>
						</View>
					</Pressable>

					<Pressable
						style={({ pressed }) => [
							styles.intentSectionHeader,
							styles.intentSectionHeaderBiased,
							styles.intentSectionHeaderTrigger,
							sectionTriggerStyle,
							pressed ? styles.sectionTriggerPressed : null,
						]}
						accessibilityRole="button"
						accessibilityLabel="Manage saved places"
					>
						<Text style={[styles.sectionLabel, sectionLabelStyle, { color: mutedColor }]}>
							{model.placesTitle}
						</Text>
						<Ionicons name="chevron-forward" size={16} color={mutedColor} />
					</Pressable>
					<View style={styles.orbRow}>
						{savedPlaces.slice(0, 3).map((place, index) => (
							<IntentOrb
								key={place.key}
								label={place.label}
								subtext={getPlaceOrbSubtext(place)}
								iconName={
									place.key === "home"
										? "home"
										: place.key === "work"
											? "briefcase"
											: "plus"
								}
								colors={MAP_LOCATION_INTENT_COPY.placesOrbColors[place.key] || MAP_LOCATION_INTENT_COPY.placesOrbColors.add}
								hierarchy={getPlaceOrbHierarchy(place, index, savedPlaces)}
								actionBias={place.key === "add" ? "primary" : index === 0 ? "primary" : index === 1 ? "leading" : "trailing"}
								onPress={() => onSelectSavedPlace(place)}
								titleColor={titleColor}
								mutedColor={mutedColor}
								primarySubtextColor={titleColor}
								responsiveStyles={responsiveMetrics?.care?.orb}
								isMutedOrb={!place.hasLocation}
							/>
						))}
					</View>

					<Pressable
						onPress={onOpenManualIntro}
						accessibilityRole="button"
						accessibilityLabel="Enter address manually"
						style={({ pressed }) => [
							styles.manualIntroCard,
							{ backgroundColor: groupSurfaceColor },
							pressed ? styles.rowPressed : null,
						]}
					>
						<View style={[styles.manualIntroIcon, { backgroundColor: infoSurfaceColor }]}>
							<MaterialCommunityIcons name="map-marker-question-outline" size={20} color={titleColor} />
						</View>
						<View style={styles.manualIntroCopy}>
							<Text style={[styles.manualTitle, { color: titleColor }]} numberOfLines={1}>
								{model.manualIntroTitle}
							</Text>
							<Text style={[styles.manualBody, { color: mutedColor }]} numberOfLines={1}>
								{model.manualActionLabel}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={17} color={mutedColor} />
					</Pressable>
				</>
			) : null}

			{isExpanded && showDefaultSections ? (
				<View style={styles.recentsSection}>
					<Pressable
						style={({ pressed }) => [
							styles.intentSectionHeader,
							styles.intentSectionHeaderBiased,
							styles.intentSectionHeaderTrigger,
							sectionTriggerStyle,
							pressed ? styles.sectionTriggerPressed : null,
						]}
						accessibilityRole="button"
						accessibilityLabel="Open recent locations"
					>
						<Text style={[styles.sectionLabel, sectionLabelStyle, { color: mutedColor }]}>
							{model.recentsTitle}
						</Text>
						<Ionicons name="chevron-forward" size={16} color={mutedColor} />
					</Pressable>
					{recentLocationItems.length > 0 ? (
						<MapHistoryGroup
							items={recentLocationItems}
							onSelectItem={onSelectRecentLocation}
							metrics={recentRowMetrics}
							containerRadius={22}
							hideRowChevron
							isDarkMode={isDarkMode}
						/>
					) : (
						<View style={[styles.emptyGroup, { backgroundColor: groupSurfaceColor }]}>
							<Text style={[styles.listRowSubtitle, { color: mutedColor }]}>
								No recent locations yet.
							</Text>
						</View>
					)}
				</View>
			) : null}

			{isManualIntro ? (
				<View style={[styles.manualStepCard, { backgroundColor: groupSurfaceColor }]}>
					<Text style={[styles.manualTitle, { color: titleColor }]}>
						{model.manualIntroTitle}
					</Text>
					<Text style={[styles.manualBody, { color: mutedColor }]}>
						{model.manualIntroBody}
					</Text>
					<View style={styles.manualStepActions}>
						<Pressable
							onPress={onPrevManualStep}
							style={({ pressed }) => [
								styles.manualStepButton,
								{ backgroundColor: infoSurfaceColor },
								pressed ? styles.rowPressed : null,
							]}
						>
							<Text
								style={[styles.manualStepButtonLabel, { color: titleColor }]}
							>
								Back
							</Text>
						</Pressable>
						<Pressable
							onPress={onNextManualStep}
							style={({ pressed }) => [
								styles.manualStepButton,
								{ backgroundColor: infoSurfaceColor },
								pressed ? styles.rowPressed : null,
							]}
						>
							<Text
								style={[styles.manualStepButtonLabel, { color: titleColor }]}
							>
								Start
							</Text>
						</Pressable>
					</View>
				</View>
			) : null}

			{isManualStep && currentManualStep ? (
				<View
					style={[
						styles.manualStepCard,
						{ backgroundColor: groupSurfaceColor },
					]}
				>
					<View style={styles.manualStepHeader}>
						<Pressable
							onPress={onBackToDefault}
							accessibilityRole="button"
							accessibilityLabel="Back to pickup choices"
							style={({ pressed }) => [
								styles.manualBackButton,
								{ backgroundColor: infoSurfaceColor },
								pressed ? styles.rowPressed : null,
							]}
						>
							<Ionicons name="chevron-back" size={16} color={titleColor} />
							<Text style={[styles.manualStepButtonLabel, { color: titleColor }]}>
								Pickup
							</Text>
						</Pressable>
						<Text style={[styles.manualStepProgress, { color: mutedColor }]}>
							{manualStepIndex + 1} of {MANUAL_LOCATION_STEPS.length}
						</Text>
					</View>
					<Text style={[styles.manualStepLabel, { color: titleColor }]}>
						{currentManualStep.label}
					</Text>
					{currentManualStep.inputType === "country" ? (
						<View
							accessibilityLabel="Choose country or region"
							style={[
								styles.manualSelectInput,
								{ backgroundColor: infoSurfaceColor },
							]}
						>
							<Text
								style={[
									styles.manualSelectText,
									{ color: manualDraft.country ? titleColor : mutedColor },
								]}
							>
								{manualDraft.country || currentManualStep.placeholder}
							</Text>
							<Ionicons name="chevron-forward" size={16} color={mutedColor} />
						</View>
					) : (
						<TextInput
							value={manualDraft[currentManualStep.key] || ""}
							onChangeText={(value) =>
								onManualDraftChange(currentManualStep.key, value)
							}
							placeholder={currentManualStep.placeholder}
							placeholderTextColor={mutedColor}
							style={[
								styles.manualTextInput,
								{ backgroundColor: infoSurfaceColor, color: titleColor },
							]}
						/>
					)}
					<View style={styles.manualStepActions}>
						<Pressable
							style={[
								styles.manualStepButton,
								{ backgroundColor: infoSurfaceColor },
							]}
							onPress={onPrevManualStep}
						>
							<Text
								style={[styles.manualStepButtonLabel, { color: titleColor }]}
							>
								Back
							</Text>
						</Pressable>
						<Pressable
							style={[
								styles.manualStepButton,
								{ backgroundColor: infoSurfaceColor },
							]}
							onPress={onNextManualStep}
						>
							<Text
								style={[styles.manualStepButtonLabel, { color: titleColor }]}
							>
								{manualStepIndex >= MANUAL_LOCATION_STEPS.length - 1
									? "Confirm on map"
									: "Next"}
							</Text>
						</Pressable>
					</View>
				</View>
			) : null}

			{mode === LOCATION_INTENT_MODES.CONFIRM ||
			mode === LOCATION_INTENT_MODES.PLACE_SELECTED ||
			mode === LOCATION_INTENT_MODES.PIN_ADJUST ? (
				<View
					style={[
						styles.manualStepCard,
						{ backgroundColor: groupSurfaceColor },
					]}
				>
					<Text style={[styles.manualTitle, { color: titleColor }]}>
						Confirm selected location
					</Text>
					<Text style={[styles.manualBody, { color: mutedColor }]}>
						{selectedLocation?.address ||
							selectedLocation?.label ||
							"Use this location for pickup, nearby care, and pricing."}
					</Text>
					<View style={styles.manualAction}>
						{selectedLocation?.source === "manual" ? (
							<Pressable
								onPress={onBackToDefault}
								accessibilityRole="button"
								accessibilityLabel="Back to pickup choices"
								style={styles.confirmBackAction}
							>
								<Text style={[styles.manualStepButtonLabel, { color: mutedColor }]}>
									Pickup
								</Text>
							</Pressable>
						) : null}
						<Pressable
							onPress={onConfirmSelection}
							accessibilityRole="button"
							accessibilityLabel="Use this location"
							style={({ pressed }) => [
								styles.confirmUseAction,
								pressed ? styles.rowPressed : null,
							]}
						>
							<Text style={[styles.manualStepButtonLabel, { color: titleColor }]}>
								Use this location
							</Text>
							<Ionicons name="checkmark-circle" size={17} color={titleColor} />
						</Pressable>
					</View>
				</View>
			) : null}
		</View>
	);
}
