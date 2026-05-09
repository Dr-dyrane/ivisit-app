import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../../../constants/colors";
import useResponsiveSurfaceMetrics from "../../../../hooks/ui/useResponsiveSurfaceMetrics";
import {
	buildHospitalMeta,
	buildHospitalSubtitle,
	buildTrendingSubtitle,
	buildVenueSuggestions,
} from "./mapSearchSheet.helpers";
import { getMapSearchSheetResponsiveStyles, styles } from "./mapSearchSheet.styles";
import GlassConfirmDialog from "../../../../components/ui/GlassConfirmDialog";

function SheetIconTile({ children, isDarkMode, responsiveStyles }) {
	const colors = isDarkMode
		? ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.05)"]
		: ["#FFFFFF", "#EEF2F7"];

	return (
		<View style={[styles.sheetIconShell, responsiveStyles.sheetIconShell]}>
			<LinearGradient
				colors={colors}
				start={{ x: 0.08, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.sheetIconFill, responsiveStyles.sheetIconFill]}
			>
				<View
					pointerEvents="none"
					style={[styles.sheetIconHighlight, responsiveStyles.sheetIconHighlight]}
				/>
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
	metaColor,
	surfaceColor,
	onPress,
	isSelected = false,
	badgeLabel = null,
	isDarkMode,
	responsiveStyles,
	accessibilityLabel = null,
	accessibilityHint = null,
}) {
	const finalMetaColor = metaColor || mutedColor;
	const a11yLabel = accessibilityLabel || title;
	const a11yHint = accessibilityHint || (subtitle ? `${subtitle}. Tap to select.` : "Tap to select.");
	const renderIcon =
		iconType === "material" ? (
			<MaterialCommunityIcons name={iconName} size={18} color={COLORS.brandPrimary} />
		) : (
			<Ionicons name={iconName} size={18} color={COLORS.brandPrimary} />
		);

	return (
		<Pressable
			onPress={onPress}
			hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
			accessibilityLabel={a11yLabel}
			accessibilityHint={a11yHint}
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
		>
			{({ pressed }) => (
				<View
					style={[
						styles.resultRow,
						responsiveStyles.resultRow,
						{
							backgroundColor: surfaceColor,
							opacity: pressed ? 0.88 : 1,
							transform: [{ scale: pressed ? 0.99 : 1 }],
						},
					]}
				>
					<View style={[styles.resultLeading, responsiveStyles.resultLeading]}>
						<SheetIconTile isDarkMode={isDarkMode} responsiveStyles={responsiveStyles}>
							{renderIcon}
						</SheetIconTile>
						<View style={styles.resultCopy}>
							<View style={[styles.resultTitleRow, responsiveStyles.resultTitleRow]}>
								<Text
									numberOfLines={1}
									style={[styles.resultTitle, responsiveStyles.resultTitle, { color: titleColor }]}
								>
									{title}
								</Text>
								{badgeLabel ? (
									<View style={[styles.resultBadge, responsiveStyles.resultBadge]}>
										<Text style={[styles.resultBadgeText, responsiveStyles.resultBadgeText]}>
											{badgeLabel}
										</Text>
									</View>
								) : null}
							</View>
							{subtitle ? (
								<Text
									numberOfLines={1}
									style={[styles.resultSubtitle, responsiveStyles.resultSubtitle, { color: mutedColor }]}
								>
									{subtitle}
								</Text>
							) : null}
							{meta ? (
								<Text
									numberOfLines={1}
									style={[styles.resultMeta, responsiveStyles.resultMeta, { color: finalMetaColor }]}
								>
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

function QueryChip({ label, onPress, titleColor, surfaceColor, responsiveStyles }) {
	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View
					style={[
						styles.queryChip,
						responsiveStyles.queryChip,
						{
							backgroundColor: surfaceColor,
							opacity: pressed ? 0.88 : 1,
							transform: [{ scale: pressed ? 0.98 : 1 }],
						},
					]}
				>
					<Ionicons name="search-outline" size={14} color={COLORS.brandPrimary} />
					<Text
						numberOfLines={1}
						style={[styles.queryChipLabel, responsiveStyles.queryChipLabel, { color: titleColor }]}
					>
						{label}
					</Text>
				</View>
			)}
		</Pressable>
	);
}

function ActionChip({ label, iconName, onPress, titleColor, surfaceColor, responsiveStyles }) {
	const handlePress = useCallback((e) => {
		// Stop propagation to prevent parent from receiving touch
		e?.stopPropagation?.();
		onPress?.(e);
	}, [onPress]);

	return (
		<Pressable
			onPress={handlePress}
			hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
			accessibilityLabel={label}
			accessibilityHint={`Tap to ${label.toLowerCase()}`}
			accessibilityRole="button"
		>
			{({ pressed }) => (
				<View
					style={[
						styles.actionChip,
						responsiveStyles.actionChip,
						{
							backgroundColor: surfaceColor,
							opacity: pressed ? 0.88 : 1,
							transform: [{ scale: pressed ? 0.98 : 1 }],
						},
					]}
				>
					<Ionicons name={iconName} size={15} color={COLORS.brandPrimary} />
					<Text
						style={[styles.actionChipLabel, responsiveStyles.actionChipLabel, { color: titleColor }]}
					>
						{label}
					</Text>
				</View>
			)}
		</Pressable>
	);
}

function VenueChip({
	venue,
	surfaceColor,
	titleColor,
	isDarkMode,
	responsiveStyles,
	onPress,
}) {
	const handlePress = useCallback((e) => {
		// Stop propagation to prevent parent row from receiving touch
		e?.stopPropagation?.();
		onPress?.(e);
	}, [onPress]);

	return (
		<Pressable
			onPress={handlePress}
			hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
			accessibilityLabel={venue.label}
			accessibilityHint={`Select ${venue.label} entrance`}
			accessibilityRole="button"
		>
			{({ pressed }) => (
				<View
					style={[
						styles.venueChip,
						responsiveStyles.venueChip,
						{
							backgroundColor: surfaceColor,
							opacity: pressed ? 0.88 : 1,
							transform: [{ scale: pressed ? 0.98 : 1 }],
						},
					]}
				>
					<Ionicons
						name={venue.icon}
						size={14}
						color={venue.type === 'emergency' ? '#DC2626' : COLORS.brandPrimary}
					/>
					<Text
						style={[
							styles.venueChipLabel,
							responsiveStyles.venueChipLabel,
							{
								color: venue.type === 'emergency' ? '#DC2626' : titleColor,
								fontWeight: venue.type === 'emergency' ? '700' : '500',
							},
						]}
					>
						{venue.label}
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
	responsiveStyles,
}) {
	if (!Array.isArray(items) || items.length === 0) return null;

	return (
		<View style={[styles.section, responsiveStyles.section]}>
			<Text style={[styles.sectionTitle, responsiveStyles.sectionTitle, { color: titleColor }]}>
				{title}
			</Text>
			<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
				{items.map((item, index) => (
					<View key={item.key || `${title}-${index}`}>
						{renderItem(item, index, isDarkMode)}
						{index < items.length - 1 ? (
							<View style={[styles.rowDivider, responsiveStyles.rowDivider, { backgroundColor: rowDividerColor }]} />
						) : null}
					</View>
				))}
			</View>
		</View>
	);
}

export default function MapSearchSheetSections({ model }) {
	const viewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "sheet" });
	const responsiveStyles = useMemo(
		() => getMapSearchSheetResponsiveStyles(viewportMetrics),
		[viewportMetrics],
	);
	const {
		activeChipSurface,
		cardSurface,
		currentLocation,
		currentLocationActionLabel,
		groupedSurface,
		handleBrowseNearby,
		handleCancelClear,
		handleChangeLocation,
		handleConfirmClear,
		handleOpenHospital,
		handleOpenHospitalList,
		handleUseCurrent,
		handleUseSuggestion,
		hasQuery,
		hospitalResults,
		isDarkMode,
		isDismissing,
		isResolvingLocation,
		isSearchingLocations,
		isUsingDeviceLocation,
		locationError,
		mutedColor,
		nearbyHospitals,
		onClearHistory,
		onSelectLocation,
		orderedQuerySections,
		placeResults,
		recentQueries,
		rowDividerColor,
		savedLocations,
		selectedHospitalId,
		setSearchQuery,
		showClearConfirm,
		showNearbyHospitals,
		titleColor,
		trendingLoading,
		visibleTrending,
	} = model;

	const hasSavedLocations = savedLocations?.length > 0;

	return (
		<>
			{!hasQuery ? (
				<>
					{/* Location Hero Blade - Current location + saved places */}
					<View style={[styles.section, responsiveStyles.section]}>
						<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
							{/* Current location row */}
							<SearchResultRow
								iconName="locate-outline"
								title={currentLocation?.primaryText || "Current location"}
								subtitle={currentLocation?.secondaryText || "Using device location"}
								meta={isUsingDeviceLocation ? "Change location" : "Use device location"}
								metaColor={COLORS.brandPrimary}
								titleColor={titleColor}
								mutedColor={mutedColor}
								surfaceColor={cardSurface}
								isDarkMode={isDarkMode}
								onPress={isUsingDeviceLocation ? handleChangeLocation : handleUseCurrent}
								responsiveStyles={responsiveStyles}
							/>

							{/* Saved locations (if present) */}
							{hasSavedLocations ? (
								<>
									<View style={[styles.rowDivider, responsiveStyles.rowDivider, { backgroundColor: rowDividerColor }]} />
									{savedLocations.slice(0, 3).map((loc, index) => (
											<View key={loc.id}>
												<SearchResultRow
													iconName={loc.label === 'home' ? 'home-outline' : loc.label === 'work' ? 'briefcase-outline' : 'location-outline'}
													title={loc.label.charAt(0).toUpperCase() + loc.label.slice(1)}
													subtitle={loc.address}
													meta={loc.countryCode}
													titleColor={titleColor}
													mutedColor={mutedColor}
													surfaceColor={cardSurface}
													isDarkMode={isDarkMode}
													onPress={() => onSelectLocation?.(loc)}
													responsiveStyles={responsiveStyles}
												/>
												{index < Math.min(savedLocations.length, 3) - 1 ? (
													<View style={[styles.rowDivider, responsiveStyles.rowDivider, { backgroundColor: rowDividerColor }]} />
												) : null}
											</View>
										))}
								</>
							) : null}
						</View>
					</View>

					{/* Nearby hospitals - shown only when explicitly browsing */}
					{showNearbyHospitals && nearbyHospitals.length > 0 ? (
						<ResultsSection
							title="Nearby now"
							items={nearbyHospitals.map((hospital, index) => ({
								hospital,
								key: hospital?.id || hospital?.name || `nearby-${index}`,
							}))}
							titleColor={mutedColor}
							groupedSurface={groupedSurface}
							isDarkMode={isDarkMode}
							rowDividerColor={rowDividerColor}
							responsiveStyles={responsiveStyles}
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
									responsiveStyles={responsiveStyles}
								/>
							)}
						/>
					) : null}

					{/* Recent searches as rows for better touch targets */}
					{recentQueries.length > 0 ? (
						<View style={[styles.section, responsiveStyles.section]}>
							<View style={[styles.sectionHeader, responsiveStyles.sectionHeader]} accessibilityRole="header">
								<Text style={[styles.sectionTitle, responsiveStyles.sectionTitle, { color: mutedColor }]}>
									Recent
								</Text>
								{onClearHistory ? (
									<Pressable
										onPress={onClearHistory}
										accessibilityLabel="Clear recent searches"
										accessibilityHint="Double tap to clear all recent search history"
										accessibilityRole="button"
									>
										<Text style={[styles.clearText, responsiveStyles.clearText, { color: mutedColor }]}>Clear</Text>
									</Pressable>
								) : null}
							</View>
							<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
								{recentQueries.slice(0, 12).map((recentQuery, index) => (
									<View key={`${recentQuery}-${index}`}>
										<SearchResultRow
											iconName="time-outline"
											title={recentQuery}
											subtitle={null}
											meta={null}
											titleColor={titleColor}
											mutedColor={mutedColor}
											surfaceColor={cardSurface}
											isDarkMode={isDarkMode}
											onPress={() => setSearchQuery(recentQuery)}
											responsiveStyles={responsiveStyles}
										/>
										{index < Math.min(recentQueries.length, 12) - 1 ? (
											<View style={[styles.rowDivider, responsiveStyles.rowDivider, { backgroundColor: rowDividerColor }]} />
										) : null}
									</View>
								))}
							</View>
						</View>
					) : null}

					{visibleTrending.length > 0 || trendingLoading ? (
						<View style={[styles.section, responsiveStyles.section]}>
							<Text style={[styles.sectionTitle, responsiveStyles.sectionTitle, { color: mutedColor }]}>
								Popular
							</Text>
							<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
								{trendingLoading && visibleTrending.length === 0 ? (
									<View style={[styles.loadingRow, responsiveStyles.loadingRow]}>
										<ActivityIndicator size="small" color={COLORS.brandPrimary} />
										<Text style={[styles.loadingText, responsiveStyles.loadingText, { color: mutedColor }]}>
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
												responsiveStyles={responsiveStyles}
											/>
											{index < visibleTrending.length - 1 ? (
												<View
													style={[
														styles.rowDivider,
														responsiveStyles.rowDivider,
														{ backgroundColor: rowDividerColor },
													]}
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
									titleColor={mutedColor}
									groupedSurface={groupedSurface}
									isDarkMode={isDarkMode}
									rowDividerColor={rowDividerColor}
									responsiveStyles={responsiveStyles}
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
											responsiveStyles={responsiveStyles}
										/>
									)}
								/>
							);
						}

						// Show venue suggestions for top hospital match
						if (sectionKey === "hospitals" && hospitalResults.length > 0) {
							const topHospital = hospitalResults[0]?.hospital;
							const venues = buildVenueSuggestions(topHospital);
							if (venues.length > 0) {
								return (
									<View key="venues" style={[styles.section, responsiveStyles.section]}>
										<Text
											style={[
												styles.sectionTitle,
												responsiveStyles.sectionTitle,
												{ color: mutedColor, fontSize: 13, fontWeight: "500" },
											]}
										>
											At {topHospital?.name || "hospital"}
										</Text>
										<View style={[styles.venueRow, { backgroundColor: groupedSurface }]}>
											{venues.map((venue) => (
												<VenueChip
													key={venue.id}
													venue={venue}
													surfaceColor={cardSurface}
													titleColor={titleColor}
													isDarkMode={isDarkMode}
													responsiveStyles={responsiveStyles}
													onPress={() => handleOpenHospital(topHospital)}
												/>
											))}
										</View>
									</View>
								);
							}
						}

						// Places (location) results section
						if (sectionKey === "places" && (placeResults.length > 0 || isSearchingLocations)) {
							return (
								<View key="places" style={[styles.section, responsiveStyles.section]}>
									<Text style={[styles.sectionTitle, responsiveStyles.sectionTitle, { color: mutedColor }]}>
										Places
									</Text>
									<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
										{isSearchingLocations && placeResults.length === 0 ? (
											<View style={[styles.loadingRow, responsiveStyles.loadingRow]}>
												<ActivityIndicator size="small" color={COLORS.brandPrimary} />
												<Text style={[styles.loadingText, responsiveStyles.loadingText, { color: mutedColor }]}>
													Looking for places nearby
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
														badgeLabel={index === 0 ? "Best match" : null}
														onPress={() => handleUseSuggestion(item)}
														isSelected={isResolvingLocation === item.placeId}
														responsiveStyles={responsiveStyles}
													/>
													{index < placeResults.length - 1 ? (
														<View
															style={[
																styles.rowDivider,
																responsiveStyles.rowDivider,
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
						<Text style={[styles.loadingText, responsiveStyles.loadingText, { color: COLORS.brandPrimary }]}>
							{locationError}
						</Text>
					) : null}

					{hospitalResults.length === 0 && placeResults.length === 0 && !isSearchingLocations ? (
						<View style={[styles.emptyState, responsiveStyles.emptyState, { backgroundColor: groupedSurface }]}>
							<View style={[styles.emptyIconWrap, responsiveStyles.emptyIconWrap]}>
								<Ionicons name="location-outline" size={24} color={COLORS.brandPrimary} />
							</View>
							<Text style={[styles.emptyTitle, responsiveStyles.emptyTitle, { color: titleColor }]}>
								Where should we pick you up?
							</Text>
							<Text style={[styles.emptyBody, responsiveStyles.emptyBody, { color: mutedColor }]}>
								Search hospitals, addresses, or use your current location.
							</Text>
							<View style={[styles.actionChipRow, responsiveStyles.actionChipRow]}>
								<ActionChip
									label={currentLocationActionLabel}
									iconName="locate-outline"
									onPress={handleUseCurrent}
									titleColor={titleColor}
									surfaceColor={cardSurface}
									responsiveStyles={responsiveStyles}
								/>
								<ActionChip
									label="Enter address"
									iconName="create-outline"
									onPress={handleBrowseNearby}
									titleColor={titleColor}
									surfaceColor={cardSurface}
									responsiveStyles={responsiveStyles}
								/>
							</View>
						</View>
					) : null}
				</>
			)}

			{/* Glass Confirm Dialog for Clear History */}
			<GlassConfirmDialog
				visible={showClearConfirm}
				title="Clear Recent Searches"
				message="Are you sure you want to clear your recent search history?"
				confirmText="Clear"
				cancelText="Cancel"
				iconName="time-outline"
				isDestructive={true}
				isDarkMode={isDarkMode}
				onConfirm={handleConfirmClear}
				onCancel={handleCancelClear}
			/>
		</>
	);
}
