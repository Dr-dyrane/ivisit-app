import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../../contexts/ThemeContext";
import { COLORS } from "../../../../constants/colors";
import {
	buildHospitalDistance,
	buildHospitalPrice,
	buildHospitalRating,
	buildHospitalSubtitle,
} from "./mapHospitalList.helpers";
import { styles } from "./mapHospitalList.styles";

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

export default function MapHospitalListContent({
	hospitals = [],
	selectedHospitalId = null,
	recommendedHospitalId = null,
	onSelectHospital,
	onChangeLocation,
	isLoading = false,
}) {
	const { isDarkMode } = useTheme();
	const hasHospitals = Array.isArray(hospitals) && hospitals.length > 0;
	const titleColor = isDarkMode ? "#F8FAFC" : "#111827";
	const helperColor = isDarkMode ? "#94A3B8" : "#667085";
	const rowSurface = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.94)";
	const rowPressed = isDarkMode ? "rgba(255,255,255,0.08)" : "#FFFFFF";
	const rowActive = isDarkMode ? "rgba(134,16,14,0.14)" : "rgba(220,38,38,0.05)";
	const rowBorder = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";
	const metaChipBg = isDarkMode ? "rgba(255,255,255,0.065)" : "rgba(15,23,42,0.045)";
	const badgeBg = isDarkMode ? "rgba(134,16,14,0.16)" : "rgba(220,38,38,0.08)";
	const badgeText = isDarkMode ? "#FDE8E8" : "#991B1B";
	const activeText = isDarkMode ? "#FDE8E8" : "#7F1D1D";
	const emptySurface = isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.9)";

	const content = useMemo(() => {
		if (isLoading) {
			return (
				<View style={styles.emptyCard}>
					<Text style={[styles.emptyTitle, { color: titleColor }]}>Loading hospitals</Text>
				</View>
			);
		}

		if (!hasHospitals) {
			return (
				<View style={[styles.emptyCard, { backgroundColor: emptySurface }]}>
					<View style={styles.emptyIconWrap}>
						<SheetIconTile isDarkMode={isDarkMode}>
							<MaterialCommunityIcons
								name="hospital-box-outline"
								size={22}
								color={COLORS.brandPrimary}
							/>
						</SheetIconTile>
					</View>
					<Text style={[styles.emptyTitle, { color: titleColor }]}>
						No nearby hospitals yet
					</Text>
					{typeof onChangeLocation === "function" ? (
						<Pressable
							onPress={onChangeLocation}
							style={[styles.changeLocationButton, { backgroundColor: rowSurface }]}
						>
							<Ionicons name="location-outline" size={16} color={titleColor} />
							<Text style={[styles.changeLocationText, { color: titleColor }]}>
								Change location
							</Text>
						</Pressable>
					) : null}
				</View>
			);
		}

		return hospitals.map((hospital, index) => {
			const isSelected = hospital?.id === selectedHospitalId;
			const isRecommended = hospital?.id === recommendedHospitalId;
			const distanceLabel = buildHospitalDistance(hospital);
			const ratingLabel = buildHospitalRating(hospital);
			const priceLabel = buildHospitalPrice(hospital);

			return (
				<Pressable
					key={hospital?.id || `${hospital?.name || "hospital"}-${index}`}
					onPress={() => onSelectHospital?.(hospital)}
					style={({ pressed }) => [
						styles.row,
						{
							backgroundColor: isSelected
								? rowActive
								: pressed
									? rowPressed
									: rowSurface,
							borderColor: isSelected ? badgeBg : rowBorder,
							opacity: pressed ? 0.96 : 1,
							transform: [{ scale: pressed ? 0.995 : 1 }],
						},
					]}
				>
					<View style={styles.rowTop}>
						<View style={styles.rowHeading}>
							<SheetIconTile isDarkMode={isDarkMode}>
								<MaterialCommunityIcons
									name="hospital-building"
									size={18}
									color={isDarkMode ? "#FFFFFF" : COLORS.brandPrimary}
								/>
							</SheetIconTile>
							<View style={styles.titleBlock}>
								<View style={styles.rowTitleLine}>
									<Text
										style={[
											styles.rowTitle,
											{ color: isSelected ? activeText : titleColor },
										]}
										numberOfLines={1}
									>
										{hospital?.name || "Hospital"}
									</Text>
									{isRecommended ? (
										<View style={[styles.recommendedBadge, { backgroundColor: badgeBg }]}>
											<Text style={[styles.recommendedBadgeText, { color: badgeText }]}>
												Recommended
											</Text>
										</View>
									) : null}
								</View>
								<Text numberOfLines={1} style={[styles.rowSubtitle, { color: helperColor }]}>
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
								<Ionicons name="checkmark-circle" size={20} color={COLORS.brandPrimary} />
							) : (
								<View style={[styles.selectionRing, { borderColor: helperColor }]} />
							)}
						</View>
					</View>

					{distanceLabel || ratingLabel || priceLabel ? (
						<View style={styles.metaRow}>
							{distanceLabel ? (
								<View style={[styles.metaChip, { backgroundColor: metaChipBg }]}>
									<Ionicons name="navigate" size={12} color={COLORS.brandPrimary} />
									<Text style={[styles.rowMeta, { color: helperColor }]}>{distanceLabel}</Text>
								</View>
							) : null}
							{ratingLabel ? (
								<View style={[styles.metaChip, { backgroundColor: metaChipBg }]}>
									<Ionicons name="star" size={12} color="#D97706" />
									<Text style={[styles.rowMeta, { color: helperColor }]}>{ratingLabel}</Text>
								</View>
							) : null}
							{priceLabel ? (
								<View style={[styles.metaChip, { backgroundColor: metaChipBg }]}>
									<MaterialCommunityIcons
										name="cash-multiple"
										size={12}
										color="#15803D"
									/>
									<Text style={[styles.rowMeta, { color: helperColor }]}>{priceLabel}</Text>
								</View>
							) : null}
						</View>
					) : null}
				</Pressable>
			);
		});
	}, [
		activeText,
		badgeBg,
		badgeText,
		emptySurface,
		hasHospitals,
		helperColor,
		hospitals,
		isDarkMode,
		isLoading,
		metaChipBg,
		onChangeLocation,
		onSelectHospital,
		recommendedHospitalId,
		rowActive,
		rowBorder,
		rowPressed,
		rowSurface,
		selectedHospitalId,
		titleColor,
	]);

	return <>{content}</>;
}
