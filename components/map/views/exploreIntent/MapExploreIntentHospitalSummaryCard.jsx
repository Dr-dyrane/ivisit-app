import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MAP_EXPLORE_INTENT_COPY, MAP_INTENT_VARIANTS } from "./mapExploreIntent.content";
import styles from "./mapExploreIntent.styles";

function SummaryIconTile({ children, isDarkMode, compact = false }) {
	const colors = isDarkMode
		? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.06)"]
		: ["#FFFFFF", "#EAF0F7"];

	return (
		<View style={[styles.summaryIconShell, compact ? styles.summaryIconShellCompact : null]}>
			<LinearGradient
				colors={colors}
				start={{ x: 0.08, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.summaryIconFill, compact ? styles.summaryIconFillCompact : null]}
			>
				<View pointerEvents="none" style={styles.summaryIconHighlight} />
				{children}
			</LinearGradient>
		</View>
	);
}

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
	const usesCanonicalSummaryLayout =
		layoutMode === "canonical" || layoutMode === "web_canonical";

	if (usesCanonicalSummaryLayout) {
		return (
			<Pressable
				onPress={onOpenHospitals}
				style={({ pressed }) => [
					styles.hospitalCard,
					isCentered ? styles.hospitalCardCentered : null,
					isCentered && maxWidth ? { maxWidth } : null,
					pressed ? styles.hospitalCardPressed : null,
					{
						borderRadius: tokens.cardRadius,
						backgroundColor: tokens.strongCardSurface,
					},
				]}
			>
				<SummaryIconTile isDarkMode={isDarkMode}>
					<MaterialCommunityIcons
						name="hospital-building"
						size={18}
						color={isDarkMode ? "#F8FAFC" : "#86100E"}
					/>
				</SummaryIconTile>
				<View style={styles.hospitalCardCopy}>
					<Text style={[styles.hospitalEyebrow, { color: tokens.mutedText }]}>
						{MAP_EXPLORE_INTENT_COPY.NEAREST_HOSPITAL}
					</Text>
					<Text numberOfLines={1} style={[styles.hospitalTitle, { color: tokens.titleColor }]}>
						{nearestHospital?.name || MAP_EXPLORE_INTENT_COPY.FINDING_NEAREST_HOSPITAL}
					</Text>
					<Text numberOfLines={1} style={[styles.hospitalMeta, { color: tokens.bodyText }]}>
						{nearestHospitalMeta.join(" • ") || MAP_EXPLORE_INTENT_COPY.TAP_TO_SEE_HOSPITALS}
					</Text>
					{nearbyHospitalCount > 0 || totalAvailableBeds > 0 ? (
						<View style={styles.intentSignalRow}>
							{nearbyHospitalCount > 0 ? (
								<View style={[styles.intentSignalPill, { backgroundColor: tokens.mutedCardSurface }]}> 
									<Text style={[styles.intentSignalText, { color: tokens.titleColor }]}> 
										{`${nearbyHospitalCount} nearby`}
									</Text>
								</View>
							) : null}
							{totalAvailableBeds > 0 ? (
								<View style={[styles.intentSignalPill, { backgroundColor: tokens.mutedCardSurface }]}> 
									<Text style={[styles.intentSignalText, { color: tokens.titleColor }]}> 
										{`${totalAvailableBeds} beds`}
									</Text>
								</View>
							) : null}
						</View>
					) : null}
				</View>
				<SummaryIconTile isDarkMode={isDarkMode} compact>
					<Ionicons name="chevron-forward" size={15} color={tokens.titleColor} />
				</SummaryIconTile>
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
				<SummaryIconTile isDarkMode={isDarkMode}>
					<MaterialCommunityIcons
						name="hospital-building"
						size={18}
						color={isDarkMode ? "#F8FAFC" : "#86100E"}
					/>
				</SummaryIconTile>
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
				<SummaryIconTile isDarkMode={isDarkMode} compact>
					<Ionicons name="chevron-forward" size={15} color={tokens.titleColor} />
				</SummaryIconTile>
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
