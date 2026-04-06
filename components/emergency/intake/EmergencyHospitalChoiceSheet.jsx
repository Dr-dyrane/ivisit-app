import React, { useEffect, useMemo } from "react";
import {
	ActivityIndicator,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";
import {
	logEmergencyDebug,
	summarizeHospitalForDebug,
} from "../../../utils/emergencyDebug";

function buildHospitalSubtitle(hospital) {
	const locality = [hospital?.city, hospital?.region].filter(Boolean).join(", ").trim();
	if (locality) return locality;

	const address = [hospital?.streetNumber, hospital?.street].filter(Boolean).join(" ").trim();
	if (address) return address;

	return hospital?.address || hospital?.formattedAddress || "Available nearby";
}

function buildHospitalDistance(hospital) {
	return typeof hospital?.distance === "string" && hospital.distance.trim().length > 0
		? hospital.distance.trim()
		: null;
}

function buildHospitalRating(hospital) {
	const rating = Number(hospital?.rating);
	if (!Number.isFinite(rating) || rating <= 0) return null;
	return rating.toFixed(1);
}

function buildHospitalPrice(hospital) {
	const candidates = [hospital?.price, hospital?.priceRange, hospital?.priceLabel];
	const direct = candidates.find(
		(value) => typeof value === "string" && value.trim().length > 0,
	);
	if (direct) return direct.trim();

	const numeric = Number(hospital?.price);
	if (Number.isFinite(numeric) && numeric > 0) {
		return `$${Math.round(numeric)}`;
	}

	return null;
}

export default function EmergencyHospitalChoiceSheet({
	visible,
	onClose,
	hospitals = [],
	selectedHospitalId = null,
	recommendedHospitalId = null,
	onSelectHospital,
	onChangeLocation,
	onRetry,
	isLoading = false,
	isRefreshing = false,
	statusMessage = "",
	variant = "ios-mobile",
	presentationMode = "sheet",
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const hasHospitals = hospitals.length > 0;
	const mode = !hasHospitals && isLoading ? "loading" : hasHospitals ? "results" : "empty";
	const useDialogPresentation =
		presentationMode === "dialog" && Platform.OS !== "android";
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
				return 640;
		}
	}, [variant]);
	const overlayHorizontalPadding = useDialogPresentation
		? isLargeDesktopVariant
			? 40
			: 28
		: 0;
	const sheetHorizontalPadding = useDialogPresentation
		? isLargeDesktopVariant
			? 28
			: isTabletScaleVariant
				? 24
				: 20
		: isCompactVariant
			? 18
			: 20;
	const listMaxHeight = useDialogPresentation
		? Math.min(
				windowHeight * 0.48,
				isLargeDesktopVariant ? 480 : isTabletScaleVariant ? 440 : 380,
			)
		: undefined;

	const colors = useMemo(
		() => ({
			scrim: "rgba(2, 6, 23, 0.42)",
			sheet: isDarkMode ? "#101826" : "#FFFFFF",
			sheetGlow: isDarkMode ? "rgba(134,16,14,0.12)" : "rgba(220,38,38,0.08)",
			handle: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(15, 23, 42, 0.12)",
			title: isDarkMode ? "#F8FAFC" : "#111827",
			helper: isDarkMode ? "#94A3B8" : "#667085",
			rowActive: isDarkMode ? "rgba(134,16,14,0.16)" : "rgba(220,38,38,0.06)",
			rowPressed: isDarkMode ? "rgba(255,255,255,0.07)" : "rgba(15, 23, 42, 0.055)",
			iconSurface: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15, 23, 42, 0.05)",
			iconColor: isDarkMode ? "#FFFFFF" : COLORS.brandPrimary,
			meta: isDarkMode ? "#CBD5E1" : "#475467",
			metaChipBg: isDarkMode ? "rgba(255,255,255,0.065)" : "rgba(15, 23, 42, 0.045)",
			groupedSurface: isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.035)",
			groupedDivider: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
			closeBg: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15, 23, 42, 0.06)",
			accent: COLORS.brandPrimary,
			ratingAccent: isDarkMode ? "#FBBF24" : "#D97706",
			priceAccent: isDarkMode ? "#86EFAC" : "#15803D",
			activeRing: isDarkMode ? "rgba(134,16,14,0.34)" : "rgba(220,38,38,0.14)",
			activeText: isDarkMode ? "#FDE8E8" : "#7F1D1D",
			bannerBg: isDarkMode ? "rgba(148, 163, 184, 0.10)" : "rgba(15, 23, 42, 0.05)",
			bannerText: isDarkMode ? "#E2E8F0" : "#334155",
			emptySurface: isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.035)",
			skeletonBase: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
			skeletonSoft: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
			badgeBg: isDarkMode ? "rgba(134,16,14,0.16)" : "rgba(220,38,38,0.08)",
			badgeText: isDarkMode ? "#FDE8E8" : "#991B1B",
			emptyActionBg: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
		}),
		[isDarkMode],
	);

	const headerTitle = mode === "loading"
		? "Checking nearby hospitals"
		: mode === "empty"
			? "No nearby hospitals yet"
			: "Choose another hospital";
	const headerEyebrow = mode === "loading"
		? "LOADING OPTIONS"
		: mode === "empty"
			? "NO OPTIONS YET"
			: "CHOOSE HOSPITAL";
	const helperCopy = mode === "loading"
		? statusMessage || "We are matching nearby hospitals and route details for this location."
		: mode === "empty"
			? statusMessage || "Try changing the location or refresh options."
			: statusMessage;

	useEffect(() => {
		if (!visible) return;
		logEmergencyDebug("hospital_choice_sheet_opened", {
			selectedHospitalId,
			recommendedHospitalId,
			hospitalCount: hospitals.length,
			mode,
		});

		return () => {
			logEmergencyDebug("hospital_choice_sheet_closed", {
				selectedHospitalId,
				recommendedHospitalId,
				mode,
			});
		};
	}, [hospitals.length, mode, recommendedHospitalId, selectedHospitalId, visible]);

	return (
		<Modal
			animationType={useDialogPresentation ? "fade" : "slide"}
			transparent
			visible={visible}
			onRequestClose={onClose}
		>
			<View
				style={[
					styles.modalHost,
					useDialogPresentation ? styles.dialogHost : null,
					{ paddingHorizontal: overlayHorizontalPadding },
				]}
			>
				<Pressable style={[styles.scrim, { backgroundColor: colors.scrim }]} onPress={onClose} />
				<View
					style={[
						styles.sheet,
						useDialogPresentation ? styles.dialogSheet : null,
						{
							backgroundColor: colors.sheet,
							paddingBottom: (insets?.bottom || 0) + (useDialogPresentation ? 14 : 18),
							paddingHorizontal: sheetHorizontalPadding,
							maxWidth: useDialogPresentation ? dialogMaxWidth : undefined,
							maxHeight: useDialogPresentation
								? Math.min(
										windowHeight * 0.82,
										isLargeDesktopVariant ? 820 : isTabletScaleVariant ? 760 : 680,
								  )
								: Math.min(windowHeight * 0.78, 720),
						},
					]}
				>
					<View pointerEvents="none" style={[styles.sheetGlow, { backgroundColor: colors.sheetGlow }]} />
					{!useDialogPresentation ? (
						<View style={[styles.handle, { backgroundColor: colors.handle }]} />
					) : null}

				<View style={styles.headerRow}>
					<View style={styles.headerTextBlock}>
						<Text style={[styles.eyebrow, { color: colors.helper }]}>{headerEyebrow}</Text>
						<Text style={[styles.title, { color: colors.title }]}>{headerTitle}</Text>
						{helperCopy && mode !== "results" ? (
							<Text style={[styles.headerHelper, { color: colors.helper }]}>
								{helperCopy}
							</Text>
						) : null}
					</View>
					<Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.closeBg }]}>
						<Ionicons name="close" size={18} color={colors.title} />
					</Pressable>
				</View>

				{typeof onChangeLocation === "function" ? (
					<View
						style={[
							styles.changeLocationGroup,
							{ backgroundColor: colors.groupedSurface },
						]}
					>
						<Pressable
							onPress={() => {
								logEmergencyDebug("hospital_choice_change_location_pressed", {
									selectedHospitalId,
								});
								onChangeLocation();
							}}
							style={styles.changeLocationRow}
						>
							<View style={[styles.changeLocationIconWrap, { backgroundColor: colors.iconSurface }]}>
								<Ionicons name="navigate" size={16} color={colors.accent} />
							</View>
							<View style={styles.changeLocationCopy}>
								<Text style={[styles.changeLocationTitle, { color: colors.title }]}>
									Change location
								</Text>
								<Text style={[styles.changeLocationMeta, { color: colors.helper }]}>
									Search a different address first
								</Text>
							</View>
							<Ionicons
								name="chevron-forward"
								size={16}
								color={colors.helper}
							/>
						</Pressable>
					</View>
				) : null}

				{mode === "results" && helperCopy ? (
					<View style={[styles.banner, { backgroundColor: colors.bannerBg }]}>
						{isRefreshing ? (
							<ActivityIndicator size="small" color={COLORS.brandPrimary} />
						) : (
							<Ionicons name="information-circle-outline" size={16} color={COLORS.brandPrimary} />
						)}
						<Text style={[styles.bannerText, { color: colors.bannerText }]}>
							{helperCopy}
						</Text>
					</View>
				) : null}

					<ScrollView
						showsVerticalScrollIndicator={false}
						style={listMaxHeight ? { maxHeight: listMaxHeight } : null}
						contentContainerStyle={styles.list}
					>
					{mode === "loading" ? (
						<View style={[styles.resultsGroup, { backgroundColor: colors.groupedSurface }]}>
							{Array.from({ length: 3 }).map((_, index) => (
								<View key={`hospital-loading-${index}`}>
									<View style={styles.skeletonRow}>
										<View style={[styles.skeletonIcon, { backgroundColor: colors.skeletonBase }]} />
										<View style={styles.skeletonCopy}>
											<View style={[styles.skeletonTitle, { backgroundColor: colors.skeletonBase }]} />
											<View style={[styles.skeletonSubtitle, { backgroundColor: colors.skeletonSoft }]} />
											<View style={styles.skeletonMetaRow}>
												<View style={[styles.skeletonMetaChip, { backgroundColor: colors.skeletonSoft }]} />
												<View style={[styles.skeletonMetaChipShort, { backgroundColor: colors.skeletonSoft }]} />
											</View>
										</View>
									</View>
								</View>
							))}
						</View>
					) : null}

					{mode === "empty" ? (
						<View style={[styles.emptyCard, { backgroundColor: colors.emptySurface }]}>
							<View style={[styles.emptyIconWrap, { backgroundColor: colors.iconSurface }]}>
								<MaterialCommunityIcons
									name="hospital-box-outline"
									size={22}
									color={colors.iconColor}
								/>
							</View>
							<Text style={[styles.emptyTitle, { color: colors.title }]}>
								No nearby hospitals are ready to show yet
							</Text>
							<Text style={[styles.emptySupport, { color: colors.helper }]}>
								Refresh the list or change location to widen the search radius.
							</Text>
							<View style={styles.emptyActions}>
								{typeof onRetry === "function" ? (
									<Pressable
										onPress={onRetry}
										style={[
											styles.emptyActionButton,
											{ backgroundColor: colors.emptyActionBg },
										]}
									>
										<Ionicons name="refresh" size={16} color={colors.title} />
										<Text style={[styles.emptyActionText, { color: colors.title }]}>
											Refresh
										</Text>
									</Pressable>
								) : null}
								{typeof onChangeLocation === "function" ? (
									<Pressable
										onPress={onChangeLocation}
										style={[
											styles.emptyActionButton,
											{ backgroundColor: colors.emptyActionBg },
										]}
									>
										<Ionicons name="search" size={16} color={colors.title} />
										<Text style={[styles.emptyActionText, { color: colors.title }]}>
											Change location
										</Text>
									</Pressable>
								) : null}
							</View>
						</View>
					) : null}

					{mode === "results" ? (
						<View style={[styles.resultsGroup, { backgroundColor: colors.groupedSurface }]}>
							{hospitals.map((hospital, index) => {
								const isSelected = hospital?.id === selectedHospitalId;
								const isRecommended = hospital?.id === recommendedHospitalId;
								const distanceLabel = buildHospitalDistance(hospital);
								const ratingLabel = buildHospitalRating(hospital);
								const priceLabel = buildHospitalPrice(hospital);
								const isLast = index === hospitals.length - 1;
								return (
									<View key={hospital?.id || hospital?.name || `hospital-${index}`}>
										<Pressable
											disabled={!onSelectHospital}
											onPress={() => {
												logEmergencyDebug("hospital_choice_card_pressed", {
													selectedHospitalId,
													isSelected,
													isRecommended,
													hospital: summarizeHospitalForDebug(hospital),
												});
												onSelectHospital?.(hospital);
											}}
											style={({ pressed }) => [
												styles.row,
												{
													backgroundColor: isSelected
														? colors.rowActive
														: pressed
															? colors.rowPressed
															: "transparent",
												},
											]}
										>
											<View style={styles.rowTop}>
												<View style={styles.rowHeading}>
													<View style={[styles.iconWrap, { backgroundColor: colors.iconSurface }]}>
														<MaterialCommunityIcons
															name="hospital-building"
															size={18}
															color={colors.iconColor}
														/>
													</View>
													<View style={styles.titleBlock}>
														<View style={styles.rowTitleLine}>
															<Text
																style={[
																	styles.rowTitle,
																	{ color: isSelected ? colors.activeText : colors.title },
																]}
																numberOfLines={1}
															>
																{hospital?.name || "Hospital"}
															</Text>
															{isRecommended ? (
																<View style={[styles.recommendedBadge, { backgroundColor: colors.badgeBg }]}>
																	<Text style={[styles.recommendedBadgeText, { color: colors.badgeText }]}>
																		Recommended
																	</Text>
																</View>
															) : null}
														</View>
														<Text
															style={[styles.rowSubtitle, { color: colors.helper }]}
															numberOfLines={1}
														>
															{buildHospitalSubtitle(hospital)}
														</Text>
													</View>
												</View>

												<View style={styles.rowActions}>
													{hospital?.eta ? (
														<View style={styles.etaPill}>
															<Text style={styles.etaText}>{hospital.eta}</Text>
														</View>
													) : null}
													{isSelected ? (
														<View style={[styles.selectedBadge, { backgroundColor: colors.activeRing }]}>
															<Ionicons name="checkmark-circle" size={18} color={COLORS.brandPrimary} />
														</View>
													) : (
														<View style={[styles.selectionRing, { borderColor: colors.helper }]} />
													)}
												</View>
											</View>

											{distanceLabel || ratingLabel || priceLabel ? (
												<View style={styles.metaRow}>
													{distanceLabel ? (
														<View style={[styles.metaChip, { backgroundColor: colors.metaChipBg }]}>
															<Ionicons name="navigate" size={12} color={COLORS.brandPrimary} />
															<Text style={[styles.rowMeta, { color: colors.meta }]}>
																{distanceLabel}
															</Text>
														</View>
													) : null}
													{ratingLabel ? (
														<View style={[styles.metaChip, { backgroundColor: colors.metaChipBg }]}>
															<Ionicons name="star" size={12} color={colors.ratingAccent} />
															<Text style={[styles.rowMeta, { color: colors.meta }]}>
																{ratingLabel}
															</Text>
														</View>
													) : null}
													{priceLabel ? (
														<View style={[styles.metaChip, { backgroundColor: colors.metaChipBg }]}>
															<MaterialCommunityIcons
																name="cash-multiple"
																size={12}
																color={colors.priceAccent}
															/>
															<Text style={[styles.rowMeta, { color: colors.meta }]}>
																{priceLabel}
															</Text>
														</View>
													) : null}
												</View>
											) : null}
										</Pressable>
									</View>
								);
							})}
						</View>
					) : null}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modalHost: {
		flex: 1,
		justifyContent: "flex-end",
	},
	dialogHost: {
		justifyContent: "center",
		alignItems: "center",
	},
	scrim: {
		...StyleSheet.absoluteFillObject,
	},
	sheet: {
		width: "100%",
		alignSelf: "stretch",
		borderTopLeftRadius: 32,
		borderTopRightRadius: 32,
		paddingTop: 10,
		paddingHorizontal: 20,
		shadowColor: "#000000",
		shadowOpacity: 0.14,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: -12 },
		elevation: 18,
		maxHeight: "78%",
		overflow: "hidden",
	},
	dialogSheet: {
		alignSelf: "center",
		borderBottomLeftRadius: 32,
		borderBottomRightRadius: 32,
	},
	sheetGlow: {
		position: "absolute",
		top: -56,
		right: -18,
		width: 180,
		height: 180,
		borderRadius: 999,
	},
	handle: {
		alignSelf: "center",
		width: 44,
		height: 5,
		borderRadius: 999,
		marginBottom: 16,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 16,
		marginBottom: 16,
	},
	headerTextBlock: {
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
		letterSpacing: -0.5,
	},
	headerHelper: {
		marginTop: 8,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "500",
		maxWidth: 320,
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	changeLocationGroup: {
		borderRadius: 24,
		overflow: "hidden",
		marginBottom: 14,
	},
	changeLocationRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingVertical: 14,
		minHeight: 64,
	},
	changeLocationIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: `${COLORS.brandPrimary}14`,
	},
	changeLocationCopy: {
		flex: 1,
		marginLeft: 12,
		marginRight: 10,
	},
	changeLocationTitle: {
		fontSize: 15,
		lineHeight: 19,
		fontWeight: "700",
	},
	changeLocationMeta: {
		marginTop: 3,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "400",
	},
	banner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 14,
	},
	bannerText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "500",
	},
	list: {
		paddingBottom: 10,
	},
	resultsGroup: {
		borderRadius: 28,
		overflow: "hidden",
	},
	row: {
		paddingHorizontal: 16,
		paddingVertical: 15,
		minHeight: 76,
	},
	rowTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	rowHeading: {
		flexDirection: "row",
		alignItems: "flex-start",
		flex: 1,
		gap: 12,
	},
	iconWrap: {
		width: 40,
		height: 40,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	titleBlock: {
		flex: 1,
	},
	rowTitleLine: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 8,
	},
	rowActions: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 10,
		paddingTop: 2,
	},
	rowTitle: {
		flexShrink: 1,
		fontSize: 16,
		lineHeight: 21,
		fontWeight: "900",
	},
	recommendedBadge: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
	},
	recommendedBadgeText: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "800",
		letterSpacing: 0.2,
	},
	etaPill: {
		backgroundColor: COLORS.brandPrimary,
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 7,
	},
	etaText: {
		color: "#FFFFFF",
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "800",
	},
	rowSubtitle: {
		marginTop: 4,
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "400",
	},
	metaRow: {
		marginTop: 10,
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	metaChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 999,
		backgroundColor: "rgba(134,16,14,0.08)",
	},
	rowMeta: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "500",
	},
	selectedBadge: {
		width: 26,
		height: 26,
		borderRadius: 13,
		alignItems: "center",
		justifyContent: "center",
	},
	selectionRing: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 1.5,
		marginVertical: 3,
	},
	skeletonRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
		paddingHorizontal: 16,
		paddingVertical: 18,
	},
	skeletonIcon: {
		width: 40,
		height: 40,
		borderRadius: 16,
	},
	skeletonCopy: {
		flex: 1,
	},
	skeletonTitle: {
		width: "62%",
		height: 16,
		borderRadius: 999,
	},
	skeletonSubtitle: {
		marginTop: 10,
		width: "78%",
		height: 12,
		borderRadius: 999,
	},
	skeletonMetaRow: {
		flexDirection: "row",
		gap: 8,
		marginTop: 12,
	},
	skeletonMetaChip: {
		width: 92,
		height: 28,
		borderRadius: 999,
	},
	skeletonMetaChipShort: {
		width: 72,
		height: 28,
		borderRadius: 999,
	},
	emptyCard: {
		borderRadius: 28,
		paddingHorizontal: 22,
		paddingVertical: 22,
		alignItems: "center",
	},
	emptyIconWrap: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
	},
	emptyTitle: {
		marginTop: 16,
		fontSize: 19,
		lineHeight: 24,
		fontWeight: "800",
		textAlign: "center",
	},
	emptySupport: {
		marginTop: 10,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "400",
		textAlign: "center",
		maxWidth: 300,
	},
	emptyActions: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		gap: 10,
		marginTop: 18,
	},
	emptyActionButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 999,
	},
	emptyActionText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
	},
});
