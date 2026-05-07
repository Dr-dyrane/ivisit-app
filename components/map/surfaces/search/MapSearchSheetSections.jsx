import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../../../constants/colors";
import useResponsiveSurfaceMetrics from "../../../../hooks/ui/useResponsiveSurfaceMetrics";
import {
	buildHospitalMeta,
	buildHospitalSubtitle,
	buildTrendingSubtitle,
	MAP_SEARCH_SHEET_MODES,
} from "./mapSearchSheet.helpers";
import { getMapSearchSheetResponsiveStyles, styles } from "./mapSearchSheet.styles";

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
	surfaceColor,
	onPress,
	isSelected = false,
	badgeLabel = null,
	isDarkMode,
	responsiveStyles,
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
									style={[styles.resultMeta, responsiveStyles.resultMeta, { color: mutedColor }]}
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
	return (
		<Pressable onPress={onPress}>
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

function ModeChip({
	label,
	iconName,
	active = false,
	onPress,
	disabled = false,
	titleColor,
	mutedColor,
	surfaceColor,
	activeSurfaceColor,
	responsiveStyles,
}) {
	return (
		<Pressable disabled={disabled} onPress={onPress}>
			{({ pressed }) => (
				<View
					style={[
						styles.modeChip,
						responsiveStyles.modeChip,
						{
							backgroundColor: active ? activeSurfaceColor : surfaceColor,
							opacity: disabled ? 0.55 : pressed ? 0.9 : 1,
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
							responsiveStyles.modeChipLabel,
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
		activeMode,
		activeChipSurface,
		cardSurface,
		currentLocation,
		currentLocationActionLabel,
		currentLocationBadgeLabel,
		groupedSurface,
		handleModeChange,
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
		locationError,
		locationPromptBody,
		locationPromptTitle,
		locationSectionTitle,
		manualEntryActionLabel,
		mutedColor,
		nearbyHospitals,
		orderedQuerySections,
		placeResults,
		recentQueries,
		rowDividerColor,
		selectedHospitalId,
		setSearchQuery,
		titleColor,
		trendingLoading,
		visibleTrending,
	} = model;

	const isLocationMode = activeMode === MAP_SEARCH_SHEET_MODES.LOCATION;

	return (
		<>
			<View style={[styles.modeSwitchRow, responsiveStyles.modeSwitchRow]}>
				<ModeChip
					label="Care"
					iconName="medkit-outline"
					active={!isLocationMode}
					onPress={() => handleModeChange(MAP_SEARCH_SHEET_MODES.SEARCH)}
					disabled={isDismissing}
					titleColor={titleColor}
					mutedColor={mutedColor}
					surfaceColor={groupedSurface}
					activeSurfaceColor={activeChipSurface}
					responsiveStyles={responsiveStyles}
				/>
				<ModeChip
					label="Pickup"
					iconName="location-outline"
					active={isLocationMode}
					onPress={() => handleModeChange(MAP_SEARCH_SHEET_MODES.LOCATION)}
					disabled={isDismissing}
					titleColor={titleColor}
					mutedColor={mutedColor}
					surfaceColor={groupedSurface}
					activeSurfaceColor={activeChipSurface}
					responsiveStyles={responsiveStyles}
				/>
			</View>

			{!hasQuery ? (
				<>
					{isLocationMode ? (
						<View
							style={[
								styles.emptyState,
								responsiveStyles.emptyState,
								{ backgroundColor: groupedSurface },
							]}
						>
							<View style={[styles.emptyIconWrap, responsiveStyles.emptyIconWrap]}>
								<Ionicons
									name="navigate-outline"
									size={20}
									color={COLORS.brandPrimary}
								/>
							</View>
							<Text
								style={[
									styles.emptyTitle,
									responsiveStyles.emptyTitle,
									{ color: titleColor },
								]}
							>
								{locationPromptTitle}
							</Text>
							<Text
								style={[
									styles.emptyBody,
									responsiveStyles.emptyBody,
									{ color: mutedColor },
								]}
							>
								{locationPromptBody}
							</Text>
						</View>
					) : null}

					<View style={[styles.section, responsiveStyles.section]}>
						<Text style={[styles.sectionTitle, responsiveStyles.sectionTitle, { color: titleColor }]}>
							{isLocationMode ? "Pickup controls" : "Current area"}
						</Text>
						<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
							<SearchResultRow
								iconName="locate"
								title={
									isLocationMode
										? currentLocationActionLabel
										: currentLocation?.primaryText || "Current location"
								}
								subtitle={
									isLocationMode
										? "Use your device location for pickup."
										: currentLocation?.secondaryText || "Use your device location"
								}
								meta={currentLocation?.secondaryText || locationPromptBody}
								titleColor={titleColor}
								mutedColor={mutedColor}
								surfaceColor={cardSurface}
								isDarkMode={isDarkMode}
								badgeLabel={currentLocationBadgeLabel}
								onPress={handleUseCurrent}
								responsiveStyles={responsiveStyles}
							/>
						</View>
					</View>

					{isLocationMode ? (
						<Text
							style={[
								styles.loadingText,
								responsiveStyles.loadingText,
								{ color: mutedColor },
							]}
						>
							{`${manualEntryActionLabel}: type a street, area, city, or landmark above.`}
						</Text>
					) : null}

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

					{recentQueries.length > 0 ? (
						<View style={[styles.section, responsiveStyles.section]}>
							<Text style={[styles.sectionTitle, responsiveStyles.sectionTitle, { color: titleColor }]}>
								Recent
							</Text>
							<View style={[styles.chipWrap, responsiveStyles.chipWrap]}>
								{recentQueries.slice(0, 6).map((recentQuery, index) => (
									<QueryChip
										key={`${recentQuery}-${index}`}
										label={recentQuery}
										onPress={() => setSearchQuery(recentQuery)}
										titleColor={titleColor}
										surfaceColor={groupedSurface}
										responsiveStyles={responsiveStyles}
									/>
								))}
							</View>
						</View>
					) : null}

					{visibleTrending.length > 0 || trendingLoading ? (
						<View style={[styles.section, responsiveStyles.section]}>
							<Text style={[styles.sectionTitle, responsiveStyles.sectionTitle, { color: titleColor }]}>
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
									titleColor={titleColor}
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

						if (sectionKey === "places" && (placeResults.length > 0 || isSearchingLocations)) {
							return (
								<View key="places" style={[styles.section, responsiveStyles.section]}>
									<Text style={[styles.sectionTitle, responsiveStyles.sectionTitle, { color: titleColor }]}>
										{locationSectionTitle}
									</Text>
									<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
										{placeResults.length === 0 && isSearchingLocations ? (
											<View style={[styles.loadingRow, responsiveStyles.loadingRow]}>
												<ActivityIndicator size="small" color={COLORS.brandPrimary} />
												<Text style={[styles.loadingText, responsiveStyles.loadingText, { color: mutedColor }]}>
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
								<Ionicons name="search-outline" size={20} color={COLORS.brandPrimary} />
							</View>
							<Text style={[styles.emptyTitle, responsiveStyles.emptyTitle, { color: titleColor }]}>
								No matches nearby
							</Text>
							<Text style={[styles.emptyBody, responsiveStyles.emptyBody, { color: mutedColor }]}>
								Try a hospital name, specialty, or another area.
							</Text>
							<View style={[styles.actionChipRow, responsiveStyles.actionChipRow]}>
								<ActionChip
									label="See all hospitals"
									iconName="list-outline"
									onPress={handleOpenHospitalList}
									titleColor={titleColor}
									surfaceColor={cardSurface}
									responsiveStyles={responsiveStyles}
								/>
								<ActionChip
									label="Use current area"
									iconName="locate-outline"
									onPress={handleUseCurrent}
									titleColor={titleColor}
									surfaceColor={cardSurface}
									responsiveStyles={responsiveStyles}
								/>
							</View>
						</View>
					) : null}
				</>
			)}
		</>
	);
}
