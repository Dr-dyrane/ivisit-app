import React from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../../../constants/colors";
import { getHospitalHeroSource } from "../../mapHospitalImage";
import MapHospitalDetailServiceRail from "./MapHospitalDetailServiceRail";
import { styles } from "./mapHospitalDetail.styles";

function renderIcon(item, color = COLORS.brandPrimary, size = 14) {
	if (item.iconType === "material") {
		return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
	}
	return <Ionicons name={item.icon} size={size} color={color} />;
}

export default function MapHospitalDetailBody({ model }) {
	const {
		cardSurface,
		actionSurface,
		actionTint,
		ambulanceServiceCards,
		galleryPhotos,
		heroBadges,
		hospital,
		isDarkMode,
		onClose,
		placeActions,
		placeStats,
		roomServiceCards,
		rowSurface,
		summary,
		subtleColor,
		titleColor,
	} = model;

	const hasGallery = galleryPhotos.length > 1;
	const headerSubtitle = summary.addressLine || summary.subtitle || "Nearby hospital";
	const panelSurface = isDarkMode ? "rgba(8,15,27,0.92)" : "rgba(248,250,252,0.90)";
	const panelSurfaceBottom = isDarkMode ? "rgba(8,15,27,0.68)" : "rgba(248,250,252,0.72)";
	const placeMarkSurface = isDarkMode ? "#64748B" : cardSurface;
	const placeMarkBorderWidth = isDarkMode ? 0 : 1;
	const placeMarkBorderColor = isDarkMode ? "transparent" : "rgba(255,255,255,0.24)";
	const heroBlendColors = isDarkMode
		? ["rgba(8,15,27,0)", "rgba(8,15,27,0.42)", panelSurface]
		: ["rgba(248,250,252,0)", "rgba(248,250,252,0.46)", panelSurface];
	const panelGradientColors = isDarkMode
		? ["rgba(8,15,27,0.12)", "rgba(8,15,27,0.62)", panelSurfaceBottom]
		: ["rgba(248,250,252,0.12)", "rgba(248,250,252,0.66)", panelSurfaceBottom];
	const panelLowerBlendColors = isDarkMode
		? ["rgba(8,15,27,0)", "rgba(8,15,27,0.06)", "rgba(8,15,27,0.18)"]
		: ["rgba(248,250,252,0)", "rgba(248,250,252,0.06)", "rgba(248,250,252,0.16)"];
	const panelBottomFadeColors = isDarkMode
		? ["rgba(8,15,27,0.30)", "rgba(8,15,27,0.10)", "rgba(8,15,27,0)"]
		: ["rgba(248,250,252,0.34)", "rgba(248,250,252,0.10)", "rgba(248,250,252,0)"];

	return (
		<View style={styles.scrollContent}>
			<ImageBackground
				source={getHospitalHeroSource(hospital)}
				resizeMode="cover"
				style={styles.hero}
				imageStyle={styles.heroImage}
			>
				<LinearGradient
					pointerEvents="none"
					colors={heroBlendColors}
					style={styles.heroBlend}
				/>

				{heroBadges.length > 0 ? (
					<View style={styles.heroBadgeRow}>
						{heroBadges.map((item, index) => {
							const badgeBg =
								item.tone === "verified"
									? "rgba(16,185,129,0.18)"
									: item.tone === "alert"
										? "rgba(225,29,72,0.18)"
										: "rgba(255,255,255,0.12)";
							return (
								<View
									key={`${item.label}-${index}`}
									style={[styles.heroBadge, { backgroundColor: badgeBg }]}
								>
									{renderIcon(item, "#F8FAFC")}
									<Text style={styles.heroBadgeText}>{item.label}</Text>
								</View>
							);
						})}
					</View>
				) : null}

				{typeof onClose === "function" ? (
					<Pressable
						onPress={onClose}
						accessibilityRole="button"
						accessibilityLabel="Close hospital details"
						style={styles.heroCloseButton}
					>
						{({ pressed }) => (
							<View
								style={[
									styles.heroCloseButtonSurface,
									pressed ? styles.heroCloseButtonSurfacePressed : null,
								]}
							>
								<Ionicons name="close" size={18} color="#F8FAFC" />
							</View>
						)}
					</Pressable>
				) : null}

				<View style={styles.heroFooter} />
			</ImageBackground>

			<View style={styles.detailPanel}>
				<LinearGradient
					pointerEvents="none"
					colors={panelGradientColors}
					style={styles.detailPanelBackgroundClip}
				/>
				<LinearGradient
					pointerEvents="none"
					colors={panelLowerBlendColors}
					style={styles.detailPanelLowerBlend}
				/>
				<LinearGradient
					pointerEvents="none"
					colors={panelBottomFadeColors}
					style={styles.detailPanelBottomFade}
				/>

				<View style={styles.detailPanelContent}>
					<View style={styles.placeHeader}>
						<View
							style={[
								styles.placeMark,
								{
									backgroundColor: placeMarkSurface,
									borderWidth: placeMarkBorderWidth,
									borderColor: placeMarkBorderColor,
								},
							]}
						>
							<MaterialCommunityIcons name="hospital-building" size={24} color={COLORS.brandPrimary} />
						</View>
						<Text numberOfLines={2} style={[styles.placeTitle, { color: titleColor }]}>
							{hospital?.name || "Hospital"}
						</Text>
						<Text numberOfLines={2} style={[styles.placeSubtitle, { color: subtleColor }]}>
							{headerSubtitle}
						</Text>
					</View>

					{placeActions.length > 0 ? (
						<View style={styles.placeActionRow}>
							{placeActions.map((item) => (
								<Pressable
									key={item.key}
									onPress={item.onPress}
									disabled={item.disabled || !item.onPress}
									accessibilityRole="button"
									accessibilityLabel={item.accessibilityLabel}
									style={styles.placeActionPressable}
								>
									{({ pressed }) => (
										<View
											style={[
												styles.placeActionButton,
												item.primary
													? styles.placeActionButtonPrimary
													: { backgroundColor: actionSurface },
												item.disabled ? styles.placeActionButtonDisabled : null,
												pressed ? styles.placeActionButtonPressed : null,
											]}
										>
											{renderIcon(
												item,
												item.primary ? "#F8FAFC" : actionTint,
												item.primary ? 19 : 16,
											)}
											<Text
												numberOfLines={1}
												style={[
													styles.placeActionLabel,
													{ color: item.primary ? "#F8FAFC" : actionTint },
												]}
											>
												{item.label}
											</Text>
										</View>
									)}
								</Pressable>
							))}
						</View>
					) : null}

					{placeStats.length > 0 ? (
						<View style={styles.placeStatsCard}>
							{placeStats.map((item, index) => (
								<View key={`${item.label}-${index}`} style={styles.placeStatItem}>
									<Text numberOfLines={1} style={[styles.placeStatLabel, { color: subtleColor }]}>
										{item.label}
									</Text>
									<View style={styles.placeStatValueRow}>
										{renderIcon(
											item,
											item.tone === "rating" ? "#FBBF24" : subtleColor,
											15,
										)}
										<Text numberOfLines={1} style={[styles.placeStatValue, { color: titleColor }]}>
											{item.value}
										</Text>
									</View>
								</View>
							))}
						</View>
					) : null}

					<MapHospitalDetailServiceRail
						title="Ambulance"
						items={ambulanceServiceCards}
						type="ambulance"
						rowSurface={rowSurface}
						titleColor={titleColor}
					/>

					<MapHospitalDetailServiceRail
						title="Rooms"
						items={roomServiceCards}
						type="room"
						rowSurface={rowSurface}
						titleColor={titleColor}
					/>

					{hasGallery ? (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={styles.galleryScroller}
							contentContainerStyle={styles.galleryContent}
						>
							{galleryPhotos.map((photo, index) => (
								<ImageBackground
									key={`${photo}-${index}`}
									source={{ uri: photo }}
									resizeMode="cover"
									style={styles.galleryTile}
									imageStyle={styles.galleryTileImage}
								>
									<LinearGradient
										colors={["rgba(15,23,42,0)", "rgba(15,23,42,0.26)"]}
										style={StyleSheet.absoluteFillObject}
									/>
								</ImageBackground>
							))}
						</ScrollView>
					) : null}
				</View>
			</View>

		</View>
	);
}
