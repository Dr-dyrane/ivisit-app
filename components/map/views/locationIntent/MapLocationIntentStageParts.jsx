import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MapVisitDetailCollapsedRow from "../visitDetail/MapVisitDetailCollapsedRow";
import { MapTrackingTopSlot } from "../tracking/parts/MapTrackingParts";
import IntentOrb from "../../shared/IntentOrb";
import MapHistoryGroup from "../../history/MapHistoryGroup";
import styles from "./mapLocationIntent.styles";
import useResponsiveSurfaceMetrics from "../../../../hooks/ui/useResponsiveSurfaceMetrics";
import {
	ResultsSection,
	SearchResultRow,
} from "../../surfaces/search/MapSearchSheetSections";
import {
	getMapSearchSheetResponsiveStyles,
	styles as searchStyles,
} from "../../surfaces/search/mapSearchSheet.styles";
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

function formatLocationHeaderText(value) {
	const text = String(value || "").trim();
	if (!text) return "";

	// UI-only rollback note: top-slot labels should read as headings even when
	// data keys are lowercase. Keep this out of storage/address normalization so
	// provider/user address casing remains untouched.
	return text.replace(/\S+/g, (token) => {
		const bare = token.replace(/[^A-Za-z]/g, "");
		if (!bare) return token;
		if (bare.length <= 3 && bare === bare.toUpperCase()) return token;

		return token.replace(/[A-Za-z][A-Za-z']*/g, (word) => {
			if (word.length <= 3 && word === word.toUpperCase()) return word;
			return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
		});
	});
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
			title={formatLocationHeaderText(model.headerTitle)}
			subtitle={formatLocationHeaderText(model.headerSubtitle)}
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
	closeAccessibilityLabel = "Close location sheet",
	showToggle = true,
}) {
	return (
		<MapTrackingTopSlot
			title={formatLocationHeaderText(model.headerTitle)}
			subtitle={formatLocationHeaderText(model.headerSubtitle)}
			titleColor={titleColor}
			mutedColor={mutedColor}
			actionSurfaceColor={actionSurfaceColor}
			onToggle={onToggle}
			showToggle={showToggle}
			toggleIconName={toggleIconName}
			toggleAccessibilityLabel={toggleAccessibilityLabel}
			showClose
			onClose={onClose}
			closeAccessibilityLabel={closeAccessibilityLabel}
		/>
	);
}

export function MapLocationIntentHeroMeta({
	label,
	iconName = "radio-button-on",
	titleColor,
	mutedColor,
	surfaceColor,
	onPress,
}) {
	if (!label) return null;
	const content = (
		<>
			<Ionicons name={iconName} size={11} color={titleColor} />
			<Text
				style={[styles.currentCardMetaText, { color: mutedColor }]}
				numberOfLines={1}
			>
				{label}
			</Text>
		</>
	);

	if (typeof onPress === "function") {
		return (
			<Pressable
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={label}
				style={({ pressed }) => [
					styles.currentCardMeta,
					{ backgroundColor: surfaceColor },
					pressed ? styles.rowPressed : null,
				]}
			>
				{content}
			</Pressable>
		);
	}

	return (
		<View style={[styles.currentCardMeta, { backgroundColor: surfaceColor }]}>
			{content}
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
	recentSearchQueries,
	onSelectRecentSearch,
	isSearchingLocations,
	locationSearchError,
	selectedLocation,
	onPickSearchResult,
	onSaveSelectedLocationAs,
	recents,
	savedPlaces,
	mode,
	manualDraft,
	onManualDraftChange,
	onNextManualStep,
	onPrevManualStep,
	onBackToDefault,
	onOpenCountryPicker,
	manualError,
	manualNextActionLabel,
	isResolvingManual,
	savedPlaceFeedback,
	manualStepIndex,
	isExpanded,
	isDarkMode,
	responsiveMetrics,
}) {
	const searchViewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "sheet" });
	const searchResponsiveStyles = useMemo(
		() => getMapSearchSheetResponsiveStyles(searchViewportMetrics),
		[searchViewportMetrics],
	);
	const currentManualStep = MANUAL_LOCATION_STEPS[manualStepIndex] || null;
	const permissionLabel = model?.sourceLabel || "Location state";
	const isSearching = mode === LOCATION_INTENT_MODES.ADDRESS_SEARCH;
	const isManualStep = mode === LOCATION_INTENT_MODES.MANUAL_STEP;
	const isConfirming =
		mode === LOCATION_INTENT_MODES.CONFIRM ||
		mode === LOCATION_INTENT_MODES.PLACE_SELECTED ||
		mode === LOCATION_INTENT_MODES.PIN_ADJUST;
	const showDefaultSections = !isSearching && !isManualStep && !isConfirming;
	const visibleResults = isExpanded ? searchResults.slice(0, 7) : searchResults.slice(0, 4);
	const visibleRecentSearches = Array.isArray(recentSearchQueries)
		? recentSearchQueries.slice(0, isExpanded ? 8 : 4)
		: [];
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
	const isDevicePickup = model?.sourceLabel === MAP_LOCATION_INTENT_COPY.sourceLabels.device;
	const heroActionLabel = model?.shouldOpenSettings
		? "Settings"
		: isDevicePickup
			? "Change"
			: "Use device";
	const handleHeroAction = isDevicePickup ? onOpenSearch : onUseCurrentLocation;
	const pendingPlaceLabel = selectedLocation?.pendingPlaceLabel;
	const pendingPlaceTitle =
		pendingPlaceLabel === "home"
			? "Set Home"
			: pendingPlaceLabel === "work"
				? "Set Work"
				: pendingPlaceLabel === "other"
					? "Save place"
					: null;
	const savedPlaceText =
		savedPlaceFeedback === "home"
			? "Saved Home"
			: savedPlaceFeedback === "work"
				? "Saved Work"
				: savedPlaceFeedback
					? "Saved place"
					: null;
	const canSaveCandidate = ["manual", "search", "recent"].includes(
		selectedLocation?.source,
	);
	const primaryCandidateActionLabel = pendingPlaceTitle || "Use this location";
	const handlePrimaryCandidateAction = pendingPlaceLabel
		? () => onSaveSelectedLocationAs?.(pendingPlaceLabel)
		: onConfirmSelection;

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
			{isSearching ? (
				<View style={styles.searchModeBody}>
					{searchQuery.trim().length < 2 ? (
						<View style={[searchStyles.resultGroup, { backgroundColor: groupSurfaceColor }]}>
							<SearchResultRow
								iconName="locate-outline"
								title={model.headerTitle}
								subtitle={model.headerSubtitle}
								meta="Current pickup"
								titleColor={titleColor}
								mutedColor={mutedColor}
								surfaceColor={heroSurfaceColor}
								isDarkMode={isDarkMode}
								onPress={onUseCurrentLocation}
								responsiveStyles={searchResponsiveStyles}
							/>
						</View>
					) : null}
					{visibleResults.length > 0 ? (
						<ResultsSection
							title="Places"
							items={visibleResults.map((item, index) => ({
								...item,
								key: item?.placeId || item?.primaryText || `place-${index}`,
							}))}
							titleColor={mutedColor}
							groupedSurface={groupSurfaceColor}
							isDarkMode={isDarkMode}
							rowDividerColor={mutedColor + "30"}
							responsiveStyles={searchResponsiveStyles}
							renderItem={(item, index) => (
								<SearchResultRow
									iconName="location-outline"
									title={item?.primaryText || "Selected location"}
									subtitle={item?.secondaryText || item?.formattedAddress || ""}
									meta={index === 0 ? "Best match" : "Use this place"}
									titleColor={titleColor}
									mutedColor={mutedColor}
									surfaceColor={heroSurfaceColor}
									isDarkMode={isDarkMode}
									onPress={() => onPickSearchResult(item)}
									responsiveStyles={searchResponsiveStyles}
								/>
							)}
						/>
					) : null}
					{visibleRecentSearches.length > 0 ? (
						<ResultsSection
							title="Recent"
							items={visibleRecentSearches.map((query, index) => ({
								key: `${query}-${index}`,
								query,
							}))}
							titleColor={mutedColor}
							groupedSurface={groupSurfaceColor}
							isDarkMode={isDarkMode}
							rowDividerColor={mutedColor + "30"}
							responsiveStyles={searchResponsiveStyles}
							renderItem={(item) => (
								<SearchResultRow
									iconName="time-outline"
									title={item.query}
									titleColor={titleColor}
									mutedColor={mutedColor}
									surfaceColor={heroSurfaceColor}
									isDarkMode={isDarkMode}
									onPress={() => onSelectRecentSearch?.(item.query)}
									responsiveStyles={searchResponsiveStyles}
								/>
							)}
						/>
					) : null}
					{isSearchingLocations && visibleResults.length === 0 ? (
						<View style={[searchStyles.resultGroup, { backgroundColor: groupSurfaceColor }]}>
							<View style={[searchStyles.loadingRow, searchResponsiveStyles.loadingRow]}>
								<ActivityIndicator size="small" color={titleColor} />
								<Text style={[searchStyles.loadingText, searchResponsiveStyles.loadingText, { color: mutedColor }]}>
									Looking for places nearby
								</Text>
							</View>
						</View>
					) : null}
					{locationSearchError ? (
						<Text style={[styles.manualErrorText, { color: "#EF4444" }]}>
							{locationSearchError}
						</Text>
					) : null}
					{searchQuery.trim().length >= 2 &&
					!isSearchingLocations &&
					visibleResults.length === 0 &&
					!locationSearchError ? (
						<View style={[searchStyles.emptyState, searchResponsiveStyles.emptyState, { backgroundColor: groupSurfaceColor }]}>
							<View style={[searchStyles.emptyIconWrap, searchResponsiveStyles.emptyIconWrap]}>
								<Ionicons name="location-outline" size={22} color={titleColor} />
							</View>
							<Text style={[searchStyles.emptyTitle, searchResponsiveStyles.emptyTitle, { color: titleColor }]}>
								No address match yet
							</Text>
							<Text style={[searchStyles.emptyBody, searchResponsiveStyles.emptyBody, { color: mutedColor }]}>
								Try a street, landmark, city, or enter the pickup manually.
							</Text>
						</View>
					) : null}
				</View>
			) : null}

			{showDefaultSections ? (
				<>
					<Pressable
						onPress={handleHeroAction}
						accessibilityRole="button"
						accessibilityLabel={`Use pickup location: ${model.headerTitle}`}
						style={[
							styles.currentCard,
							{ backgroundColor: heroSurfaceColor },
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
								label={heroActionLabel || permissionLabel}
								titleColor={titleColor}
								mutedColor={mutedColor}
								surfaceColor={groupSurfaceColor}
								onPress={handleHeroAction}
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
						{currentManualStep.question || currentManualStep.label}
					</Text>
					{currentManualStep.helperText ? (
						<Text style={[styles.manualStepHelper, { color: mutedColor }]}>
							{currentManualStep.helperText}
						</Text>
					) : null}
					<View style={styles.manualProgressTrack} accessibilityElementsHidden>
						{MANUAL_LOCATION_STEPS.map((step, index) => (
							<View
								key={step.key}
								style={[
									styles.manualProgressSegment,
									{
										backgroundColor:
											index <= manualStepIndex ? titleColor : mutedColor + "30",
									},
								]}
							/>
						))}
					</View>
					{currentManualStep.inputType === "country" ? (
						<Pressable
							onPress={onOpenCountryPicker}
							accessibilityRole="button"
							accessibilityLabel="Choose country or region"
							style={({ pressed }) => [
								styles.manualSelectInput,
								{ backgroundColor: infoSurfaceColor },
								pressed ? styles.rowPressed : null,
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
							{manualDraft.countryCode ? (
								<Text style={[styles.manualSelectMeta, { color: mutedColor }]}>
									{manualDraft.countryCode}
								</Text>
							) : null}
							<Ionicons name="chevron-forward" size={16} color={mutedColor} />
						</Pressable>
					) : (
						<TextInput
							key={currentManualStep.key}
							value={manualDraft[currentManualStep.key] || ""}
							onChangeText={(value) =>
								onManualDraftChange(currentManualStep.key, value)
							}
							placeholder={currentManualStep.placeholder}
							placeholderTextColor={mutedColor}
							autoCapitalize={currentManualStep.autoCapitalize || "sentences"}
							autoCorrect={false}
							autoFocus
							multiline={Boolean(currentManualStep.multiline)}
							returnKeyType={
								manualStepIndex >= MANUAL_LOCATION_STEPS.length - 1
									? "done"
									: "next"
							}
							onSubmitEditing={
								currentManualStep.multiline ? undefined : onNextManualStep
							}
							style={[
								styles.manualTextInput,
								currentManualStep.multiline ? styles.manualTextInputMultiline : null,
								{ backgroundColor: infoSurfaceColor, color: titleColor },
							]}
						/>
					)}
					{currentManualStep.optional ? (
						<Text style={[styles.manualOptionalText, { color: mutedColor }]}>
							Optional
						</Text>
					) : null}
					{manualError ? (
						<Text style={[styles.manualErrorText, { color: "#EF4444" }]}>
							{manualError}
						</Text>
					) : null}
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
							disabled={isResolvingManual}
							style={({ pressed }) => [
								styles.manualStepButton,
								styles.manualStepButtonPrimary,
								{ backgroundColor: infoSurfaceColor },
								pressed ? styles.rowPressed : null,
								isResolvingManual ? styles.manualStepButtonDisabled : null,
							]}
							onPress={onNextManualStep}
						>
							{isResolvingManual ? (
								<ActivityIndicator size="small" color={titleColor} />
							) : null}
							<Text style={[styles.manualStepButtonLabel, { color: titleColor }]}>
								{manualNextActionLabel || "Next"}
							</Text>
						</Pressable>
					</View>
				</View>
			) : null}

			{mode === LOCATION_INTENT_MODES.CONFIRM ||
			mode === LOCATION_INTENT_MODES.PLACE_SELECTED ||
			mode === LOCATION_INTENT_MODES.PIN_ADJUST ? (
				<View style={styles.candidateDecisionStack}>
					<View style={[searchStyles.resultGroup, { backgroundColor: groupSurfaceColor }]}>
						<SearchResultRow
							iconName="location-outline"
							title={selectedLocation?.label || pendingPlaceTitle || "Selected location"}
							subtitle={
								selectedLocation?.address ||
								"Use this location for pickup, nearby care, and pricing."
							}
							meta={pendingPlaceTitle || "Selected address"}
							titleColor={titleColor}
							mutedColor={mutedColor}
							surfaceColor={heroSurfaceColor}
							isDarkMode={isDarkMode}
							isSelected
							responsiveStyles={searchResponsiveStyles}
						/>
					</View>

					<View style={[styles.candidateActionGroup, { backgroundColor: groupSurfaceColor }]}>
						<Pressable
							onPress={handlePrimaryCandidateAction}
							accessibilityRole="button"
							accessibilityLabel={primaryCandidateActionLabel}
							style={({ pressed }) => [
								styles.candidateActionRow,
								pressed ? styles.rowPressed : null,
							]}
						>
							<View style={[styles.candidateActionIcon, { backgroundColor: infoSurfaceColor }]}>
								<Ionicons name="checkmark-circle-outline" size={18} color={titleColor} />
							</View>
							<Text style={[styles.candidateActionText, { color: titleColor }]}>
								{primaryCandidateActionLabel}
							</Text>
							<Ionicons name="chevron-forward" size={16} color={mutedColor} />
						</Pressable>

						{canSaveCandidate && !savedPlaceText ? (
							<>
								<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
								<Pressable
									onPress={() => onSaveSelectedLocationAs?.("home")}
									style={({ pressed }) => [
										styles.candidateActionRow,
										pressed ? styles.rowPressed : null,
									]}
								>
									<View style={[styles.candidateActionIcon, { backgroundColor: infoSurfaceColor }]}>
										<Ionicons name="home-outline" size={18} color={titleColor} />
									</View>
									<Text style={[styles.candidateActionText, { color: titleColor }]}>
										Set as Home
									</Text>
									<Ionicons name="chevron-forward" size={16} color={mutedColor} />
								</Pressable>
								<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
								<Pressable
									onPress={() => onSaveSelectedLocationAs?.("work")}
									style={({ pressed }) => [
										styles.candidateActionRow,
										pressed ? styles.rowPressed : null,
									]}
								>
									<View style={[styles.candidateActionIcon, { backgroundColor: infoSurfaceColor }]}>
										<Ionicons name="briefcase-outline" size={18} color={titleColor} />
									</View>
									<Text style={[styles.candidateActionText, { color: titleColor }]}>
										Set as Work
									</Text>
									<Ionicons name="chevron-forward" size={16} color={mutedColor} />
								</Pressable>
								<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
								<Pressable
									onPress={() => onSaveSelectedLocationAs?.("other")}
									style={({ pressed }) => [
										styles.candidateActionRow,
										pressed ? styles.rowPressed : null,
									]}
								>
									<View style={[styles.candidateActionIcon, { backgroundColor: infoSurfaceColor }]}>
										<Ionicons name="bookmark-outline" size={18} color={titleColor} />
									</View>
									<Text style={[styles.candidateActionText, { color: titleColor }]}>
										Save place
									</Text>
									<Ionicons name="chevron-forward" size={16} color={mutedColor} />
								</Pressable>
							</>
						) : null}

						{savedPlaceText ? (
							<>
								<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
								<View style={styles.candidateActionRow}>
									<View style={[styles.candidateActionIcon, { backgroundColor: infoSurfaceColor }]}>
										<Ionicons name="checkmark-circle" size={18} color={titleColor} />
									</View>
									<Text style={[styles.candidateActionText, { color: titleColor }]}>
										{savedPlaceText}
									</Text>
								</View>
							</>
						) : null}

						{canSaveCandidate ? (
							<>
								<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
								<Pressable
									onPress={onBackToDefault}
									style={({ pressed }) => [
										styles.candidateActionRow,
										pressed ? styles.rowPressed : null,
									]}
								>
									<View style={[styles.candidateActionIcon, { backgroundColor: infoSurfaceColor }]}>
										<Ionicons name="chevron-back" size={18} color={titleColor} />
									</View>
									<Text style={[styles.candidateActionText, { color: mutedColor }]}>
										Pick another location
									</Text>
								</Pressable>
							</>
						) : null}
					</View>
				</View>
			) : null}
		</View>
	);
}
