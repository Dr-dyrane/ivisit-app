import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { MAP_EXPLORE_INTENT_COPY, MAP_INTENT_VARIANTS } from "./mapExploreIntent.content";
import styles from "./mapExploreIntent.styles";

export default function MapExploreIntentHospitalSummaryCard({
	variant = MAP_INTENT_VARIANTS.IOS_MOBILE,
	layoutMode = "canonical",
	isCentered = false,
	maxWidth = null,
	tokens,
	isDarkMode,
	nearestHospital,
	nearestHospitalMeta = [],
	nearbyHospitalCount = 0,
	totalAvailableBeds = 0,
	onOpenHospitals,
}) {
	const isWebMobileVariant =
		variant === MAP_INTENT_VARIANTS.WEB_MOBILE ||
		variant === MAP_INTENT_VARIANTS.WEB_SM_WIDE ||
		variant === MAP_INTENT_VARIANTS.WEB_MD;

	if (layoutMode === "canonical") {
		return (
			<Pressable
				onPress={onOpenHospitals}
				style={[
					styles.hospitalCard,
					isCentered ? styles.hospitalCardCentered : null,
					isCentered && maxWidth ? { maxWidth } : null,
					{
						borderRadius: tokens.cardRadius,
						backgroundColor: tokens.strongCardSurface,
					},
				]}
			>
				<View
					style={[
						styles.hospitalIconWrap,
						{
							borderRadius: tokens.cardRadius - 10,
							backgroundColor: tokens.mutedCardSurface,
						},
					]}
				>
					<MaterialCommunityIcons
						name="hospital-building"
						size={18}
						color={isDarkMode ? "#F8FAFC" : "#86100E"}
					/>
				</View>
				<View style={styles.hospitalCardCopy}>
					<Text style={[styles.hospitalEyebrow, { color: tokens.mutedText }]}>
						{MAP_EXPLORE_INTENT_COPY.NEAREST_HOSPITAL}
					</Text>
					<Text numberOfLines={1} style={[styles.hospitalTitle, { color: tokens.titleColor }]}>
						{nearestHospital?.name || MAP_EXPLORE_INTENT_COPY.FINDING_NEAREST_HOSPITAL}
					</Text>
					<Text numberOfLines={1} style={[styles.hospitalMeta, { color: tokens.bodyText }]}>
						{nearestHospitalMeta.join(" | ") || MAP_EXPLORE_INTENT_COPY.TAP_TO_SEE_HOSPITALS}
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={18} color={tokens.mutedText} />
			</Pressable>
		);
	}

	return (
		<Pressable
			onPress={onOpenHospitals}
			style={[
				styles.intentStatusCard,
				isWebMobileVariant ? styles.intentStatusCardWebMobile : null,
				{
					borderRadius: tokens.cardRadius,
					backgroundColor: tokens.strongCardSurface,
				},
			]}
		>
			<View style={styles.intentStatusHeader}>
				<View
					style={[
						styles.intentStatusIconWrap,
						{
							borderRadius: tokens.cardRadius - 12,
							backgroundColor: tokens.mutedCardSurface,
						},
					]}
				>
					<MaterialCommunityIcons
						name="hospital-building"
						size={18}
						color={isDarkMode ? "#F8FAFC" : "#86100E"}
					/>
				</View>
				<View style={styles.intentStatusCopy}>
					<Text style={[styles.hospitalEyebrow, { color: tokens.mutedText }]}>
						{MAP_EXPLORE_INTENT_COPY.NEARBY_CARE}
					</Text>
					<Text numberOfLines={1} style={[styles.intentStatusTitle, { color: tokens.titleColor }]}>
						{nearestHospital?.name || MAP_EXPLORE_INTENT_COPY.FINDING_NEARBY_HOSPITAL}
					</Text>
					<Text numberOfLines={1} style={[styles.intentStatusMeta, { color: tokens.bodyText }]}>
						{nearestHospitalMeta.join(" | ") || MAP_EXPLORE_INTENT_COPY.SEE_NEARBY_HOSPITALS}
					</Text>
				</View>
				<View style={[styles.intentStatusChevron, { backgroundColor: tokens.mutedCardSurface }]}>
					<Ionicons name="chevron-forward" size={16} color={tokens.titleColor} />
				</View>
			</View>

			<View style={styles.intentSignalRow}>
				<View style={[styles.intentSignalPill, { backgroundColor: tokens.mutedCardSurface }]}>
					<Text style={[styles.intentSignalText, { color: tokens.titleColor }]}>
						{nearbyHospitalCount > 0
							? `${nearbyHospitalCount} nearby`
							: MAP_EXPLORE_INTENT_COPY.NEARBY_CARE}
					</Text>
				</View>
				{totalAvailableBeds > 0 ? (
					<View style={[styles.intentSignalPill, { backgroundColor: tokens.mutedCardSurface }]}>
						<Text style={[styles.intentSignalText, { color: tokens.titleColor }]}>
							{`${totalAvailableBeds} beds`}
						</Text>
					</View>
				) : null}
			</View>
		</Pressable>
	);
}
