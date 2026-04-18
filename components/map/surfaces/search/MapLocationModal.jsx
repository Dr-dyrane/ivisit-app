import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../../contexts/ThemeContext";
import { COLORS } from "../../../../constants/colors";
import useResponsiveSurfaceMetrics from "../../../../hooks/ui/useResponsiveSurfaceMetrics";
import googlePlacesService from "../../../../services/googlePlacesService";
import MapModalShell from "../MapModalShell";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

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

function SheetIconTile({ iconName, isDarkMode, isLoading = false }) {
	const viewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "modal" });
	const tileSize = Math.max(36, Math.round(viewportMetrics.radius.card * 1.45));
	const colors = isDarkMode
		? ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.05)"]
		: ["#FFFFFF", "#EEF2F7"];

	return (
		<View
			style={[
				styles.sheetIconShell,
				{
					width: tileSize,
					height: tileSize,
					borderRadius: Math.round(tileSize / 2),
				},
			]}
		>
			<LinearGradient
				colors={colors}
				start={{ x: 0.08, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[
					styles.sheetIconFill,
					{ borderRadius: Math.round(tileSize / 2) - 1 },
				]}
			>
				<View
					pointerEvents="none"
					style={[
						styles.sheetIconHighlight,
						{ borderRadius: Math.round(tileSize / 2) - 2 },
					]}
				/>
				{isLoading ? (
					<ActivityIndicator size="small" color={COLORS.brandPrimary} />
				) : (
					<Ionicons name={iconName} size={18} color={COLORS.brandPrimary} />
				)}
			</LinearGradient>
		</View>
	);
}

function LocationRow({
	title,
	subtitle,
	iconName,
	onPress,
	titleColor,
	mutedColor,
	surfaceColor,
	isDarkMode,
	isLoading = false,
}) {
	const viewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "modal" });
	const tileSize = Math.max(36, Math.round(viewportMetrics.radius.card * 1.45));
	return (
		<Pressable
			onPress={onPress}
			style={[
				styles.resultRow,
				{
					backgroundColor: surfaceColor,
					paddingHorizontal: Math.max(13, viewportMetrics.insets.horizontal - 1),
					paddingVertical: Math.max(13, viewportMetrics.insets.sectionGap),
					minHeight: Math.max(68, Math.round(viewportMetrics.cta.primaryHeight * 1.28)),
					gap: Math.max(10, viewportMetrics.insets.sectionGap - 2),
				},
			]}
		>
			<View
				style={[
					styles.resultLeading,
					{ gap: Math.max(10, viewportMetrics.insets.sectionGap - 2) },
				]}
			>
				<SheetIconTile iconName={iconName} isDarkMode={isDarkMode} isLoading={isLoading} />
				<View style={styles.resultCopy}>
					<Text
						numberOfLines={1}
						style={[
							styles.resultTitle,
							{
								color: titleColor,
								fontSize: Math.max(15, viewportMetrics.type.body),
								lineHeight: Math.max(20, viewportMetrics.type.bodyLineHeight - 4),
							},
						]}
					>
						{title}
					</Text>
					{subtitle ? (
						<Text
							numberOfLines={2}
							style={[
								styles.resultSubtitle,
								{
									color: mutedColor,
									fontSize: viewportMetrics.type.caption,
									lineHeight: Math.max(17, viewportMetrics.type.captionLineHeight + 1),
								},
							]}
						>
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
	const viewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "modal" });

	const titleColor = isDarkMode ? "#F8FAFC" : "#111827";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const inputSurface = isDarkMode ? "rgba(255,255,255,0.07)" : "#FFFFFF";
	const groupedSurface = isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.035)";
	const cardSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.94)";
	const tileSize = Math.max(36, Math.round(viewportMetrics.radius.card * 1.45));

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
				<View
					style={[
						styles.inputShell,
						{
							backgroundColor: inputSurface,
							minHeight: Math.max(52, viewportMetrics.cta.primaryHeight - 2),
							paddingHorizontal: Math.max(14, viewportMetrics.modal.contentPadding - 2),
							borderRadius: viewportMetrics.radius.card,
						},
					]}
				>
					<Ionicons name="search" size={18} color={mutedColor} />
					<TextInput
						value={query}
						onChangeText={setQuery}
						placeholder="Search area"
						placeholderTextColor={mutedColor}
						style={[
							styles.input,
							{
								color: titleColor,
								fontSize: viewportMetrics.type.body,
								lineHeight: Math.max(18, viewportMetrics.type.bodyLineHeight - 4),
							},
						]}
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
						isDarkMode={isDarkMode}
					/>
				</View>

				{error ? (
					<Text style={[styles.errorText, { color: COLORS.brandPrimary }]}>{error}</Text>
				) : null}

				{hasQuery ? (
					<View style={[styles.section, { gap: Math.max(10, viewportMetrics.insets.sectionGap - 2) }]}>
						<Text
							style={[
								styles.sectionTitle,
								{
									color: titleColor,
									fontSize: Math.max(16, viewportMetrics.type.title),
									lineHeight: viewportMetrics.type.titleLineHeight,
								},
							]}
						>
							Results
						</Text>
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
														marginLeft: Math.max(58, tileSize + Math.max(18, viewportMetrics.insets.sectionGap + 8)),
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
			contentContainerStyle={[
				styles.content,
				{
					paddingBottom: Math.max(10, viewportMetrics.insets.sectionGap - 2),
					gap: viewportMetrics.insets.sectionGap,
				},
			]}
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
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		...squircle(24),
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
		overflow: "hidden",
		...squircle(28),
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
