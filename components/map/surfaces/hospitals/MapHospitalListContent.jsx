import React, { useEffect, useMemo } from "react";
import { useAtom } from "jotai";
import { mapHospitalListSelectedSpecialtyAtom } from "../../../../atoms/mapFlowAtoms";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
	FontAwesome5,
	Fontisto,
	Ionicons,
	MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../../contexts/ThemeContext";
import { COLORS } from "../../../../constants/colors";
import {
	buildHospitalSpecialtyFilters,
	buildHospitalDistance,
	buildHospitalPrice,
	buildHospitalRating,
	buildHospitalSubtitle,
	hospitalMatchesSpecialty,
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

function renderSpecialtyIcon(iconConfig, color) {
	if (!iconConfig) {
		return <MaterialCommunityIcons name="medical-bag" size={13} color={color} />;
	}

	switch (iconConfig.family) {
		case "Fontisto":
			return <Fontisto name={iconConfig.icon} size={12} color={color} />;
		case "Ionicons":
			return <Ionicons name={iconConfig.icon} size={13} color={color} />;
		case "FontAwesome5":
			return <FontAwesome5 name={iconConfig.icon} size={12} color={color} />;
		default:
			return <MaterialCommunityIcons name={iconConfig.icon} size={13} color={color} />;
	}
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
	// PULLBACK NOTE: Pass 6 sweep-local-state — OLD: useState(null) — resets to "All" on sheet phase change NEW: Jotai atom
	const [selectedSpecialty, setSelectedSpecialty] = useAtom(mapHospitalListSelectedSpecialtyAtom);
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
	const filterPillSurface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
	const filterPillActive = isDarkMode ? "rgba(134,16,14,0.18)" : "rgba(220,38,38,0.10)";
	const filterCountText = isDarkMode ? "#CBD5E1" : "#475467";
	const specialtyFilters = useMemo(
		() => buildHospitalSpecialtyFilters(hospitals),
		[hospitals],
	);
	const filteredHospitals = useMemo(
		() =>
			selectedSpecialty
				? hospitals.filter((hospital) =>
						hospitalMatchesSpecialty(hospital, selectedSpecialty),
					)
				: hospitals,
		[hospitals, selectedSpecialty],
	);
	const hasSpecialtyFilters = specialtyFilters.items.length > 0;

	useEffect(() => {
		if (
			selectedSpecialty &&
			!specialtyFilters.items.some((item) => item.id === selectedSpecialty)
		) {
			setSelectedSpecialty(null);
		}
	}, [selectedSpecialty, specialtyFilters.items]);

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

		return filteredHospitals.map((hospital, index) => {
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
		filteredHospitals,
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

	return (
		<>
			{!isLoading && hasSpecialtyFilters ? (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.specialtyRailContent}
				>
					<Pressable
						onPress={() => setSelectedSpecialty(null)}
						style={({ pressed }) => [
							styles.specialtyPill,
							{
								backgroundColor: !selectedSpecialty ? filterPillActive : filterPillSurface,
								opacity: pressed ? 0.94 : 1,
							},
						]}
					>
						<Ionicons
							name="options-outline"
							size={13}
							color={!selectedSpecialty ? COLORS.brandPrimary : helperColor}
						/>
						<Text
							style={[
								styles.specialtyPillLabel,
								{ color: !selectedSpecialty ? activeText : titleColor },
							]}
						>
							All
						</Text>
						<Text style={[styles.specialtyPillCount, { color: filterCountText }]}>
							{specialtyFilters.totalCount}
						</Text>
					</Pressable>

					{specialtyFilters.items.map((item) => {
						const isActive = selectedSpecialty === item.id;
						return (
							<Pressable
								key={item.id}
								onPress={() =>
									setSelectedSpecialty((current) =>
										current === item.id ? null : item.id,
									)
								}
								style={({ pressed }) => [
									styles.specialtyPill,
									{
										backgroundColor: isActive ? filterPillActive : filterPillSurface,
										opacity: pressed ? 0.94 : 1,
									},
								]}
							>
								{renderSpecialtyIcon(
									item.iconConfig,
									isActive ? COLORS.brandPrimary : helperColor,
								)}
								<Text
									numberOfLines={1}
									style={[
										styles.specialtyPillLabel,
										{ color: isActive ? activeText : titleColor },
									]}
								>
									{item.label}
								</Text>
								<Text style={[styles.specialtyPillCount, { color: filterCountText }]}>
									{item.count}
								</Text>
							</Pressable>
						);
					})}
				</ScrollView>
			) : null}
			{content}
		</>
	);
}
