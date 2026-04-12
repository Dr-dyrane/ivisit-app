import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../../contexts/ThemeContext";
import { SearchBoundary, useSearch } from "../../../../contexts/SearchContext";
import { COLORS } from "../../../../constants/colors";
import googlePlacesService from "../../../../services/googlePlacesService";
import EmergencySearchBar from "../../../emergency/EmergencySearchBar";
import MapModalShell from "../MapModalShell";
import {
	buildHospitalMeta,
	buildHospitalSubtitle,
	buildLocalPopularSearches,
	buildTrendingSubtitle,
	humanizeQueryLabel,
	mapGeocodeResult,
	mapSuggestionToLocation,
	MAP_SEARCH_SHEET_MODES,
	normalizeText,
	scoreHospitalMatch,
} from "./mapSearchSheet.helpers";
import { styles } from "./mapSearchSheet.styles";

function SheetIconTile({ children, isDarkMode }) {
	const colors = isDarkMode
		? ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.05)"]
		: ["#FFFFFF", "#EEF2F7"];

	return (
		<View style={styles.sheetIconShell}>
			<LinearGradient
				colors={colors}
				start={{ x: 0.08, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.sheetIconFill}
			>
				<View pointerEvents="none" style={styles.sheetIconHighlight} />
				{children}
			</LinearGradient>
		</View>
	);
}

function SearchResultRow({
	iconName = "search-outline",
	iconType = "ion",
	title,
	subtitle = null,
	meta = null,
	titleColor,
	mutedColor,
	surfaceColor,
	onPress,
	isSelected = false,
	badgeLabel = null,
	isDarkMode,
}) {
	const renderIcon =
		iconType === "material" ? (
			<MaterialCommunityIcons name={iconName} size={18} color={COLORS.brandPrimary} />
		) : (
			<Ionicons name={iconName} size={18} color={COLORS.brandPrimary} />
		);

	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View
					style={[
						styles.resultRow,
						{
							backgroundColor: surfaceColor,
							opacity: pressed ? 0.88 : 1,
							transform: [{ scale: pressed ? 0.99 : 1 }],
						},
					]}
				>
					<View style={styles.resultLeading}>
						<SheetIconTile isDarkMode={isDarkMode}>{renderIcon}</SheetIconTile>
						<View style={styles.resultCopy}>
							<View style={styles.resultTitleRow}>
								<Text numberOfLines={1} style={[styles.resultTitle, { color: titleColor }]}>
									{title}
								</Text>
								{badgeLabel ? (
									<View style={styles.resultBadge}>
										<Text style={styles.resultBadgeText}>{badgeLabel}</Text>
									</View>
								) : null}
							</View>
							{subtitle ? (
								<Text numberOfLines={1} style={[styles.resultSubtitle, { color: mutedColor }]}>
									{subtitle}
								</Text>
							) : null}
							{meta ? (
								<Text numberOfLines={1} style={[styles.resultMeta, { color: mutedColor }]}>
									{meta}
								</Text>
							) : null}
						</View>
					</View>
					{isSelected ? (
						<Ionicons name="checkmark-circle" size={18} color={COLORS.brandPrimary} />
					) : (
						<Ionicons name="chevron-forward" size={18} color={mutedColor} />
					)}
				</View>
			)}
		</Pressable>
	);
}

function QueryChip({ label, onPress, titleColor, surfaceColor }) {
	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View
					style={[
						styles.queryChip,
						{
							backgroundColor: surfaceColor,
							opacity: pressed ? 0.88 : 1,
							transform: [{ scale: pressed ? 0.98 : 1 }],
						},
					]}
				>
					<Ionicons name="search-outline" size={14} color={COLORS.brandPrimary} />
					<Text numberOfLines={1} style={[styles.queryChipLabel, { color: titleColor }]}>
						{label}
					</Text>
				</View>
			)}
		</Pressable>
	);
}

function ActionChip({ label, iconName, onPress, titleColor, surfaceColor }) {
	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View
					style={[
						styles.actionChip,
						{
							backgroundColor: surfaceColor,
							opacity: pressed ? 0.88 : 1,
							transform: [{ scale: pressed ? 0.98 : 1 }],
						},
					]}
				>
					<Ionicons name={iconName} size={15} color={COLORS.brandPrimary} />
					<Text style={[styles.actionChipLabel, { color: titleColor }]}>{label}</Text>
				</View>
			)}
		</Pressable>
	);
}

function ModeChip({
	label,
	iconName,
	active = false,
	onPress,
	titleColor,
	mutedColor,
	surfaceColor,
	activeSurfaceColor,
}) {
	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View
					style={[
						styles.modeChip,
						{
							backgroundColor: active ? activeSurfaceColor : surfaceColor,
							opacity: pressed ? 0.9 : 1,
							transform: [{ scale: pressed ? 0.985 : 1 }],
						},
					]}
				>
					<Ionicons
						name={iconName}
						size={16}
						color={active ? COLORS.brandPrimary : mutedColor}
					/>
					<Text
						style={[
							styles.modeChipLabel,
							{ color: active ? titleColor : mutedColor },
						]}
					>
						{label}
					</Text>
				</View>
			)}
		</Pressable>
	);
}

function ResultsSection({
	title,
	items,
	titleColor,
	groupedSurface,
	isDarkMode,
	renderItem,
	rowDividerColor,
}) {
	if (!Array.isArray(items) || items.length === 0) return null;

	return (
		<View style={styles.section}>
			<Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
			<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
				{items.map((item, index) => (
					<View key={item.key || `${title}-${index}`}>
						{renderItem(item, index, isDarkMode)}
						{index < items.length - 1 ? (
							<View style={[styles.rowDivider, { backgroundColor: rowDividerColor }]} />
						) : null}
					</View>
				))}
			</View>
		</View>
	);
}

function MapSearchSheetContent({
	visible,
	onClose,
	mode = MAP_SEARCH_SHEET_MODES.SEARCH,
	hospitals = [],
	selectedHospitalId = null,
	currentLocation = null,
	onOpenHospital,
	onBrowseHospitals,
	onUseCurrentLocation,
	onSelectLocation,
}) {
	const { isDarkMode } = useTheme();
	const {
		query,
		setSearchQuery,
		recentQueries = [],
		trendingSearches = [],
		trendingLoading = false,
		commitQuery,
	} = useSearch();
	const [locationSuggestions, setLocationSuggestions] = useState([]);
	const [isSearchingLocations, setIsSearchingLocations] = useState(false);
	const [isResolvingLocation, setIsResolvingLocation] = useState(null);
	const [locationError, setLocationError] = useState(null);
	const [activeMode, setActiveMode] = useState(mode);
	const requestIdRef = useRef(0);
	const sessionTokenRef = useRef(null);

	const isLocationMode = activeMode === MAP_SEARCH_SHEET_MODES.LOCATION;
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const groupedSurface = isDarkMode ? "rgba(255,255,255,0.055)" : "rgba(15,23,42,0.045)";
	const cardSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.94)";
	const activeChipSurface = isDarkMode ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.98)";
	const rowDividerColor = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
	const hasQuery = typeof query === "string" && query.trim().length > 0;
	const trimmedQuery = String(query || "").trim();
	const nearbyHospitals = Array.isArray(hospitals) ? hospitals.filter(Boolean).slice(0, 4) : [];
	const locationBias = currentLocation?.location || currentLocation || null;
	const localPopularSearches = useMemo(
		() => buildLocalPopularSearches(hospitals, 5),
		[hospitals],
	);

	useEffect(() => {
		if (!visible) {
			setSearchQuery("");
			setActiveMode(mode);
			setLocationSuggestions([]);
			setLocationError(null);
			setIsSearchingLocations(false);
			setIsResolvingLocation(null);
			requestIdRef.current += 1;
			sessionTokenRef.current = null;
			return;
		}

		sessionTokenRef.current = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
	}, [setSearchQuery, visible]);

	useEffect(() => {
		if (!visible) return;
		setActiveMode(mode);
	}, [mode, visible]);

	useEffect(() => {
		if (!visible) return undefined;

		if (!isLocationMode || trimmedQuery.length < 2) {
			setLocationSuggestions([]);
			setLocationError(null);
			setIsSearchingLocations(false);
			return undefined;
		}

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;

		const timeout = setTimeout(async () => {
			setIsSearchingLocations(true);
			setLocationError(null);

			try {
				const nextSuggestions = await googlePlacesService.searchAddressSuggestions(trimmedQuery, {
					location: locationBias,
					sessionToken: sessionTokenRef.current,
				});

				if (requestIdRef.current !== requestId) return;
				setLocationSuggestions(Array.isArray(nextSuggestions) ? nextSuggestions : []);
			} catch (_error) {
				if (requestIdRef.current !== requestId) return;
				setLocationSuggestions([]);
				setLocationError("We couldn't search locations right now.");
			} finally {
				if (requestIdRef.current === requestId) {
					setIsSearchingLocations(false);
				}
			}
		}, 240);

		return () => clearTimeout(timeout);
	}, [isLocationMode, locationBias, trimmedQuery, visible]);

	const visibleTrending = useMemo(() => {
		const merged = [];
		const seen = new Set();

		const addItems = (items) => {
			for (const item of Array.isArray(items) ? items : []) {
				const queryLabel = humanizeQueryLabel(item?.query);
				const key = normalizeText(queryLabel);
				if (!queryLabel || seen.has(key)) continue;
				seen.add(key);
				merged.push({
					...item,
					query: queryLabel,
				});
				if (merged.length >= 5) break;
			}
		};

		addItems(trendingSearches);
		if (merged.length < 5) {
			addItems(localPopularSearches);
		}

		return merged.slice(0, 5);
	}, [localPopularSearches, trendingSearches]);

	const hospitalResults = useMemo(() => {
		if (!hasQuery) return [];

		return (Array.isArray(hospitals) ? hospitals : [])
			.filter(Boolean)
			.map((hospital) => ({
				hospital,
				score: scoreHospitalMatch(query, hospital),
				key: hospital?.id || hospital?.name || `${hospital?.latitude}-${hospital?.longitude}`,
			}))
			.filter((entry) => entry.score > 0)
			.sort((left, right) => right.score - left.score)
			.slice(0, 10);
	}, [hasQuery, hospitals, query]);

	const placeResults = useMemo(
		() =>
			(Array.isArray(locationSuggestions) ? locationSuggestions : []).map((item, index) => ({
				...item,
				key: item?.placeId || item?.primaryText || `place-${index}`,
			})),
		[locationSuggestions],
	);

	const handleDismiss = useCallback(() => {
		setSearchQuery("");
		setLocationSuggestions([]);
		setLocationError(null);
		setIsSearchingLocations(false);
		setIsResolvingLocation(null);
		onClose?.();
	}, [onClose, setSearchQuery]);

	const handleOpenHospital = useCallback(
		(hospital) => {
			if (!hospital) return;
			commitQuery(query || hospital?.name || "");
			handleDismiss();
			setTimeout(() => {
				onOpenHospital?.(hospital);
			}, 80);
		},
		[commitQuery, handleDismiss, onOpenHospital, query],
	);

	const handleOpenHospitalList = useCallback(() => {
		handleDismiss();
		setTimeout(() => {
			onBrowseHospitals?.();
		}, 80);
	}, [handleDismiss, onBrowseHospitals]);

	const handleUseCurrent = useCallback(() => {
		onUseCurrentLocation?.();
		handleDismiss();
	}, [handleDismiss, onUseCurrentLocation]);

	const handleUseSuggestion = useCallback(
		async (suggestion) => {
			if (!suggestion?.placeId) return;
			setLocationError(null);
			setIsResolvingLocation(suggestion.placeId);

			try {
				const readyMapped = mapSuggestionToLocation(suggestion);
				const mapped = readyMapped
					? readyMapped
					: mapGeocodeResult(
						await googlePlacesService.getPlaceDetails(suggestion.placeId, {
							sessionToken: sessionTokenRef.current,
						}),
					);

				if (!mapped.location) {
					throw new Error("Location not found");
				}

				commitQuery(query || mapped.primaryText || "");
				onSelectLocation?.(mapped);
				handleDismiss();
			} catch (_error) {
				setLocationError("We couldn't use that area yet.");
			} finally {
				setIsResolvingLocation(null);
			}
		},
		[commitQuery, handleDismiss, onSelectLocation, query],
	);

	const locationSectionTitle = isLocationMode ? "Areas" : "Places";
	const orderedQuerySections = isLocationMode
		? ["places", "hospitals"]
		: ["hospitals", "places"];

	return (
		<MapModalShell
			visible={visible}
			onClose={handleDismiss}
			title="Search"
			minHeightRatio={0.82}
			contentContainerStyle={styles.content}
		>
			<EmergencySearchBar
				value={query}
				onChangeText={setSearchQuery}
				onBlur={() => commitQuery(query)}
				onClear={() => setSearchQuery("")}
				placeholder="Search hospitals, specialties, or area"
				showSuggestions={false}
				autoFocus={visible}
				style={styles.searchBar}
			/>

			<View style={styles.modeSwitchRow}>
				<ModeChip
					label="Care"
					iconName="medkit-outline"
					active={!isLocationMode}
					onPress={() => setActiveMode(MAP_SEARCH_SHEET_MODES.SEARCH)}
					titleColor={titleColor}
					mutedColor={mutedColor}
					surfaceColor={groupedSurface}
					activeSurfaceColor={activeChipSurface}
				/>
				<ModeChip
					label="Area"
					iconName="location-outline"
					active={isLocationMode}
					onPress={() => setActiveMode(MAP_SEARCH_SHEET_MODES.LOCATION)}
					titleColor={titleColor}
					mutedColor={mutedColor}
					surfaceColor={groupedSurface}
					activeSurfaceColor={activeChipSurface}
				/>
			</View>

			{!hasQuery ? (
				<>
					<View style={styles.section}>
						<Text style={[styles.sectionTitle, { color: titleColor }]}>Current area</Text>
						<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
							<SearchResultRow
								iconName="locate"
								title={currentLocation?.primaryText || "Current location"}
								subtitle={currentLocation?.secondaryText || "Use your device location"}
								meta="Use your device location"
								titleColor={titleColor}
								mutedColor={mutedColor}
								surfaceColor={cardSurface}
								isDarkMode={isDarkMode}
								badgeLabel="Live"
								onPress={handleUseCurrent}
							/>
						</View>
					</View>

					{nearbyHospitals.length > 0 ? (
						<ResultsSection
							title="Nearby now"
							items={nearbyHospitals.map((hospital, index) => ({
								hospital,
								key: hospital?.id || hospital?.name || `nearby-${index}`,
							}))}
							titleColor={titleColor}
							groupedSurface={groupedSurface}
							isDarkMode={isDarkMode}
							rowDividerColor={rowDividerColor}
							renderItem={(entry, index) => (
								<SearchResultRow
									iconName="hospital-building"
									iconType="material"
									title={entry.hospital?.name || "Hospital"}
									subtitle={buildHospitalSubtitle(entry.hospital)}
									meta={buildHospitalMeta(entry.hospital)}
									titleColor={titleColor}
									mutedColor={mutedColor}
									surfaceColor={cardSurface}
									isDarkMode={isDarkMode}
									isSelected={entry.hospital?.id === selectedHospitalId}
									badgeLabel={index === 0 ? "Closest" : entry.hospital?.verified ? "Verified" : null}
									onPress={() => handleOpenHospital(entry.hospital)}
								/>
							)}
						/>
					) : null}

					{recentQueries.length > 0 ? (
						<View style={styles.section}>
							<Text style={[styles.sectionTitle, { color: titleColor }]}>Recent</Text>
							<View style={styles.chipWrap}>
								{recentQueries.slice(0, 6).map((recentQuery, index) => (
									<QueryChip
										key={`${recentQuery}-${index}`}
										label={recentQuery}
										onPress={() => setSearchQuery(recentQuery)}
										titleColor={titleColor}
										surfaceColor={groupedSurface}
									/>
								))}
							</View>
						</View>
					) : null}

					{visibleTrending.length > 0 || trendingLoading ? (
						<View style={styles.section}>
							<Text style={[styles.sectionTitle, { color: titleColor }]}>Popular</Text>
							<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
								{trendingLoading && visibleTrending.length === 0 ? (
									<View style={styles.loadingRow}>
										<ActivityIndicator size="small" color={COLORS.brandPrimary} />
										<Text style={[styles.loadingText, { color: mutedColor }]}>
											Refreshing searches
										</Text>
									</View>
								) : (
									visibleTrending.map((item, index) => (
										<View key={`${item?.id || item?.query || "trend"}-${index}`}>
											<SearchResultRow
												iconName="trending-up"
												title={item?.query || "Popular search"}
												subtitle={buildTrendingSubtitle(item)}
												titleColor={titleColor}
												mutedColor={mutedColor}
												surfaceColor={cardSurface}
												isDarkMode={isDarkMode}
												onPress={() => setSearchQuery(item?.query || "")}
											/>
											{index < visibleTrending.length - 1 ? (
												<View
													style={[styles.rowDivider, { backgroundColor: rowDividerColor }]}
												/>
											) : null}
										</View>
									))
								)}
							</View>
						</View>
					) : null}
				</>
			) : (
				<>
					{orderedQuerySections.map((sectionKey) => {
						if (sectionKey === "hospitals" && hospitalResults.length > 0) {
							return (
								<ResultsSection
									key="hospitals"
									title={
										hospitalResults.length === 1
											? "1 nearby hospital match"
											: `${hospitalResults.length} nearby hospital matches`
									}
									items={hospitalResults}
									titleColor={titleColor}
									groupedSurface={groupedSurface}
									isDarkMode={isDarkMode}
									rowDividerColor={rowDividerColor}
									renderItem={(entry, index) => (
										<SearchResultRow
											iconName="hospital-building"
											iconType="material"
											title={entry.hospital?.name || "Hospital"}
											subtitle={buildHospitalSubtitle(entry.hospital)}
											meta={buildHospitalMeta(entry.hospital)}
											titleColor={titleColor}
											mutedColor={mutedColor}
											surfaceColor={cardSurface}
											isDarkMode={isDarkMode}
											isSelected={entry.hospital?.id === selectedHospitalId}
											badgeLabel={index === 0 ? "Best match" : entry.hospital?.verified ? "Verified" : null}
											onPress={() => handleOpenHospital(entry.hospital)}
										/>
									)}
								/>
							);
						}

						if (sectionKey === "places" && (placeResults.length > 0 || isSearchingLocations)) {
							return (
								<View key="places" style={styles.section}>
									<Text style={[styles.sectionTitle, { color: titleColor }]}>
										{locationSectionTitle}
									</Text>
									<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
										{placeResults.length === 0 && isSearchingLocations ? (
											<View style={styles.loadingRow}>
												<ActivityIndicator size="small" color={COLORS.brandPrimary} />
												<Text style={[styles.loadingText, { color: mutedColor }]}>
													Looking for areas nearby
												</Text>
											</View>
										) : (
											placeResults.map((item, index) => (
												<View key={item.key}>
													<SearchResultRow
														iconName="location-outline"
														title={item?.primaryText || "Selected location"}
														subtitle={item?.secondaryText || item?.description || ""}
														meta={item?.source === "google-geocode" ? "Address match" : "Move search here"}
														titleColor={titleColor}
														mutedColor={mutedColor}
														surfaceColor={cardSurface}
														isDarkMode={isDarkMode}
														badgeLabel={index === 0 ? "Area" : null}
														onPress={() => handleUseSuggestion(item)}
														isSelected={isResolvingLocation === item.placeId}
													/>
													{index < placeResults.length - 1 ? (
														<View
															style={[
																styles.rowDivider,
																{ backgroundColor: rowDividerColor },
															]}
														/>
													) : null}
												</View>
											))
										)}
									</View>
								</View>
							);
						}

						return null;
					})}

					{locationError ? (
						<Text style={[styles.loadingText, { color: COLORS.brandPrimary }]}>
							{locationError}
						</Text>
					) : null}

					{hospitalResults.length === 0 &&
					placeResults.length === 0 &&
					!isSearchingLocations ? (
						<View style={[styles.emptyState, { backgroundColor: groupedSurface }]}>
							<View style={styles.emptyIconWrap}>
								<Ionicons name="search-outline" size={20} color={COLORS.brandPrimary} />
							</View>
							<Text style={[styles.emptyTitle, { color: titleColor }]}>No matches nearby</Text>
							<Text style={[styles.emptyBody, { color: mutedColor }]}>
								Try a hospital name, specialty, or another area.
							</Text>
							<View style={styles.actionChipRow}>
								{typeof onBrowseHospitals === "function" ? (
									<ActionChip
										label="See all hospitals"
										iconName="list-outline"
										onPress={handleOpenHospitalList}
										titleColor={titleColor}
										surfaceColor={cardSurface}
									/>
								) : null}
								<ActionChip
									label="Use current area"
									iconName="locate-outline"
									onPress={handleUseCurrent}
									titleColor={titleColor}
									surfaceColor={cardSurface}
								/>
							</View>
						</View>
					) : null}
				</>
			)}
		</MapModalShell>
	);
}

export default function MapSearchSheet(props) {
	const [hasOpened, setHasOpened] = useState(Boolean(props?.visible));

	useEffect(() => {
		if (props?.visible) {
			setHasOpened(true);
		}
	}, [props?.visible]);

	if (!hasOpened && !props?.visible) {
		return null;
	}

	return (
		<SearchBoundary>
			<MapSearchSheetContent {...props} />
		</SearchBoundary>
	);
}
