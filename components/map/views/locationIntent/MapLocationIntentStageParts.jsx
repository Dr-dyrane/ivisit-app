import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useVisits } from "../../../../contexts/VisitsContext";
import { selectRecentHistoryPreview } from "../../../../hooks/visits/useVisitHistorySelectors";
import MapVisitDetailCollapsedRow from "../visitDetail/MapVisitDetailCollapsedRow";
import { MapTrackingTopSlot } from "../tracking/parts/MapTrackingParts";
import IntentOrb from "../../shared/IntentOrb";
import MapHistoryGroup from "../../history/MapHistoryGroup";
import styles from "./mapLocationIntent.styles";
import ManualStepCompletedSummaries from "./ManualStepCompletedSummaries";
import ManualStepActiveField from "./ManualStepActiveField";
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
	getAreaLabelForCountry,
	getSubdivisionLabelForCountry,
} from "./mapLocationIntent.model";
import { MAP_LOCATION_INTENT_COPY } from "./mapLocationIntent.content";
import {
	getPlaceOrbHierarchy,
	getPlaceOrbSubtext,
} from "./mapLocationIntent.helpers";
import MapLocationIntentCandidatePanel from "./MapLocationIntentCandidatePanel";
import MapLocationIntentPlacesHubPanel from "./MapLocationIntentPlacesHubPanel";
import MapLocationIntentRecentsHubPanel from "./MapLocationIntentRecentsHubPanel";

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
	titleOverride = null,
	subtitleOverride = null,
}) {
	return (
		<MapTrackingTopSlot
			title={titleOverride ?? formatLocationHeaderText(model.headerTitle)}
			subtitle={subtitleOverride ?? formatLocationHeaderText(model.headerSubtitle)}
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
	iconName = "record-circle-outline",
	titleColor,
	mutedColor,
	surfaceColor,
	onPress,
}) {
	if (!label) return null;
	const content = (
		<>
			<MaterialCommunityIcons name={iconName} size={11} color={titleColor} />
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
	onFindNearbyHospitals,
	onOpenSaveCategory,
	onOpenPlacesHub,
	onOpenRecentsHub,
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
	onSelectSaveCategory,
	recents,
	savedPlaces,
	managedSavedPlaces,
	mode,
	manualDraft,
	saveDetailsDraft,
	onManualDraftChange,
	onSaveDetailsDraftChange,
	onConfirmSaveDetails,
	onSavedManageAction,
	onNextManualStep,
	onPrevManualStep,
	onBackToDefault,
	onBackToPreviousStep,
	manualDropQuery,
	manualDropResults,
	isSearchingManualDrop,
	manualDropContextHint,
	onManualDropQueryChange,
	onManualDropSelect,
	onManualUseTypedQuery,
	onManualCountrySelectInline,
	accentColor,
	manualError,
	manualNextActionLabel,
	isResolvingManual,
	savedPlaceFeedback,
	pendingSaveCategory,
	isConfirmingSavedRemove,
	manualStepIndex,
	isExpanded,
	isDarkMode,
	responsiveMetrics,
}) {
	const { visits = [] } = useVisits();
	const searchViewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "sheet" });
	const searchResponsiveStyles = useMemo(
		() => getMapSearchSheetResponsiveStyles(searchViewportMetrics),
		[searchViewportMetrics],
	);
	const isSearching = mode === LOCATION_INTENT_MODES.ADDRESS_SEARCH;
	const isManualStep = mode === LOCATION_INTENT_MODES.MANUAL_STEP;
	const isDecisionMode =
		mode === LOCATION_INTENT_MODES.CONFIRM ||
		mode === LOCATION_INTENT_MODES.CANDIDATE_DECISION ||
		mode === LOCATION_INTENT_MODES.PIN_ADJUST ||
		mode === LOCATION_INTENT_MODES.SAVE_CATEGORY ||
		mode === LOCATION_INTENT_MODES.SAVE_DETAILS ||
		mode === LOCATION_INTENT_MODES.SAVED_MANAGE ||
		mode === LOCATION_INTENT_MODES.PLACES_HUB ||
		mode === LOCATION_INTENT_MODES.RECENTS_HUB;
	const showDefaultSections = !isSearching && !isManualStep && !isDecisionMode;
	const permissionLabel = model?.sourceLabel || "Location state";
	const currentManualStep = MANUAL_LOCATION_STEPS[manualStepIndex] || null;
	const subdivisionOverride = currentManualStep?.key === 'adminArea'
		? getSubdivisionLabelForCountry(manualDraft?.countryCode)
		: currentManualStep?.key === "districtArea"
			? getAreaLabelForCountry(manualDraft?.countryCode)
			: null;
	const effectiveStep = subdivisionOverride
		? {
				...currentManualStep,
				label: subdivisionOverride.label,
				question: subdivisionOverride.question,
				placeholder: subdivisionOverride.placeholder,
				...(subdivisionOverride.helperText !== null
					? { helperText: subdivisionOverride.helperText }
					: { helperText: undefined }),
			}
		: currentManualStep;
	const stepLabelOverrides = useMemo(() => {
		const sub = getSubdivisionLabelForCountry(manualDraft?.countryCode);
		const area = getAreaLabelForCountry(manualDraft?.countryCode);
		return {
			...(sub ? { adminArea: sub.label } : {}),
			...(area ? { districtArea: area.label } : {}),
		};
	}, [manualDraft?.countryCode]);
	const visibleResults = isExpanded ? searchResults.slice(0, 7) : searchResults.slice(0, 4);
	const visibleRecentSearches = Array.isArray(recentSearchQueries)
		? recentSearchQueries.slice(0, isExpanded ? 8 : 4)
		: [];
	const visibleRecentAddressCandidates =
		searchQuery.trim().length < 2 ? recents.slice(0, isExpanded ? 4 : 3) : [];
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
	const recentVisitLocationItems = useMemo(
		() =>
			selectRecentHistoryPreview(visits, 6)
				.filter((item) => item?.facilityCoordinate && item?.facilityAddress)
				.map((item) => ({
					id: `visit-location-${item.id}`,
					requestType: item.requestType || "visit",
					title: item.facilityName || item.title || "Recent visit",
					label: item.facilityName || item.title || "Recent visit",
					subtitle: item.facilityAddress,
					address: item.facilityAddress,
					statusLabel: "Recent Visit",
					statusTone: item.statusTone || "default",
					timeLabel: item.timeLabel || "",
					source: "visit",
					coords: item.facilityCoordinate,
					latitude: item.facilityCoordinate.latitude,
					longitude: item.facilityCoordinate.longitude,
					countryCode: null,
				})),
		[visits],
	);
	const combinedRecentLocationItems = useMemo(() => {
		const seen = new Set();
		return [...recentLocationItems, ...recentVisitLocationItems]
			.filter((item) => {
				const key = `${String(item.address || item.subtitle || "").trim().toLowerCase()}|${Number(item.latitude || item.coords?.latitude || 0).toFixed(5)}|${Number(item.longitude || item.coords?.longitude || 0).toFixed(5)}`;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			})
			.slice(0, 6);
	}, [recentLocationItems, recentVisitLocationItems]);
	const managedSavedPlaceItems = Array.isArray(managedSavedPlaces)
		? managedSavedPlaces.slice(0, 6)
		: [];
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

	return (
		<View style={styles.bodyScrollContent}>
			{!isManualStep ? (
				<View style={styles.topRow}>
					{isSearching ? (
						<View style={[styles.searchPill, styles.searchInputPill, { backgroundColor: groupSurfaceColor }]}>
							<MaterialCommunityIcons name="magnify" size={19} color={mutedColor} />
							<TextInput
								value={searchQuery}
								onChangeText={onSearchQueryChange}
								placeholder={model.searchPlaceholder}
								placeholderTextColor={mutedColor}
								autoFocus
								style={[styles.searchInput, { color: titleColor }]}
							/>
							{searchQuery.length > 0 ? (
								<Pressable onPress={() => onSearchQueryChange('')} hitSlop={10}>
									<MaterialCommunityIcons name="close-circle" size={18} color={mutedColor} />
								</Pressable>
							) : null}
						</View>
					) : (
						<>
							<Pressable
								onPress={onOpenSearch}
								accessibilityRole="button"
								accessibilityLabel="Search address or place"
								style={[styles.searchPill, { backgroundColor: groupSurfaceColor }]}
							>
								<MaterialCommunityIcons name="magnify" size={19} color={mutedColor} />
								<Text style={[styles.searchText, { color: mutedColor }]}>
									{model.searchPlaceholder}
								</Text>
							</Pressable>
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
						</>
					)}
				</View>
			) : null}
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
					{visibleRecentAddressCandidates.length > 0 ? (
						<ResultsSection
							title="Recent Pickups"
							items={visibleRecentAddressCandidates.map((recent, index) => ({
								...recent,
								key: recent?.id || recent?.address || `recent-pickup-${index}`,
							}))}
							titleColor={mutedColor}
							groupedSurface={groupSurfaceColor}
							isDarkMode={isDarkMode}
							rowDividerColor={mutedColor + "30"}
							responsiveStyles={searchResponsiveStyles}
							renderItem={(item) => (
								<SearchResultRow
									iconName="time-outline"
									title={item?.label || "Recent pickup"}
									subtitle={item?.address || ""}
									meta="Recent pickup"
									titleColor={titleColor}
									mutedColor={mutedColor}
									surfaceColor={heroSurfaceColor}
									isDarkMode={isDarkMode}
									onPress={() => onSelectRecentLocation?.(item)}
									responsiveStyles={searchResponsiveStyles}
								/>
							)}
						/>
					) : null}
					{visibleRecentSearches.length > 0 ? (
						<ResultsSection
							title="Recent Searches"
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
								<MaterialCommunityIcons name="map-marker-outline" size={22} color={titleColor} />
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
					<View
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
							<Pressable
								onPress={handleHeroAction}
								accessibilityRole="button"
								accessibilityLabel={`Use pickup location: ${model.headerTitle}`}
								style={({ pressed }) => [
									styles.currentCardMainAction,
									pressed ? styles.rowPressed : null,
								]}
							>
								<View
									style={[styles.currentCardAvatar, { backgroundColor: groupSurfaceColor }]}
								>
									<MaterialCommunityIcons name="crosshairs-gps" size={20} color={titleColor} />
								</View>
								<View style={styles.currentCardCopy}>
									<Text style={[styles.currentCardAddress, { color: titleColor }]}>
										{model.headerTitle}
									</Text>
									<Text style={[styles.currentCardBody, { color: mutedColor }]}>
										{model.headerSubtitle}
									</Text>
								</View>
							</Pressable>
							<MapLocationIntentHeroMeta
								label={heroActionLabel || permissionLabel}
								titleColor={titleColor}
								mutedColor={mutedColor}
								surfaceColor={groupSurfaceColor}
								onPress={handleHeroAction}
							/>
						</View>
					</View>

					<Pressable
						onPress={onOpenPlacesHub}
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
						<MaterialCommunityIcons name="chevron-right" size={16} color={mutedColor} />
					</Pressable>
					<View style={styles.orbRow}>
						{savedPlaces.slice(0, 3).map((place, index) => (
							<IntentOrb
								key={place.key}
								label={place.label}
								subtext={getPlaceOrbSubtext(place)}
								iconName={
									place.key === "home"
										? (place.hasLocation ? "home" : "home-outline")
										: place.key === "work"
											? (place.hasLocation ? "briefcase" : "briefcase-outline")
											: "plus"
								}
								colors={MAP_LOCATION_INTENT_COPY.placesOrbColors[place.key] || MAP_LOCATION_INTENT_COPY.placesOrbColors.add}
								hierarchy={getPlaceOrbHierarchy(place, index, savedPlaces)}
								actionBias={place.key === "add" ? "primary" : index === 0 ? "primary" : index === 1 ? "leading" : "trailing"}
								onPress={() => onSelectSavedPlace(place)}
								titleColor={titleColor}
								mutedColor={mutedColor}
								primarySubtextColor={titleColor}
								subtextColor={
									!place.hasLocation && place.key !== "add" ? mutedColor : null
								}
								responsiveStyles={responsiveMetrics?.care?.orb}
								isMutedOrb={!place.hasLocation}
							/>
						))}
					</View>

					<Pressable
						onPress={onOpenRecentsHub}
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
						<MaterialCommunityIcons name="chevron-right" size={16} color={mutedColor} />
					</Pressable>
					{combinedRecentLocationItems.length > 0 ? (
						<View style={styles.recentsSection}>
							<MapHistoryGroup
								items={combinedRecentLocationItems.slice(0, 3)}
								onSelectItem={onSelectRecentLocation}
								metrics={recentRowMetrics}
								containerRadius={22}
								hideRowChevron
								isDarkMode={isDarkMode}
							/>
						</View>
					) : null}
				</>
			) : null}


			{isManualStep && currentManualStep ? (
				<View style={styles.manualStepBody}>
					{/* Completed steps - locked editable rows */}
					<ManualStepCompletedSummaries
						manualDraft={manualDraft}
						currentStepIndex={manualStepIndex}
						onEditStep={(idx) => {
							onManualDraftChange('__jumpTo__', String(idx));
						}}
						titleColor={titleColor}
						mutedColor={mutedColor}
						infoSurfaceColor={infoSurfaceColor}
						stepLabelOverrides={stepLabelOverrides}
					/>

					{/* Active step question */}
					<Text style={[styles.manualStepQuestion, { color: titleColor }]}>
						{effectiveStep.question || effectiveStep.label}
					</Text>
					{effectiveStep.helperText ? (
						<Text style={[styles.manualStepHelper, { color: mutedColor }]}>
							{effectiveStep.helperText}
						</Text>
					) : null}

					{/* Active step affordance */}
					<ManualStepActiveField
						step={effectiveStep}
						draftValue={manualDraft[currentManualStep.key] || ''}
						draftCountryCode={manualDraft.countryCode}
						dropQuery={manualDropQuery}
						dropResults={manualDropResults}
						isDropLoading={isSearchingManualDrop}
						contextHint={manualDropContextHint}
						onQueryChange={onManualDropQueryChange}
						onDropSelect={(item) =>
							onManualDropSelect(
								currentManualStep.key,
								item.primaryText || item.name || '',
								{
									city: item.city || null,
									districtArea: item.districtArea || null,
									adminArea: item.state || null,
									countryCode: item.countryCode || null,
								},
							)
						}
						onUseTypedQuery={(value) =>
							onManualUseTypedQuery?.(currentManualStep.key, value)
						}
						onCountrySelect={onManualCountrySelectInline}
						onTextChange={(value) =>
							onManualDraftChange(currentManualStep.key, value)
						}
						onSubmitEditing={onNextManualStep}
						titleColor={titleColor}
						mutedColor={mutedColor}
						infoSurfaceColor={infoSurfaceColor}
						accentColor={accentColor}
					/>

					{/* Optional badge */}
					{currentManualStep.optional ? (
						<Text style={[styles.manualOptionalText, { color: mutedColor }]}>
							Optional - skip if not needed
						</Text>
					) : null}

					{/* Inline error */}
					{manualError ? (
						<View style={styles.manualErrorRow}>
							<MaterialCommunityIcons name="alert-circle-outline" size={15} color="#EF4444" />
							<Text style={styles.manualErrorText}>
								{manualError}
							</Text>
						</View>
					) : null}
				</View>
			) : null}

			<MapLocationIntentPlacesHubPanel
				mode={mode}
				savedPlaces={savedPlaces}
				managedSavedPlaces={managedSavedPlaces}
				titleColor={titleColor}
				mutedColor={mutedColor}
				groupSurfaceColor={groupSurfaceColor}
				infoSurfaceColor={infoSurfaceColor}
				onSelectSavedPlace={onSelectSavedPlace}
				onAddPlace={onOpenPlacesHub ? () => { onSelectSavedPlace?.({ key: "add", hasLocation: false, label: "Add" }); } : undefined}
			/>

			<MapLocationIntentRecentsHubPanel
				mode={mode}
				recents={recents}
				titleColor={titleColor}
				mutedColor={mutedColor}
				groupSurfaceColor={groupSurfaceColor}
				isDarkMode={isDarkMode}
				onSelectRecentLocation={onSelectRecentLocation}
			/>

			<MapLocationIntentCandidatePanel
				mode={mode}
				selectedLocation={selectedLocation}
				pendingSaveCategory={pendingSaveCategory}
				savedPlaceFeedback={savedPlaceFeedback}
				isConfirmingSavedRemove={isConfirmingSavedRemove}
				saveDetailsDraft={saveDetailsDraft}
				titleColor={titleColor}
				mutedColor={mutedColor}
				groupSurfaceColor={groupSurfaceColor}
				infoSurfaceColor={infoSurfaceColor}
				heroSurfaceColor={heroSurfaceColor}
				isDarkMode={isDarkMode}
				accentColor={accentColor}
				onConfirmSelection={onConfirmSelection}
				onFindNearbyHospitals={onFindNearbyHospitals}
				onOpenSaveCategory={onOpenSaveCategory}
				onSaveSelectedLocationAs={onSaveSelectedLocationAs}
				onSelectSaveCategory={onSelectSaveCategory}
				onSavedManageAction={onSavedManageAction}
				onSaveDetailsDraftChange={onSaveDetailsDraftChange}
				onConfirmSaveDetails={onConfirmSaveDetails}
				onBackToPreviousStep={onBackToPreviousStep}
			/>

		</View>
	);
}
