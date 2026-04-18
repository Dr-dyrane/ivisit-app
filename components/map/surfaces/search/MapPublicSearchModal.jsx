import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../../contexts/ThemeContext";
import { SearchBoundary, useSearch } from "../../../../contexts/SearchContext";
import EmergencySearchBar from "../../../emergency/EmergencySearchBar";
import { COLORS } from "../../../../constants/colors";
import useResponsiveSurfaceMetrics from "../../../../hooks/ui/useResponsiveSurfaceMetrics";
import {
	buildHospitalMeta,
	buildHospitalSubtitle,
	buildLocalPopularSearches,
	buildTrendingSubtitle,
	humanizeQueryLabel,
	normalizeText,
	scoreHospitalMatch,
} from "./mapSearchSheet.helpers";
import { getMapSearchSheetResponsiveStyles, styles } from "./mapSearchSheet.styles";
import MapModalShell from "../MapModalShell";

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

function MapPublicSearchModalContent({
	visible,
	onClose,
	hospitals = [],
	selectedHospitalId = null,
	onOpenHospital,
	onBrowseHospitals,
	onChangeLocation,
}) {
	const { isDarkMode } = useTheme();
	const viewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "modal" });
	const responsiveStyles = useMemo(
		() => getMapSearchSheetResponsiveStyles(viewportMetrics),
		[viewportMetrics],
	);
	const {
		query,
		setSearchQuery,
		recentQueries = [],
		trendingSearches = [],
		trendingLoading = false,
		commitQuery,
	} = useSearch();

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const groupedSurface = isDarkMode ? "rgba(255,255,255,0.055)" : "rgba(15,23,42,0.045)";
	const cardSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.94)";
	const rowDividerColor = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
	const hasQuery = typeof query === "string" && query.trim().length > 0;
	const nearbyHospitals = Array.isArray(hospitals) ? hospitals.filter(Boolean).slice(0, 4) : [];
	const localPopularSearches = useMemo(
		() => buildLocalPopularSearches(hospitals, 5),
		[hospitals],
	);
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

	const searchResults = useMemo(() => {
		if (!hasQuery) return [];

		return (Array.isArray(hospitals) ? hospitals : [])
			.filter(Boolean)
			.map((hospital) => ({
				hospital,
				score: scoreHospitalMatch(query, hospital),
			}))
			.filter((entry) => entry.score > 0)
			.sort((left, right) => right.score - left.score)
			.slice(0, 12);
	}, [hasQuery, hospitals, query]);

	useEffect(() => {
		if (!visible) {
			setSearchQuery("");
		}
	}, [setSearchQuery, visible]);

	const handleDismiss = () => {
		setSearchQuery("");
		onClose?.();
	};

	const handleOpenNearbyHospital = (hospital) => {
		if (!hospital) return;
		commitQuery(query || hospital?.name || "");
		handleDismiss();
		setTimeout(() => {
			onOpenHospital?.(hospital);
		}, 80);
	};

	const handleOpenHospitalList = () => {
		handleDismiss();
		setTimeout(() => {
			onBrowseHospitals?.();
		}, 80);
	};

	const handleOpenLocation = () => {
		handleDismiss();
		setTimeout(() => {
			onChangeLocation?.();
		}, 80);
	};

	return (
		<MapModalShell
			visible={visible}
			onClose={handleDismiss}
			title="Search"
			minHeightRatio={0.82}
			contentContainerStyle={[styles.content, responsiveStyles.content]}
		>
			<EmergencySearchBar
				value={query}
				onChangeText={setSearchQuery}
				onBlur={() => commitQuery(query)}
				onClear={() => setSearchQuery("")}
				placeholder="Search nearby hospitals or specialties"
				showSuggestions={false}
				style={styles.searchBar}
			/>

			{hasQuery ? (
				searchResults.length > 0 ? (
					<View style={[styles.section, responsiveStyles.section]}>
						<Text style={[styles.sectionTitle, responsiveStyles.sectionTitle, { color: titleColor }]}>
							{searchResults.length === 1 ? "1 match nearby" : `${searchResults.length} matches nearby`}
						</Text>
						<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
							{searchResults.map((entry, index) => (
								<View key={entry.hospital?.id || `${entry.hospital?.name || "hospital"}-${index}`}>
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
										onPress={() => handleOpenNearbyHospital(entry.hospital)}
										responsiveStyles={responsiveStyles}
									/>
									{index < searchResults.length - 1 ? (
										<View
											style={[
												styles.rowDivider,
												responsiveStyles.rowDivider,
												{ backgroundColor: rowDividerColor },
											]}
										/>
									) : null}
								</View>
							))}
						</View>
					</View>
				) : (
					<View style={[styles.emptyState, responsiveStyles.emptyState, { backgroundColor: groupedSurface }]}>
						<View style={[styles.emptyIconWrap, responsiveStyles.emptyIconWrap]}>
							<Ionicons name="search-outline" size={20} color={COLORS.brandPrimary} />
						</View>
						<Text style={[styles.emptyTitle, responsiveStyles.emptyTitle, { color: titleColor }]}>
							No nearby matches
						</Text>
						<Text style={[styles.emptyBody, responsiveStyles.emptyBody, { color: mutedColor }]}>
							Try a hospital or specialty.
						</Text>
						<View style={[styles.actionChipRow, responsiveStyles.actionChipRow]}>
							{typeof onBrowseHospitals === "function" ? (
								<ActionChip
									label="See all hospitals"
									iconName="list-outline"
									onPress={handleOpenHospitalList}
									titleColor={titleColor}
									surfaceColor={cardSurface}
									responsiveStyles={responsiveStyles}
								/>
							) : null}
							{typeof onChangeLocation === "function" ? (
								<ActionChip
									label="Change location"
									iconName="location-outline"
									onPress={handleOpenLocation}
									titleColor={titleColor}
									surfaceColor={cardSurface}
									responsiveStyles={responsiveStyles}
								/>
							) : null}
						</View>
					</View>
				)
			) : (
				<>
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

					{nearbyHospitals.length > 0 ? (
						<View style={[styles.section, responsiveStyles.section]}>
							<Text style={[styles.sectionTitle, responsiveStyles.sectionTitle, { color: titleColor }]}>
								Nearby now
							</Text>
							<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
								{nearbyHospitals.map((hospital, index) => (
									<View key={hospital?.id || `${hospital?.name || "hospital"}-${index}`}>
										<SearchResultRow
											iconName="hospital-building"
											iconType="material"
											title={hospital?.name || "Hospital"}
											subtitle={buildHospitalSubtitle(hospital)}
											meta={buildHospitalMeta(hospital)}
											titleColor={titleColor}
											mutedColor={mutedColor}
											surfaceColor={cardSurface}
											isDarkMode={isDarkMode}
											isSelected={hospital?.id === selectedHospitalId}
											badgeLabel={index === 0 ? "Closest" : hospital?.verified ? "Verified" : null}
											onPress={() => handleOpenNearbyHospital(hospital)}
											responsiveStyles={responsiveStyles}
										/>
										{index < nearbyHospitals.length - 1 ? (
											<View
												style={[
													styles.rowDivider,
													responsiveStyles.rowDivider,
													{ backgroundColor: rowDividerColor },
												]}
											/>
										) : null}
									</View>
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

					{nearbyHospitals.length === 0 &&
					recentQueries.length === 0 &&
					visibleTrending.length === 0 &&
					!trendingLoading ? (
						<View style={[styles.emptyState, responsiveStyles.emptyState, { backgroundColor: groupedSurface }]}>
							<View style={[styles.emptyIconWrap, responsiveStyles.emptyIconWrap]}>
								<Ionicons name="location-outline" size={20} color={COLORS.brandPrimary} />
							</View>
							<Text style={[styles.emptyTitle, responsiveStyles.emptyTitle, { color: titleColor }]}>
								Start with location
							</Text>
							<Text style={[styles.emptyBody, responsiveStyles.emptyBody, { color: mutedColor }]}>
								Pick an area to load nearby care.
							</Text>
							{typeof onChangeLocation === "function" ? (
								<View style={[styles.actionChipRow, responsiveStyles.actionChipRow]}>
									<ActionChip
										label="Choose location"
										iconName="navigate-outline"
										onPress={handleOpenLocation}
										titleColor={titleColor}
										surfaceColor={cardSurface}
										responsiveStyles={responsiveStyles}
									/>
								</View>
							) : null}
						</View>
					) : null}
				</>
			)}
		</MapModalShell>
	);
}

export default function MapPublicSearchModal(props) {
	return (
		<SearchBoundary>
			<MapPublicSearchModalContent {...props} />
		</SearchBoundary>
	);
}
