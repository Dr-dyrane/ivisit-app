import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Keyboard,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableWithoutFeedback,
	useWindowDimensions,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../contexts/ThemeContext";
import { useAndroidKeyboardAwareModal } from "../../../hooks/ui/useAndroidKeyboardAwareModal";
import { COLORS } from "../../../constants/colors";
import googlePlacesService from "../../../services/googlePlacesService";

function mapGeocodeResult(result) {
	const location = result?.geometry?.location;
	const components = Array.isArray(result?.address_components)
		? result.address_components
		: [];
	const pick = (type) =>
		components.find((item) => item.types?.includes(type))?.long_name || null;
	const streetNumber = pick("street_number");
	const route = pick("route");
	const locality =
		pick("locality") ||
		pick("sublocality") ||
		pick("administrative_area_level_2");
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
		location: location
			? { latitude: location.lat, longitude: location.lng }
			: null,
	};
}

function mapSuggestionToLocation(suggestion) {
	if (!suggestion) {
		return null;
	}

	if (suggestion.location) {
		return {
			primaryText:
				suggestion.primaryText ||
				suggestion.formattedAddress ||
				"Selected location",
			secondaryText:
				suggestion.secondaryText ||
				suggestion.formattedAddress ||
				"",
			location: suggestion.location,
		};
	}

	return null;
}

export default function EmergencyLocationSearchSheet({
	visible,
	onClose,
	onUseCurrentLocation,
	onSelectLocation,
	currentLocation = null,
	variant = "ios-mobile",
	keyboardAwareMode = "ios",
	presentationMode = "sheet",
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState([]);
	const [error, setError] = useState(null);
	const [isSearching, setIsSearching] = useState(false);
	const [resolvingPlaceId, setResolvingPlaceId] = useState(null);
	const [isIosKeyboardVisible, setIsIosKeyboardVisible] = useState(false);
	const [iosKeyboardHeight, setIosKeyboardHeight] = useState(0);
	const inputRef = useRef(null);
	const sessionTokenRef = useRef(null);
	const requestIdRef = useRef(0);
	const enableAndroidKeyboardAware = keyboardAwareMode === "android";
	const useDialogPresentation =
		presentationMode === "dialog" &&
		Platform.OS !== "android";
	const isCompactVariant = [
		"ios-mobile",
		"android-mobile",
		"android-fold",
		"web-mobile",
	].includes(variant);
	const isLargeDesktopVariant = [
		"web-lg",
		"web-xl",
		"web-2xl-3xl",
		"web-ultra-wide",
		"macbook",
	].includes(variant);
	const isTabletScaleVariant = [
		"ios-pad",
		"android-tablet",
		"android-chromebook",
		"web-sm-wide",
		"web-md",
	].includes(variant);
	const dialogMaxWidth = useMemo(() => {
		switch (variant) {
			case "ios-pad":
				return 760;
			case "android-chromebook":
			case "macbook":
			case "web-md":
				return 820;
			case "web-lg":
				return 900;
			case "web-xl":
				return 980;
			case "web-2xl-3xl":
				return 1060;
			case "web-ultra-wide":
				return 1140;
			case "web-sm-wide":
			case "android-tablet":
				return 720;
			default:
				return 680;
		}
	}, [variant]);
	const sheetHorizontalPadding = useDialogPresentation
		? isLargeDesktopVariant
			? 28
			: 24
		: isCompactVariant
			? 18
			: 22;
	const inputHeight = isLargeDesktopVariant ? 58 : isCompactVariant ? 52 : 56;
	const resultsMaxHeight = useDialogPresentation
		? isLargeDesktopVariant
			? 480
			: isTabletScaleVariant
				? 440
				: 420
		: isCompactVariant
			? 286
			: 340;
	const overlayHorizontalPadding = useDialogPresentation
		? isLargeDesktopVariant
			? 40
			: 28
		: 0;
	const { keyboardHeight, modalHeight, getKeyboardAvoidingViewProps, getScrollViewProps } =
		useAndroidKeyboardAwareModal({
			defaultHeight: 620,
			maxHeightPercentage: 0.82,
		});
	const keyboardAvoidingProps = enableAndroidKeyboardAware
		? getKeyboardAvoidingViewProps({ style: styles.keyboardWrap })
		: useDialogPresentation
			? {
					style: styles.dialogKeyboardWrap,
				}
		: {
				style: styles.iosKeyboardWrap,
			};
	const scrollProps = enableAndroidKeyboardAware
		? getScrollViewProps({
				style: [
					styles.resultsList,
					{
						maxHeight: resultsMaxHeight,
					},
				],
				contentContainerStyle: styles.resultsContent,
			})
		: {
				style: [
					styles.resultsList,
					useDialogPresentation ? styles.dialogResultsList : null,
					{
						maxHeight: resultsMaxHeight,
					},
				],
				contentContainerStyle: [
					styles.resultsContent,
					useDialogPresentation ? styles.dialogResultsContent : null,
				],
				keyboardShouldPersistTaps: "handled",
			};

	const colors = useMemo(
		() =>
			isDarkMode
				? {
					overlay: "rgba(3, 7, 18, 0.66)",
					sheet: "#0F172A",
					text: "#F8FAFC",
					muted: "#94A3B8",
					input: "rgba(255,255,255,0.07)",
					card: "rgba(255,255,255,0.06)",
					groupedSurface: "rgba(255,255,255,0.045)",
					groupedDivider: "rgba(255,255,255,0.08)",
					closeBg: "rgba(255,255,255,0.08)",
				}
				: {
					overlay: "rgba(15, 23, 42, 0.18)",
					sheet: "#FFFFFF",
					text: "#111827",
					muted: "#64748B",
					input: "#F8FAFC",
					card: "rgba(15,23,42,0.04)",
					groupedSurface: "rgba(15,23,42,0.035)",
					groupedDivider: "rgba(15,23,42,0.08)",
					closeBg: "rgba(15, 23, 42, 0.06)",
				},
		[isDarkMode],
	);

	const handleClose = useCallback(() => {
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
				handleClose();
			} catch (searchError) {
				setError("We couldn't use that address yet.");
			} finally {
				setResolvingPlaceId(null);
			}
		},
		[handleClose, onSelectLocation],
	);

	const handleUseCurrent = useCallback(() => {
		onUseCurrentLocation?.();
		handleClose();
	}, [handleClose, onUseCurrentLocation]);

	useEffect(() => {
		if (!visible) return undefined;

		sessionTokenRef.current = `${Date.now()}-${Math.round(Math.random() * 100000)}`;

		const timeout = setTimeout(() => {
			inputRef.current?.focus?.();
		}, 220);

		return () => clearTimeout(timeout);
	}, [visible]);

	useEffect(() => {
		if (!visible || enableAndroidKeyboardAware || Platform.OS !== "ios") {
			setIsIosKeyboardVisible(false);
			setIosKeyboardHeight(0);
			return undefined;
		}

		const handleKeyboardFrame = (event) => {
			const nextHeight = Math.max(
				0,
				windowHeight - Number(event?.endCoordinates?.screenY || windowHeight),
			);
			setIosKeyboardHeight(nextHeight);
			setIsIosKeyboardVisible(nextHeight > 0);
		};
		const showSubscription = Keyboard.addListener("keyboardWillChangeFrame", handleKeyboardFrame);
		const hideSubscription = Keyboard.addListener("keyboardWillHide", () => {
			setIosKeyboardHeight(0);
			setIsIosKeyboardVisible(false);
		});

		return () => {
			showSubscription.remove();
			hideSubscription.remove();
			setIosKeyboardHeight(0);
			setIsIosKeyboardVisible(false);
		};
	}, [enableAndroidKeyboardAware, visible, windowHeight]);

	const iosSheetMaxHeight = useMemo(() => {
		if (Platform.OS !== "ios") return 620;
		if (!isIosKeyboardVisible || iosKeyboardHeight <= 0) return 620;
		return Math.min(
			620,
			Math.max(360, windowHeight - iosKeyboardHeight - (insets?.top || 0) - 18),
		);
	}, [insets?.top, iosKeyboardHeight, isIosKeyboardVisible, windowHeight]);

	const iosDialogMaxHeight = useMemo(() => {
		if (Platform.OS !== "ios") return 760;
		const topInset = insets?.top || 0;
		const bottomInset = insets?.bottom || 0;
		const keyboardAllowance = isIosKeyboardVisible
			? Math.min(iosKeyboardHeight * 0.42, 180)
			: 0;
		return Math.min(
			760,
			Math.max(
				420,
				windowHeight - topInset - bottomInset - keyboardAllowance - 64,
			),
		);
	}, [
		insets?.bottom,
		insets?.top,
		iosKeyboardHeight,
		isIosKeyboardVisible,
		windowHeight,
	]);

	useEffect(() => {
		if (!visible) {
			return undefined;
		}

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
				const nextSuggestions = await googlePlacesService.searchAddressSuggestions(
					trimmed,
					{
						location: currentLocation,
						sessionToken: sessionTokenRef.current,
					},
				);

				if (requestIdRef.current !== requestId) {
					return;
				}

				setSuggestions(nextSuggestions);
			} catch (searchError) {
				if (requestIdRef.current !== requestId) {
					return;
				}

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

	if (!visible) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType={useDialogPresentation ? "fade" : "slide"}
			statusBarTranslucent
			onRequestClose={handleClose}
		>
			<TouchableWithoutFeedback onPress={handleClose}>
				<View
					style={[
						styles.overlay,
						useDialogPresentation ? styles.dialogOverlay : null,
						{
							backgroundColor: colors.overlay,
							paddingHorizontal: overlayHorizontalPadding,
							paddingTop: useDialogPresentation ? Math.max((insets?.top || 0) + 24, 32) : 0,
							paddingBottom:
								enableAndroidKeyboardAware && Platform.OS === "android"
									? keyboardHeight
									: Platform.OS === "ios" && !useDialogPresentation
										? iosKeyboardHeight
										: useDialogPresentation
											? Math.max((insets?.bottom || 0) + 24, 32)
											: 0,
						},
					]}
				>
					<TouchableWithoutFeedback>
						<KeyboardAvoidingView {...keyboardAvoidingProps}>
							<View
								style={[
									styles.sheet,
									useDialogPresentation ? styles.dialogSheet : null,
									{
										backgroundColor: colors.sheet,
										maxWidth: useDialogPresentation ? dialogMaxWidth : undefined,
										maxHeight: enableAndroidKeyboardAware
											? modalHeight
											: useDialogPresentation
												? iosDialogMaxHeight
												: iosSheetMaxHeight,
										marginBottom:
											Platform.OS === "ios" && isIosKeyboardVisible && !useDialogPresentation
												? -12
												: 0,
										paddingBottom:
											Platform.OS === "ios" && isIosKeyboardVisible && !useDialogPresentation
												? 12
												: useDialogPresentation
													? 24
												: Math.max((insets?.bottom || 0) + 18, 24),
										paddingHorizontal: sheetHorizontalPadding,
									},
								]}
							>
								{!useDialogPresentation ? <View style={styles.handle} /> : null}
								<View style={styles.header}>
									<View style={styles.headerCopy}>
										<Text style={[styles.eyebrow, { color: colors.muted }]}>
											SEARCH LOCATION
										</Text>
										<Text
											style={[
												styles.title,
												isLargeDesktopVariant
													? styles.titleLarge
													: isCompactVariant
														? styles.titleCompact
														: null,
												{ color: colors.text },
											]}
										>
											Choose location
										</Text>
									</View>
									<Pressable
										onPress={handleClose}
										style={[styles.closeButton, { backgroundColor: colors.closeBg }]}
									>
										<Ionicons name="close" size={18} color={colors.text} />
									</Pressable>
								</View>

								<View
									style={[
										styles.inputShell,
										{
											backgroundColor: colors.input,
											height: inputHeight,
										},
									]}
								>
									<Ionicons name="search" size={18} color={colors.muted} />
									<TextInput
										ref={inputRef}
										value={query}
										onChangeText={setQuery}
										placeholder="Search address"
										placeholderTextColor={colors.muted}
										style={[styles.input, { color: colors.text }]}
										returnKeyType="done"
										autoCorrect={false}
										autoCapitalize="words"
										autoFocus
									/>
									{isSearching ? (
										<View
											style={[
												styles.inlineSkeleton,
												{
													backgroundColor: isDarkMode
														? "rgba(255,255,255,0.10)"
														: "rgba(15,23,42,0.10)",
												},
											]}
										/>
									) : null}
								</View>

								<View
									style={[
										styles.locationActionGroup,
										{ backgroundColor: colors.groupedSurface },
									]}
								>
									<Pressable onPress={handleUseCurrent} style={styles.useCurrentRow}>
										<View style={styles.useCurrentIconWrap}>
											<Ionicons name="locate" size={16} color={COLORS.brandPrimary} />
										</View>
										<View style={styles.useCurrentCopy}>
											<Text style={[styles.useCurrentText, { color: colors.text }]}>
												Use current location
											</Text>
											<Text style={[styles.useCurrentMeta, { color: colors.muted }]}>
												Use the address detected by iVisit
											</Text>
										</View>
										<Ionicons
											name="chevron-forward"
											size={16}
											color={colors.muted}
										/>
									</Pressable>
								</View>

								{error ? <Text style={styles.errorText}>{error}</Text> : null}

								<ScrollView
									{...scrollProps}
									nativeID={Platform.OS === "web" ? "emergency-location-search-results-scroll" : undefined}
								>
									{isSearching && suggestions.length === 0 ? (
										<View
											style={[
												styles.resultsGroup,
												{ backgroundColor: colors.groupedSurface },
											]}
										>
											{Array.from({ length: 3 }).map((_, index) => (
												<View key={`search-skeleton-${index}`}>
													<View style={styles.resultCard}>
														<View
															style={[
																styles.resultIconSkeleton,
																{
																	backgroundColor: isDarkMode
																		? "rgba(255,255,255,0.08)"
																		: "rgba(15,23,42,0.08)",
																},
															]}
														/>
														<View style={styles.resultCopy}>
															<View
																style={[
																	styles.resultSkeletonPrimary,
																	{
																		backgroundColor: isDarkMode
																			? "rgba(255,255,255,0.10)"
																			: "rgba(15,23,42,0.10)",
																	},
																]}
															/>
															<View
																style={[
																	styles.resultSkeletonSecondary,
																	{
																		backgroundColor: isDarkMode
																			? "rgba(255,255,255,0.07)"
																			: "rgba(15,23,42,0.07)",
																	},
																]}
															/>
														</View>
													</View>
													{index < 2 ? (
														<View
															style={[
																styles.resultDivider,
																{ backgroundColor: colors.groupedDivider },
															]}
														/>
													) : null}
												</View>
											))}
										</View>
									) : suggestions.length > 0 ? (
										<View
											style={[
												styles.resultsGroup,
												{ backgroundColor: colors.groupedSurface },
											]}
										>
											{suggestions.map((suggestion, index) => {
												const isResolving = resolvingPlaceId === suggestion.placeId;
												const isLast = index === suggestions.length - 1;

												return (
													<View key={suggestion.placeId}>
														<Pressable
															onPress={() => void handleUseSuggestion(suggestion)}
															style={styles.resultCard}
														>
															<View style={styles.resultIcon}>
																<Ionicons
																	name="location"
																	size={16}
																	color={COLORS.brandPrimary}
																/>
															</View>
															<View style={styles.resultCopy}>
																<Text
																	style={[styles.resultPrimary, { color: colors.text }]}
																>
																	{suggestion.primaryText}
																</Text>
																{suggestion.secondaryText ? (
																	<Text
																		style={[
																			styles.resultSecondary,
																			{ color: colors.muted },
																		]}
																	>
																		{suggestion.secondaryText}
																	</Text>
																) : null}
															</View>
															<View style={styles.resultTrailing}>
																{isResolving ? (
																	<View
																		style={[
																			styles.inlineSkeleton,
																			styles.resultTrailingSkeleton,
																			{
																				backgroundColor: isDarkMode
																					? "rgba(255,255,255,0.10)"
																					: "rgba(15,23,42,0.10)",
																			},
																		]}
																	/>
																) : (
																	<Ionicons
																		name="chevron-forward"
																		size={16}
																		color={colors.muted}
																	/>
																)}
															</View>
														</Pressable>
														{!isLast ? (
															<View
																style={[
																	styles.resultDivider,
																	{ backgroundColor: colors.groupedDivider },
																]}
															/>
														) : null}
													</View>
												);
											})}
										</View>
									) : null}

									{!isSearching &&
									query.trim().length >= 2 &&
									suggestions.length === 0 &&
									!error ? (
										<Text style={[styles.emptyState, { color: colors.muted }]}>
											No matching addresses yet.
										</Text>
									) : null}
								</ScrollView>
							</View>
						</KeyboardAvoidingView>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "flex-end",
	},
	dialogOverlay: {
		justifyContent: "center",
		alignItems: "center",
	},
	keyboardWrap: {
		justifyContent: "flex-end",
	},
	iosKeyboardWrap: {
		width: "100%",
		justifyContent: "flex-end",
	},
	dialogKeyboardWrap: {
		width: "100%",
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	sheet: {
		borderTopLeftRadius: 30,
		borderTopRightRadius: 30,
		paddingHorizontal: 20,
		paddingTop: Platform.OS === "web" ? 18 : 10,
	},
	dialogSheet: {
		width: "100%",
		maxWidth: 680,
		borderRadius: 32,
		paddingTop: 18,
		paddingHorizontal: 24,
		shadowColor: "#0F172A",
		shadowOpacity: 0.14,
		shadowRadius: 28,
		shadowOffset: { width: 0, height: 18 },
		elevation: 10,
	},
	handle: {
		alignSelf: "center",
		width: 44,
		height: 5,
		borderRadius: 999,
		backgroundColor: "rgba(148,163,184,0.35)",
		marginBottom: 14,
	},
	header: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		marginBottom: 14,
	},
	headerCopy: {
		flex: 1,
		paddingTop: 2,
	},
	eyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		letterSpacing: 1.1,
	},
	title: {
		marginTop: 4,
		fontSize: 24,
		lineHeight: 28,
		fontWeight: "800",
		letterSpacing: -0.4,
	},
	titleCompact: {
		fontSize: 22,
		lineHeight: 26,
	},
	titleLarge: {
		fontSize: 28,
		lineHeight: 32,
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(148,163,184,0.12)",
	},
	inputShell: {
		height: 54,
		borderRadius: 20,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	input: {
		flex: 1,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "500",
	},
	inlineSkeleton: {
		width: 22,
		height: 12,
		borderRadius: 999,
	},
	locationActionGroup: {
		marginTop: 16,
		borderRadius: 24,
		overflow: "hidden",
	},
	useCurrentRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingVertical: 14,
		minHeight: 64,
	},
	useCurrentIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: `${COLORS.brandPrimary}14`,
	},
	useCurrentText: {
		fontSize: 15,
		lineHeight: 19,
		fontWeight: "700",
	},
	useCurrentCopy: {
		flex: 1,
		marginLeft: 12,
		marginRight: 10,
	},
	useCurrentMeta: {
		marginTop: 3,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "400",
	},
	errorText: {
		marginTop: 12,
		color: COLORS.brandPrimary,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "600",
	},
	resultsList: {
		marginTop: 14,
		maxHeight: 286,
	},
	resultsContent: {
		paddingBottom: 8,
	},
	dialogResultsList: {
		maxHeight: 420,
	},
	dialogResultsContent: {
		paddingBottom: 14,
	},
	resultsGroup: {
		borderRadius: 24,
		overflow: "hidden",
	},
	resultCard: {
		paddingHorizontal: 14,
		paddingVertical: 14,
		minHeight: 64,
		flexDirection: "row",
		alignItems: "center",
	},
	resultDivider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 60,
	},
	resultIcon: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: `${COLORS.brandPrimary}14`,
		marginRight: 12,
	},
	resultIconSkeleton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		marginRight: 12,
	},
	resultCopy: {
		flex: 1,
	},
	resultTrailing: {
		width: 18,
		alignItems: "flex-end",
		justifyContent: "center",
	},
	resultTrailingSkeleton: {
		width: 18,
		height: 12,
	},
	resultPrimary: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "700",
	},
	resultSkeletonPrimary: {
		width: "66%",
		height: 14,
		borderRadius: 999,
	},
	resultSkeletonSecondary: {
		width: "42%",
		height: 12,
		borderRadius: 999,
		marginTop: 10,
	},
	resultSecondary: {
		marginTop: 3,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "400",
	},
	emptyState: {
		marginTop: 14,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "400",
		textAlign: "center",
	},
});
