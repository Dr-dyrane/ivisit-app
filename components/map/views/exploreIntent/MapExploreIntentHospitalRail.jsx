import React, { useMemo } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getHospitalHeroSource } from "../../mapHospitalImage";
import { MAP_EXPLORE_INTENT_RAIL } from "./mapExploreIntent.content";
import { buildFeaturedHospitalFeatures, buildVisibleHospitalSlots } from "./mapExploreIntent.helpers";
import styles from "./mapExploreIntent.styles";

function FeaturedHospitalPlaceholderCard({ cardWidth, cardHeight }) {
	return (
		<View style={[styles.featuredCard, styles.placeholderCard, { width: cardWidth, height: cardHeight }]}>
			<LinearGradient
				colors={["rgba(255,255,255,0.08)", "rgba(15,23,42,0.14)"]}
				start={{ x: 0.12, y: 0.08 }}
				end={{ x: 0.86, y: 0.92 }}
				style={styles.placeholderCardInner}
			>
				<View style={styles.placeholderCopy}>
					<View style={styles.placeholderTitleBlock}>
						<View style={styles.placeholderTitleSkeleton} />
						<View style={[styles.placeholderTitleSkeleton, styles.placeholderTitleSkeletonShort]} />
					</View>
					<View style={styles.placeholderMetaSkeleton} />
				</View>
			</LinearGradient>
		</View>
	);
}

function FeaturedHospitalCard({ hospital, titleColor, bodyColor, onPress, cardWidth, cardHeight }) {
	const features = buildFeaturedHospitalFeatures(hospital);

	return (
		<Pressable onPress={() => onPress?.(hospital)} style={[styles.featuredCard, { width: cardWidth, height: cardHeight }]}>
			<ImageBackground
				source={getHospitalHeroSource(hospital)}
				resizeMode="cover"
				style={styles.featuredCardImage}
				imageStyle={styles.featuredCardImageStyle}
			>
				<LinearGradient
					colors={["rgba(8,15,27,0.02)", "rgba(8,15,27,0.18)", "rgba(8,15,27,0.72)"]}
					style={StyleSheet.absoluteFill}
				/>
				<View style={styles.featuredCardContent}>
					<Text numberOfLines={2} style={[styles.featuredTitle, { color: titleColor }]}>
						{hospital?.name || "Hospital"}
					</Text>
					{features.length > 0 ? (
						<Text numberOfLines={1} style={[styles.featuredMeta, { color: bodyColor }]}>
							{features.join(" | ")}
						</Text>
					) : null}
				</View>
			</ImageBackground>
		</Pressable>
	);
}

export default function MapExploreIntentHospitalRail({
	featuredHospitals,
	titleColor,
	bodyColor,
	onOpenFeaturedHospital,
}) {
	const { width: screenWidth } = useWindowDimensions();
	const items = useMemo(() => buildVisibleHospitalSlots(featuredHospitals), [featuredHospitals]);
	const cardWidth = useMemo(() => {
		const computedWidth = Math.round(
			(screenWidth - MAP_EXPLORE_INTENT_RAIL.sidePadding * 2 - MAP_EXPLORE_INTENT_RAIL.gap * 2 - MAP_EXPLORE_INTENT_RAIL.peek) / 2,
		);
		return Math.max(184, Math.min(computedWidth, 224));
	}, [screenWidth]);
	const cardHeight = useMemo(() => Math.round(cardWidth * 1.36), [cardWidth]);

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			decelerationRate="fast"
			snapToAlignment="start"
			snapToInterval={cardWidth + MAP_EXPLORE_INTENT_RAIL.gap}
			contentContainerStyle={[
				styles.featuredScrollContent,
				{
					paddingLeft: MAP_EXPLORE_INTENT_RAIL.sidePadding,
					paddingRight: MAP_EXPLORE_INTENT_RAIL.sidePadding,
					gap: MAP_EXPLORE_INTENT_RAIL.gap,
				},
			]}
		>
			{items.map((item, index) =>
				item?.type === "hospital" ? (
					<FeaturedHospitalCard
						key={item.hospital?.id || `${item.hospital?.name || "hospital"}-${index}`}
						hospital={item.hospital}
						titleColor={titleColor}
						bodyColor={bodyColor}
						onPress={onOpenFeaturedHospital}
						cardWidth={cardWidth}
						cardHeight={cardHeight}
					/>
				) : (
					<FeaturedHospitalPlaceholderCard
						key={item.key || `placeholder-${index}`}
						cardWidth={cardWidth}
						cardHeight={cardHeight}
					/>
				),
			)}
		</ScrollView>
	);
}
