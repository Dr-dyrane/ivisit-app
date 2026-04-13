import React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getHospitalDetailServiceImageSource } from "./mapHospitalDetail.content";
import { styles } from "./mapHospitalDetail.styles";

function ServiceSkeletonCard({ surfaceColor }) {
	return (
		<View style={[styles.serviceCard, styles.serviceCardMuted, { backgroundColor: surfaceColor }]}>
			<LinearGradient
				colors={["rgba(255,255,255,0.08)", "rgba(15,23,42,0.14)"]}
				start={{ x: 0.12, y: 0.08 }}
				end={{ x: 0.86, y: 0.92 }}
				style={styles.serviceSkeletonCardInner}
			>
				<View style={styles.serviceCardHeader}>
					<View style={styles.serviceTopPillSkeleton} />
				</View>
				<View style={styles.serviceCardContent}>
					<View style={styles.serviceSkeletonLineWide} />
					<View style={styles.serviceSkeletonLine} />
				</View>
			</LinearGradient>
		</View>
	);
}

function ServiceValueBlock({ item }) {
	return item.showPriceSkeleton ? (
		<View style={[styles.serviceInlineSkeleton, styles.serviceInlineSkeletonMeta]} />
	) : item.priceText ? (
		<Text numberOfLines={1} style={[styles.serviceCardMeta, { color: "rgba(248,250,252,0.84)" }]}>
			{item.priceText}
		</Text>
	) : null;
}

export default function MapHospitalDetailServiceRail({
	title,
	items,
	type,
	rowSurface,
	titleColor,
}) {
	if (!Array.isArray(items) || items.length === 0) return null;

	return (
		<View style={styles.serviceRail}>
			<Text style={[styles.serviceRailTitle, { color: titleColor }]}>{title}</Text>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.serviceRailScroller}
				contentContainerStyle={styles.serviceRailContent}
			>
				{items.map((item, index) => {
					if (item.isSkeleton) {
						return (
							<ServiceSkeletonCard
								key={item.id || `skeleton-${index}`}
								surfaceColor={rowSurface}
							/>
						);
					}

					const imageSource = getHospitalDetailServiceImageSource(item, type);
					return (
						<View
							key={`${item.id || item.title}-${index}`}
							style={[
								styles.serviceCard,
								{ backgroundColor: rowSurface },
								item.enabled === false ? styles.serviceCardMuted : null,
							]}
						>
							<View style={styles.serviceCardImage}>
								<Image
									source={imageSource}
									resizeMode="contain"
									fadeDuration={0}
									style={styles.serviceCardMedia}
								/>
								<LinearGradient
									colors={["rgba(8,15,27,0.04)", "rgba(8,15,27,0.18)", "rgba(8,15,27,0.74)"]}
									style={styles.serviceCardOverlay}
								/>
								<View style={styles.serviceCardHeader}>
									{item.showMetaSkeleton ? (
										<View style={styles.serviceTopPillSkeleton} />
									) : item.metaText ? (
										<View style={styles.serviceTopPill}>
											<Text numberOfLines={1} style={styles.serviceTopPillText}>
												{item.metaText}
											</Text>
										</View>
									) : null}
								</View>
								<View style={styles.serviceCardContent}>
									<Text numberOfLines={2} style={[styles.serviceTitle, { color: "#F8FAFC" }]}>
										{item.title}
									</Text>
									<ServiceValueBlock item={item} />
								</View>
							</View>
						</View>
					);
				})}
			</ScrollView>
		</View>
	);
}
