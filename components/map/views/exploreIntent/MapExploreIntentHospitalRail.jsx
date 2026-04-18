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
				<View style={styles.placeholderCardHeader}>
					<View style={styles.placeholderTopPillSkeleton} />
				</View>
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

function FeaturedHospitalCard({ hospital, titleColor, bodyColor, onPress, cardWidth, cardHeight, responsiveMetrics }) {
	const features = buildFeaturedHospitalFeatures(hospital);
	const imageSource = useMemo(() => getHospitalHeroSource(hospital), [hospital]);
	const topLabel =
		(typeof hospital?.distance === "string" && hospital.distance.trim()) ||
		(typeof hospital?.eta === "string" && hospital.eta.trim()) ||
		(hospital?.verified ? "Verified" : null);

	return (
		<Pressable onPress={() => onPress?.(hospital)}>
			{({ pressed }) => (
				<View
					style={[
						styles.featuredCard,
						{ width: cardWidth, height: cardHeight },
						pressed ? styles.featuredCardPressed : null,
					]}
				>
					<ImageBackground
						source={imageSource}
						resizeMode="cover"
						style={styles.featuredCardImage}
						imageStyle={styles.featuredCardImageStyle}
					>
						<LinearGradient
							colors={["rgba(8,15,27,0.04)", "rgba(8,15,27,0.18)", "rgba(8,15,27,0.74)"]}
							style={StyleSheet.absoluteFill}
						/>
						{topLabel ? (
							<View style={[styles.featuredCardHeader, responsiveMetrics?.featured?.headerStyle]}>
								<View style={[styles.featuredTopPill, responsiveMetrics?.featured?.topPillStyle]}>
									<Text numberOfLines={1} style={[styles.featuredTopPillText, responsiveMetrics?.featured?.topPillTextStyle]}>
										{topLabel}
									</Text>
								</View>
							</View>
						) : null}
						<View style={[styles.featuredCardContent, responsiveMetrics?.featured?.contentStyle]}>
							<Text numberOfLines={2} style={[styles.featuredTitle, responsiveMetrics?.featured?.titleStyle, { color: titleColor }]}>
								{hospital?.name || "Hospital"}
							</Text>
							{features.length > 0 ? (
								<Text numberOfLines={1} style={[styles.featuredMeta, responsiveMetrics?.featured?.metaStyle, { color: bodyColor }]}>
									{features.slice(0, 2).join(" • ")}
								</Text>
							) : null}
						</View>
					</ImageBackground>
				</View>
			)}
		</Pressable>
	);
}

export default function MapExploreIntentHospitalRail({
	featuredHospitals,
	titleColor,
	bodyColor,
	onOpenFeaturedHospital,
	availableWidth = null,
	contained = false,
	responsiveMetrics,
}) {
	const { width: screenWidth } = useWindowDimensions();
	const items = useMemo(() => buildVisibleHospitalSlots(featuredHospitals), [featuredHospitals]);
	const railWidth = Number.isFinite(availableWidth) && availableWidth > 0 ? availableWidth : screenWidth;
	const sidePadding = contained ? 4 : MAP_EXPLORE_INTENT_RAIL.sidePadding;
	const visibleCards = contained && railWidth >= 880 ? 3 : 2;
	const railPeek = contained ? 36 : MAP_EXPLORE_INTENT_RAIL.peek;
	const cardWidth = useMemo(() => {
		const computedWidth = Math.round(
			(
				railWidth -
				sidePadding * 2 -
				MAP_EXPLORE_INTENT_RAIL.gap * Math.max(visibleCards - 1, 0) -
				railPeek
			) / visibleCards,
		);
		return Math.max(
			responsiveMetrics?.featured?.minCardWidth || 172,
			Math.min(
				computedWidth,
				contained
					? responsiveMetrics?.featured?.containedMaxCardWidth || 236
					: responsiveMetrics?.featured?.maxCardWidth || 208,
			),
		);
	}, [contained, railPeek, railWidth, responsiveMetrics, sidePadding, visibleCards]);
	const cardHeight = useMemo(
		() =>
			Math.round(
				cardWidth *
					(contained
						? responsiveMetrics?.featured?.containedHeightRatio || 1.24
						: responsiveMetrics?.featured?.heightRatio || 1.32),
			),
		[cardWidth, contained, responsiveMetrics],
	);

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			decelerationRate="fast"
			snapToAlignment="start"
			snapToInterval={cardWidth + MAP_EXPLORE_INTENT_RAIL.gap}
			contentContainerStyle={[
				styles.featuredScrollContent,
				contained
					? responsiveMetrics?.featured?.containedScrollContentStyle
					: responsiveMetrics?.featured?.scrollContentStyle,
				{
					paddingLeft:
						contained
							? responsiveMetrics?.featured?.containedScrollContentStyle?.paddingLeft ?? sidePadding
							: responsiveMetrics?.featured?.scrollContentStyle?.paddingLeft ?? sidePadding,
					paddingRight:
						contained
							? responsiveMetrics?.featured?.containedScrollContentStyle?.paddingRight ?? sidePadding
							: responsiveMetrics?.featured?.scrollContentStyle?.paddingRight ?? sidePadding,
					gap:
						contained
							? responsiveMetrics?.featured?.containedScrollContentStyle?.gap ?? MAP_EXPLORE_INTENT_RAIL.gap
							: responsiveMetrics?.featured?.scrollContentStyle?.gap ?? MAP_EXPLORE_INTENT_RAIL.gap,
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
						responsiveMetrics={responsiveMetrics}
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
