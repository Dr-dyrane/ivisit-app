import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import googlePlacesService from "../../services/googlePlacesService";
import MapModalShell from "./MapModalShell";

function mapGeocodeResult(result) {
	const location = result?.geometry?.location;
	const components = Array.isArray(result?.address_components) ? result.address_components : [];
	const pick = (type) =>
		components.find((item) => item.types?.includes(type))?.long_name || null;
	const streetNumber = pick("street_number");
	const route = pick("route");
	const locality =
		pick("locality") || pick("sublocality") || pick("administrative_area_level_2");
	const region = pick("administrative_area_level_1");
	const primaryText =
		[streetNumber, route].filter(Boolean).join(" ").trim() ||
		result?.formatted_address ||
		"Selected location";
	const secondaryText =
		[locality, region].filter(Boolean).join(", ").trim() ||
		result?.formatted_address ||
		"";

	return {
		primaryText,
		secondaryText,
		location: location ? { latitude: location.lat, longitude: location.lng } : null,
	};
}

function mapSuggestionToLocation(suggestion) {
	if (!suggestion) return null;

	if (suggestion.location) {
		return {
			primaryText:
				suggestion.primaryText || suggestion.formattedAddress || "Selected location",
			secondaryText:
				suggestion.secondaryText || suggestion.formattedAddress || "",
			location: suggestion.location,
		};
	}

	return null;
}

function LocationRow({
	title,
	subtitle,
	iconName,
	onPress,
	titleColor,
	mutedColor,
	surfaceColor,
	isLoading = false,
}) {
	return (
		<Pressable onPress={onPress} style={[styles.resultRow, { backgroundColor: surfaceColor }]}>
			<View style={styles.resultLeading}>
				<View style={styles.resultIconWrap}>
					{isLoading ? (
						<ActivityIndicator size="small" color={COLORS.brandPrimary} />
					) : (
						<Ionicons name={iconName} size={18} color={COLORS.brandPrimary} />
					)}
				</View>
				<View style={styles.resultCopy}>
					<Text numberOfLines={1} style={[styles.resultTitle, { color: titleColor }]}>
						{title}
					</Text>
					{subtitle ? (
						<Text numberOfLines={2} style={[styles.resultSubtitle, { color: mutedColor }]}>
							{subtitle}
						</Text>
					) : null}
				</View>
			</View>
			<Ionicons name="chevron-forward" size={18} color={mutedColor} />
		</Pressable>
	);
}

export default function MapLocationModal({
	visible,
	onClose,
	onUseCurrentLocation,
	onSelectLocation,
	currentLocation = null,
}) {
	const { isDarkMode } = useTheme();
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState([]);
	const [error, setError] = useState(null);
	const [isSearching, setIsSearching] = useState(false);
	const [resolvingPlaceId, setResolvingPlaceId] = useState(null);
	const requestIdRef = useRef(0);
	const sessionTokenRef = useRef(null);

	const titleColor = isDarkMode ? "#F8FAFC" : "#111827";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const inputSurface = isDarkMode ? "rgba(255,255,255,0.07)" : "#F8FAFC";
	const groupedSurface = isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.035)";
	const cardSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";

	const handleDismiss = useCallback(() => {
		setQuery("");
		setSuggestions([]);
		setError(null);
		setIsSearching(false);
		setResolvingPlaceId(null);
		sessionTokenRef.current = null;
		onClose?.();
	}, [onClose]);

	const handleUseSuggestion = useCallback(
		async (suggestion) => {
			if (!suggestion?.placeId) return;
			setError(null);
			setResolvingPlaceId(suggestion.placeId);

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

				onSelectLocation?.(mapped);
				handleDismiss();
			} catch (_error) {
				setError("We couldn't use that address yet.");
			} finally {
				setResolvingPlaceId(null);
			}
		},
		[handleDismiss, onSelectLocation],
	);

	const handleUseCurrent = useCallback(() => {
		onUseCurrentLocation?.();
		handleDismiss();
	}, [handleDismiss, onUseCurrentLocation]);

	useEffect(() => {
		if (!visible) return undefined;
		sessionTokenRef.current = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
		return undefined;
	}, [visible]);

	useEffect(() => {
		if (!visible) return undefined;

		const trimmed = query.trim();
		if (trimmed.length < 2) {
			setSuggestions([]);
			setError(null);
			setIsSearching(false);
			return undefined;
		}

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;

		const timeout = setTimeout(async () => {
			setIsSearching(true);
			setError(null);

			try {
				const nextSuggestions = await googlePlacesService.searchAddressSuggestions(trimmed, {
					location: currentLocation,
					sessionToken: sessionTokenRef.current,
				});

				if (requestIdRef.current !== requestId) return;
				setSuggestions(nextSuggestions);
			} catch (_searchError) {
				if (requestIdRef.current !== requestId) return;
				setSuggestions([]);
				setError("We couldn't search locations right now.");
			} finally {
				if (requestIdRef.current === requestId) {
					setIsSearching(false);
				}
			}
		}, 260);

		return () => clearTimeout(timeout);
	}, [currentLocation, query, visible]);

	const content = useMemo(() => {
		const hasQuery = query.trim().length > 0;

		return (
			<>
				<View style={[styles.inputShell, { backgroundColor: inputSurface }]}>
					<Ionicons name="search" size={18} color={mutedColor} />
					<TextInput
						value={query}
						onChangeText={setQuery}
						placeholder="Change location"
						placeholderTextColor={mutedColor}
						style={[styles.input, { color: titleColor }]}
						autoCapitalize="words"
						autoCorrect={false}
					/>
					{query.length > 0 ? (
						<Pressable onPress={() => setQuery("")}>
							<Ionicons name="close-circle" size={18} color={mutedColor} />
						</Pressable>
					) : null}
				</View>

				<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
					<LocationRow
						title={currentLocation?.primaryText || "Current location"}
						subtitle={currentLocation?.secondaryText || "Use your device location"}
						iconName="locate"
						onPress={handleUseCurrent}
						titleColor={titleColor}
						mutedColor={mutedColor}
						surfaceColor={cardSurface}
					/>
				</View>

				{error ? (
					<Text style={[styles.errorText, { color: COLORS.brandPrimary }]}>{error}</Text>
				) : null}

				{hasQuery ? (
					<View style={styles.section}>
						<Text style={[styles.sectionTitle, { color: titleColor }]}>Results</Text>
						<View style={[styles.resultGroup, { backgroundColor: groupedSurface }]}>
							{isSearching && suggestions.length === 0 ? (
								<LocationRow
									title="Searching"
									subtitle="Looking for addresses nearby"
									iconName="search"
									onPress={() => {}}
									titleColor={titleColor}
									mutedColor={mutedColor}
									surfaceColor={cardSurface}
									isLoading
								/>
							) : suggestions.length > 0 ? (
								suggestions.map((suggestion, index) => (
									<View key={suggestion.placeId || `${suggestion.primaryText}-${index}`}>
										<LocationRow
											title={suggestion.primaryText || "Selected location"}
											subtitle={suggestion.secondaryText || suggestion.description || ""}
											iconName="location-outline"
											onPress={() => handleUseSuggestion(suggestion)}
											titleColor={titleColor}
											mutedColor={mutedColor}
											surfaceColor={cardSurface}
											isLoading={resolvingPlaceId === suggestion.placeId}
										/>
										{index < suggestions.length - 1 ? (
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
									<Text style={[styles.emptyText, { color: mutedColor }]}>No places yet</Text>
								</View>
							)}
						</View>
					</View>
				) : null}
			</>
		);
	}, [
		cardSurface,
		currentLocation?.primaryText,
		currentLocation?.secondaryText,
		error,
		groupedSurface,
		handleUseCurrent,
		handleUseSuggestion,
		inputSurface,
		isDarkMode,
		isSearching,
		mutedColor,
		query,
		resolvingPlaceId,
		suggestions,
		titleColor,
	]);

	return (
		<MapModalShell
			visible={visible}
			onClose={handleDismiss}
			title="Location"
			minHeightRatio={0.78}
			contentContainerStyle={styles.content}
		>
			{content}
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingTop: 0,
		paddingBottom: 10,
		gap: 16,
	},
	inputShell: {
		minHeight: 56,
		borderRadius: 24,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	input: {
		flex: 1,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "400",
	},
	section: {
		gap: 12,
	},
	sectionTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
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
	errorText: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "400",
	},
	emptyState: {
		paddingHorizontal: 14,
		paddingVertical: 18,
	},
	emptyText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "400",
	},
});
