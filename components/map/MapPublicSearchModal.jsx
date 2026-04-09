import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { SearchBoundary, useSearch } from "../../contexts/SearchContext";
import { useSearchRanking } from "../../hooks/search/useSearchRanking";
import EmergencySearchBar from "../emergency/EmergencySearchBar";
import { COLORS } from "../../constants/colors";
import MapModalShell from "./MapModalShell";

function SearchResultRow({ item, onPress, titleColor, mutedColor, surfaceColor }) {
	return (
		<Pressable onPress={onPress} style={[styles.resultRow, { backgroundColor: surfaceColor }]}>
			<View style={styles.resultLeading}>
				<View style={styles.resultIconWrap}>
					<Ionicons name={item.icon || "search-outline"} size={18} color={COLORS.brandPrimary} />
				</View>
				<View style={styles.resultCopy}>
					<Text numberOfLines={1} style={[styles.resultTitle, { color: titleColor }]}>
						{item.title}
					</Text>
					{item.subtitle ? (
						<Text numberOfLines={2} style={[styles.resultSubtitle, { color: mutedColor }]}>
							{item.subtitle}
						</Text>
					) : null}
				</View>
			</View>
			<Ionicons name="chevron-forward" size={18} color={mutedColor} />
		</Pressable>
	);
}

function QueryChip({ label, onPress, titleColor, surfaceColor }) {
	return (
		<Pressable onPress={onPress} style={[styles.queryChip, { backgroundColor: surfaceColor }]}>
			<Ionicons name="search-outline" size={14} color={COLORS.brandPrimary} />
			<Text numberOfLines={1} style={[styles.queryChipLabel, { color: titleColor }]}>
				{label}
			</Text>
		</Pressable>
	);
}

function MapPublicSearchModalContent({ visible, onClose }) {
	const { isDarkMode } = useTheme();
	const {
		query,
		setSearchQuery,
		recentQueries = [],
		trendingSearches = [],
		trendingLoading = false,
		commitQuery,
	} = useSearch();
	const { rankedResults } = useSearchRanking();

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const groupedSurface = isDarkMode ? "rgba(255,255,255,0.055)" : "rgba(15,23,42,0.045)";
	const cardSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";
	const hasQuery = typeof query === "string" && query.trim().length > 0;
	const visibleTrending = trendingSearches.slice(0, 6);

	useEffect(() => {
		if (!visible) {
			setSearchQuery("");
		}
	}, [setSearchQuery, visible]);

	const handleDismiss = () => {
		setSearchQuery("");
		onClose?.();
	};

	const handleSelectResult = (item) => {
		handleDismiss();
		setTimeout(() => {
			item?.onPress?.();
		}, 80);
	};

	return (
		<MapModalShell
			visible={visible}
			onClose={handleDismiss}
			title="Search"
			minHeightRatio={0.78}
			contentContainerStyle={styles.content}
		>
			<EmergencySearchBar
				value={query}
				onChangeText={setSearchQuery}
				onBlur={() => commitQuery(query)}
				onClear={() => setSearchQuery("")}
				placeholder="Search iVisit"
				showSuggestions={false}
				style={styles.searchBar}
			/>

			{hasQuery ? (
				rankedResults.length > 0 ? (
					<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
						{rankedResults.map((item, index) => (
							<View key={item.key || `${item.title}-${index}`}>
								<SearchResultRow
									item={item}
									onPress={() => handleSelectResult(item)}
									titleColor={titleColor}
									mutedColor={mutedColor}
									surfaceColor={cardSurface}
								/>
								{index < rankedResults.length - 1 ? (
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
				) : (
					<View style={[styles.emptyState, { backgroundColor: groupedSurface }]}>
						<Text style={[styles.emptyStateText, { color: titleColor }]}>No results yet</Text>
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

					<View style={styles.section}>
						<Text style={[styles.sectionTitle, { color: titleColor }]}>Popular</Text>
						<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
							{trendingLoading ? (
								<View style={styles.emptyState}>
									<Text style={[styles.emptyStateText, { color: mutedColor }]}>Loading</Text>
								</View>
							) : visibleTrending.length > 0 ? (
								visibleTrending.map((item, index) => (
									<View key={`${item.query || "trend"}-${item.count || 0}-${index}`}>
										<Pressable
											onPress={() => setSearchQuery(item.query)}
											style={[styles.resultRow, { backgroundColor: cardSurface }]}
										>
											<View style={styles.resultLeading}>
												<View style={styles.resultIconWrap}>
													<Ionicons name="trending-up" size={18} color={COLORS.brandPrimary} />
												</View>
												<View style={styles.resultCopy}>
													<Text numberOfLines={1} style={[styles.resultTitle, { color: titleColor }]}>
														{item.query}
													</Text>
													<Text numberOfLines={1} style={[styles.resultSubtitle, { color: mutedColor }]}>
														{item.count} searches
													</Text>
												</View>
											</View>
											<Ionicons name="chevron-forward" size={18} color={mutedColor} />
										</Pressable>
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
							) : (
								<View style={styles.emptyState}>
									<Text style={[styles.emptyStateText, { color: mutedColor }]}>Search iVisit</Text>
								</View>
							)}
						</View>
					</View>
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
		minHeight: 68,
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
	resultIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: `${COLORS.brandPrimary}14`,
		alignItems: "center",
		justifyContent: "center",
	},
	resultCopy: {
		flex: 1,
	},
	resultTitle: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
	},
	resultSubtitle: {
		marginTop: 3,
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "400",
	},
	rowDivider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 66,
	},
	emptyState: {
		paddingHorizontal: 14,
		paddingVertical: 18,
	},
	emptyStateText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "600",
	},
});
