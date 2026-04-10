import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { SearchBoundary, useSearch } from "../../contexts/SearchContext";
import EmergencySearchBar from "../emergency/EmergencySearchBar";
import { COLORS } from "../../constants/colors";
import MapModalShell from "./MapModalShell";

function normalizeText(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function toStringList(value) {
	return Array.isArray(value)
		? value
				.filter((item) => typeof item === "string" && item.trim().length > 0)
				.map((item) => item.trim())
		: [];
}

function humanizeQueryLabel(value) {
	const cleaned = String(value || "")
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (!cleaned) return "";

	return cleaned
		.split(" ")
		.map((word) => {
			if (!word) return word;
			return word === word.toUpperCase() ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
		})
		.join(" ");
}

function buildHospitalSubtitle(hospital) {
	const locality = [hospital?.city, hospital?.region].filter(Boolean).join(", ").trim();
	if (locality) return locality;

	const address = [hospital?.streetNumber, hospital?.street].filter(Boolean).join(" ").trim();
	if (address) return address;

	return hospital?.address || hospital?.formattedAddress || "Available nearby";
}

function buildHospitalMeta(hospital) {
	const distance =
		typeof hospital?.distance === "string" && hospital.distance.trim().length > 0
			? hospital.distance.trim()
			: null;
	const eta =
		typeof hospital?.eta === "string" && hospital.eta.trim().length > 0
			? hospital.eta.trim()
			: null;
	const beds = Number(hospital?.availableBeds ?? hospital?.available_beds);
	const bedLabel = Number.isFinite(beds) && beds > 0 ? `${beds} beds open` : null;
	return [distance, eta, bedLabel].filter(Boolean).join(" | ");
}

function buildTrendingSubtitle(item) {
	const count = Number(item?.count);
	if (Number.isFinite(count) && count > 0) {
		const metric = typeof item?.metric === "string" ? item.metric.trim().toLowerCase() : "search";
		return `${count} ${count === 1 ? metric : `${metric}s`}`;
	}

	const category = typeof item?.category === "string" ? item.category.trim() : "";
	if (category) {
		return category.replace(/[_-]+/g, " ");
	}

	const rank = Number(item?.rank);
	if (Number.isFinite(rank) && rank > 0) {
		return `Trending now`;
	}

	return "Popular search";
}

function buildLocalPopularSearches(hospitals, limit = 5) {
	const counts = new Map();
	const addCandidate = (value, category) => {
		const query = humanizeQueryLabel(value);
		const key = normalizeText(query);
		if (!query || key.length < 3) return;

		const existing = counts.get(key) || {
			query,
			count: 0,
			metric: "hospital",
			category,
		};
		existing.count += 1;
		if (!existing.category && category) {
			existing.category = category;
		}
		counts.set(key, existing);
	};

	(Array.isArray(hospitals) ? hospitals : []).filter(Boolean).forEach((hospital) => {
		toStringList(hospital?.specialties).forEach((item) => addCandidate(item, "Specialty"));
		toStringList(hospital?.serviceTypes || hospital?.service_types).forEach((item) =>
			addCandidate(item, "Service"),
		);
	});

	const ranked = Array.from(counts.values())
		.sort((left, right) => {
			if (right.count !== left.count) return right.count - left.count;
			return left.query.localeCompare(right.query);
		})
		.slice(0, limit);

	if (ranked.length >= limit) return ranked;

	const seen = new Set(ranked.map((item) => normalizeText(item.query)));
	for (const hospital of (Array.isArray(hospitals) ? hospitals : []).filter(Boolean)) {
		if (ranked.length >= limit) break;
		const query = humanizeQueryLabel(hospital?.name);
		const key = normalizeText(query);
		if (!query || seen.has(key)) continue;
		seen.add(key);
		ranked.push({
			query,
			count: 1,
			metric: "hospital",
			category: "Hospital",
		});
	}

	return ranked;
}

function scoreHospitalMatch(query, hospital) {
	const normalizedQuery = normalizeText(query);
	if (!normalizedQuery) return 0;

	const tokens = normalizedQuery.split(" ").filter(Boolean);
	if (!tokens.length) return 0;

	const name = normalizeText(hospital?.name);
	const subtitle = normalizeText(buildHospitalSubtitle(hospital));
	const specialties = normalizeText(toStringList(hospital?.specialties).join(" "));
	const features = normalizeText(
		[
			...toStringList(hospital?.features),
			...toStringList(hospital?.serviceTypes || hospital?.service_types),
		].join(" "),
	);

	let score = 0;

	if (name === normalizedQuery) score += 140;
	else if (name.startsWith(normalizedQuery)) score += 100;
	else if (name.includes(normalizedQuery)) score += 72;

	if (specialties.includes(normalizedQuery)) score += 64;
	if (features.includes(normalizedQuery)) score += 36;
	if (subtitle.includes(normalizedQuery)) score += 28;

	for (const token of tokens) {
		if (name.includes(token)) score += 18;
		if (specialties.includes(token)) score += 14;
		if (features.includes(token)) score += 8;
		if (subtitle.includes(token)) score += 6;
	}

	const beds = Number(hospital?.availableBeds ?? hospital?.available_beds);
	if (
		Number.isFinite(beds) &&
		beds > 0 &&
		(tokens.includes("bed") || tokens.includes("beds") || tokens.includes("icu"))
	) {
		score += 18;
	}

	if (hospital?.verified) score += 4;

	return score;
}

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

	const handleOpenHospital = (hospital) => {
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
			contentContainerStyle={styles.content}
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
					<View style={styles.section}>
						<Text style={[styles.sectionTitle, { color: titleColor }]}>
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
										onPress={() => handleOpenHospital(entry.hospital)}
									/>
									{index < searchResults.length - 1 ? (
										<View
											style={[
												styles.rowDivider,
												{
													backgroundColor: isDarkMode
														? "rgba(255,255,255,0.08)"
														: "rgba(15,23,42,0.08)",
												},
											]}
										/>
									) : null}
								</View>
							))}
						</View>
					</View>
				) : (
					<View style={[styles.emptyState, { backgroundColor: groupedSurface }]}>
						<View style={styles.emptyIconWrap}>
							<Ionicons name="search-outline" size={20} color={COLORS.brandPrimary} />
						</View>
						<Text style={[styles.emptyTitle, { color: titleColor }]}>No nearby matches</Text>
						<Text style={[styles.emptyBody, { color: mutedColor }]}> 
							Try a hospital or specialty.
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
							{typeof onChangeLocation === "function" ? (
								<ActionChip
									label="Change location"
									iconName="location-outline"
									onPress={handleOpenLocation}
									titleColor={titleColor}
									surfaceColor={cardSurface}
								/>
							) : null}
						</View>
					</View>
				)
			) : (
				<>
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

					{nearbyHospitals.length > 0 ? (
						<View style={styles.section}>
							<Text style={[styles.sectionTitle, { color: titleColor }]}>Nearby now</Text>
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
											onPress={() => handleOpenHospital(hospital)}
										/>
										{index < nearbyHospitals.length - 1 ? (
											<View
												style={[
													styles.rowDivider,
													{
														backgroundColor: isDarkMode
															? "rgba(255,255,255,0.08)"
															: "rgba(15,23,42,0.08)",
													},
												]}
											/>
										) : null}
									</View>
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
										<Text style={[styles.loadingText, { color: mutedColor }]}>Refreshing searches</Text>
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
													style={[
														styles.rowDivider,
														{
															backgroundColor: isDarkMode
																? "rgba(255,255,255,0.08)"
																: "rgba(15,23,42,0.08)",
														},
													]}
												/>
											) : null}
										</View>
									))
								)}
							</View>
						</View>
					) : null}

					{nearbyHospitals.length === 0 && recentQueries.length === 0 && visibleTrending.length === 0 && !trendingLoading ? (
						<View style={[styles.emptyState, { backgroundColor: groupedSurface }]}>
							<View style={styles.emptyIconWrap}>
								<Ionicons name="location-outline" size={20} color={COLORS.brandPrimary} />
							</View>
							<Text style={[styles.emptyTitle, { color: titleColor }]}>Start with location</Text>
							<Text style={[styles.emptyBody, { color: mutedColor }]}>
								Pick an area to load nearby care.
							</Text>
							{typeof onChangeLocation === "function" ? (
								<View style={styles.actionChipRow}>
									<ActionChip
										label="Choose location"
										iconName="navigate-outline"
										onPress={handleOpenLocation}
										titleColor={titleColor}
										surfaceColor={cardSurface}
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

const styles = StyleSheet.create({
	content: {
		paddingTop: 0,
		paddingBottom: 10,
		gap: 18,
	},
	searchBar: {
		marginTop: 0,
		marginBottom: 0,
	},
	section: {
		gap: 12,
	},
	sectionTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
	},
	chipWrap: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
	},
	queryChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 999,
		maxWidth: "100%",
	},
	queryChipLabel: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
		maxWidth: 220,
	},
	resultGroup: {
		borderRadius: 28,
		overflow: "hidden",
	},
	resultRow: {
		paddingHorizontal: 14,
		paddingVertical: 14,
		minHeight: 74,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	resultLeading: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		gap: 12,
	},
	sheetIconShell: {
		width: 40,
		height: 40,
		borderRadius: 20,
		padding: 1,
		shadowColor: "#0F172A",
		shadowOpacity: 0.05,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 3 },
	},
	sheetIconFill: {
		flex: 1,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	sheetIconHighlight: {
		position: "absolute",
		left: 1,
		right: 1,
		top: 1,
		height: "42%",
		borderRadius: 18,
		backgroundColor: "rgba(255,255,255,0.2)",
	},
	resultCopy: {
		flex: 1,
	},
	resultTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 8,
	},
	resultTitle: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
		flexShrink: 1,
	},
	resultBadge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 999,
		backgroundColor: `${COLORS.brandPrimary}18`,
	},
	resultBadgeText: {
		fontSize: 10,
		lineHeight: 12,
		fontWeight: "800",
		color: COLORS.brandPrimary,
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	resultSubtitle: {
		marginTop: 3,
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "400",
	},
	resultMeta: {
		marginTop: 4,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "500",
	},
	rowDivider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 66,
	},
	emptyState: {
		borderRadius: 28,
		paddingHorizontal: 18,
		paddingVertical: 22,
		alignItems: "center",
		gap: 10,
	},
	emptyIconWrap: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: `${COLORS.brandPrimary}14`,
	},
	emptyTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
		textAlign: "center",
	},
	emptyBody: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "400",
		textAlign: "center",
		maxWidth: 320,
	},
	actionChipRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		gap: 10,
		marginTop: 2,
	},
	actionChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 999,
	},
	actionChipLabel: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
	},
	loadingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 14,
		paddingVertical: 18,
	},
	loadingText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "400",
	},
});
