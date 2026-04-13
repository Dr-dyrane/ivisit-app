import React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getHospitalDetailServiceImageSource } from "./mapHospitalDetail.content";
import { styles } from "./mapHospitalDetail.styles";

function ServiceSkeletonCard({ surfaceColor, compact = false }) {
	return (
		<View
			style={[
				styles.serviceCard,
				compact ? styles.serviceCardCompact : null,
				styles.serviceCardMuted,
				{ backgroundColor: surfaceColor },
			]}
		>
			<LinearGradient
				colors={["rgba(255,255,255,0.08)", "rgba(15,23,42,0.14)"]}
				start={{ x: 0.12, y: 0.08 }}
				end={{ x: 0.86, y: 0.92 }}
				style={styles.serviceSkeletonCardInner}
			>
				<View style={[styles.serviceCardHeader, compact ? styles.serviceCardHeaderCompact : null]}>
					<View style={[styles.serviceTopPillSkeleton, compact ? styles.serviceTopPillSkeletonCompact : null]} />
				</View>
				<View style={[styles.serviceCardContent, compact ? styles.serviceCardContentCompact : null]}>
					<View style={styles.serviceSkeletonLineWide} />
					<View style={styles.serviceSkeletonLine} />
				</View>
			</LinearGradient>
		</View>
	);
}

function ServiceValueBlock({ item, compact = false }) {
	return item.showPriceSkeleton ? (
		<View style={[styles.serviceInlineSkeleton, styles.serviceInlineSkeletonMeta]} />
	) : item.priceText ? (
		<Text
			numberOfLines={1}
			style={[
				styles.serviceCardMeta,
				compact ? styles.serviceCardMetaCompact : null,
				{ color: "rgba(248,250,252,0.84)" },
			]}
		>
			{item.priceText}
		</Text>
	) : null;
}

export default function MapHospitalDetailServiceRail({
	items,
	type,
	rowSurface,
	compact = false,
}) {
	if (!Array.isArray(items) || items.length === 0) return null;

	return (
		<View style={[styles.serviceRail, compact ? styles.serviceRailCompact : null]}>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.serviceRailScroller}
				contentContainerStyle={[
					styles.serviceRailContent,
					compact ? styles.serviceRailContentCompact : null,
				]}
			>
				{items.map((item, index) => {
					if (item.isSkeleton) {
						return (
							<ServiceSkeletonCard
								key={item.id || `skeleton-${index}`}
								surfaceColor={rowSurface}
								compact={compact}
							/>
						);
					}

					const imageSource = getHospitalDetailServiceImageSource(item, type);
					return (
						<View
							key={`${item.id || item.title}-${index}`}
							style={[
								styles.serviceCard,
								compact ? styles.serviceCardCompact : null,
								{ backgroundColor: rowSurface },
								item.enabled === false ? styles.serviceCardMuted : null,
							]}
						>
							<Image
								source={imageSource}
								resizeMode="contain"
								fadeDuration={0}
								style={[
									styles.serviceCardMedia,
									type === "room"
										? styles.serviceCardMediaRoom
										: styles.serviceCardMediaAmbulance,
								]}
							/>
							<LinearGradient
								colors={["rgba(8,15,27,0.04)", "rgba(8,15,27,0.18)", "rgba(8,15,27,0.74)"]}
								style={styles.serviceCardOverlay}
							/>
							<View style={[styles.serviceCardHeader, compact ? styles.serviceCardHeaderCompact : null]}>
								{item.showMetaSkeleton ? (
									<View
										style={[
											styles.serviceTopPillSkeleton,
											compact ? styles.serviceTopPillSkeletonCompact : null,
										]}
									/>
								) : item.metaText ? (
									<View style={[styles.serviceTopPill, compact ? styles.serviceTopPillCompact : null]}>
										<Text
											numberOfLines={1}
											style={[styles.serviceTopPillText, compact ? styles.serviceTopPillTextCompact : null]}
										>
											{item.metaText}
										</Text>
									</View>
								) : null}
							</View>
							<View style={[styles.serviceCardContent, compact ? styles.serviceCardContentCompact : null]}>
								<Text
									numberOfLines={2}
									style={[
										styles.serviceTitle,
										compact ? styles.serviceTitleCompact : null,
										{ color: "#F8FAFC" },
									]}
								>
									{item.title}
								</Text>
								<ServiceValueBlock item={item} compact={compact} />
							</View>
						</View>
					);
				})}
			</ScrollView>
		</View>
	);
}
