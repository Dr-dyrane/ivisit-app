import React, { useEffect, useMemo } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
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

function buildHospitalMeta(hospital) {
	const parts = [hospital?.eta, hospital?.distance].filter(Boolean);
	return parts.join(" • ");
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
	onSelectHospital,
	onChangeLocation,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();

	const colors = useMemo(
		() => ({
			scrim: "rgba(2, 6, 23, 0.42)",
			sheet: isDarkMode ? "#101826" : "#FFFFFF",
			sheetGlow: isDarkMode ? "rgba(134,16,14,0.12)" : "rgba(220,38,38,0.08)",
			handle: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(15, 23, 42, 0.12)",
			title: isDarkMode ? "#F8FAFC" : "#111827",
			helper: isDarkMode ? "#94A3B8" : "#667085",
			row: isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(15, 23, 42, 0.035)",
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
		}),
		[isDarkMode],
	);

	useEffect(() => {
		if (!visible) return;
		logEmergencyDebug("hospital_choice_sheet_opened", {
			selectedHospitalId,
			hospitalCount: hospitals.length,
		});

		return () => {
			logEmergencyDebug("hospital_choice_sheet_closed", {
				selectedHospitalId,
			});
		};
	}, [hospitals.length, selectedHospitalId, visible]);

	return (
		<Modal
			animationType="slide"
			transparent
			visible={visible}
			onRequestClose={onClose}
		>
			<Pressable style={[styles.scrim, { backgroundColor: colors.scrim }]} onPress={onClose} />
			<View
				style={[
					styles.sheet,
					{
						backgroundColor: colors.sheet,
						paddingBottom: (insets?.bottom || 0) + 18,
					},
				]}
			>
				<View pointerEvents="none" style={[styles.sheetGlow, { backgroundColor: colors.sheetGlow }]} />
				<View style={[styles.handle, { backgroundColor: colors.handle }]} />

				<View style={styles.headerRow}>
					<View style={styles.headerTextBlock}>
						<Text style={[styles.eyebrow, { color: colors.helper }]}>CHOOSE HOSPITAL</Text>
						<Text style={[styles.title, { color: colors.title }]}>Choose another hospital</Text>
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

				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.list}
				>
					<View style={[styles.resultsGroup, { backgroundColor: colors.groupedSurface }]}>
						{hospitals.map((hospital, index) => {
							const isSelected = hospital?.id === selectedHospitalId;
							const distanceLabel = buildHospitalDistance(hospital);
							const ratingLabel = buildHospitalRating(hospital);
							const priceLabel = buildHospitalPrice(hospital);
							const isLast = index === hospitals.length - 1;
							return (
								<View key={hospital?.id || hospital?.name}>
									<Pressable
										onPress={() => {
											logEmergencyDebug("hospital_choice_card_pressed", {
												selectedHospitalId,
												isSelected,
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
													<Text
														style={[
															styles.rowTitle,
															{ color: isSelected ? colors.activeText : colors.title },
														]}
														numberOfLines={1}
													>
														{hospital?.name || "Hospital"}
													</Text>
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
				</ScrollView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	scrim: {
		flex: 1,
	},
	sheet: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		borderTopLeftRadius: 32,
		borderTopRightRadius: 32,
		paddingTop: 10,
		paddingHorizontal: 20,
		shadowColor: "#000000",
		shadowOpacity: 0.14,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: -12 },
		elevation: 18,
		maxHeight: "76%",
		overflow: "hidden",
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
	resultDivider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 68,
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
	rowActions: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 10,
		paddingTop: 2,
	},
	rowTitle: {
		fontSize: 16,
		lineHeight: 21,
		fontWeight: "900",
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
});
