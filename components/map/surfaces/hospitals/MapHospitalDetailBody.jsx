import React, { useEffect, useMemo, useRef } from "react";
import {
	Animated,
	ImageBackground,
	PanResponder,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../../../constants/colors";
import { getCachedRemoteImageSource, getHospitalHeroSource } from "../../mapHospitalImage";
import MapHospitalDetailServiceRail from "./MapHospitalDetailServiceRail";
import { styles } from "./mapHospitalDetail.styles";

function renderIcon(item, color = COLORS.brandPrimary, size = 14) {
	if (item.iconType === "material") {
		return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
	}
	return <Ionicons name={item.icon} size={size} color={color} />;
}

export default function MapHospitalDetailBody({
	model,
	revealHero = false,
	onExpandedHeaderLayout,
	onCycleHospital,
	selectedAmbulanceServiceId = null,
	selectedRoomServiceId = null,
	onSelectAmbulanceServiceId = () => {},
	onSelectRoomServiceId = () => {},
	onOpenServiceDetails = () => {},
}) {
	const {
		cardSurface,
		actionSurface,
		actionTint,
		ambulanceServiceCards,
		galleryPhotos,
		heroBadges,
		hospital,
		isDarkMode,
		placeActions,
		placeStats,
		roomServiceCards,
		rowSurface,
		summary,
		subtleColor,
		titleColor,
	} = model;

	const hasGallery = galleryPhotos.length > 1;
	const heroSource = useMemo(() => getHospitalHeroSource(hospital), [hospital]);
	const galleryPhotoSources = useMemo(
		() => galleryPhotos.map((photo) => getCachedRemoteImageSource(photo)).filter(Boolean),
		[galleryPhotos],
	);
	const headerSubtitle = summary.addressLine || summary.subtitle || "Nearby hospital";
	const panelSurface = isDarkMode ? "rgba(8,15,27,0.34)" : "rgba(248,250,252,0.38)";
	const panelSurfaceBottom = isDarkMode ? "rgba(8,15,27,0.10)" : "rgba(248,250,252,0.10)";
	const placeMarkSurface = isDarkMode ? "rgba(15,23,42,0.52)" : cardSurface;
	const placeMarkBorderWidth = 0;
	const placeMarkBorderColor = "transparent";
	const placeMarkIconColor = isDarkMode ? "#E2E8F0" : COLORS.brandPrimary;
	const heroBlendColors = isDarkMode
		? ["rgba(8,15,27,0)", "rgba(8,15,27,0.14)", "rgba(8,15,27,0.26)", "rgba(8,15,27,0.40)"]
		: ["rgba(248,250,252,0)", "rgba(248,250,252,0.08)", "rgba(248,250,252,0.16)", "rgba(248,250,252,0.32)"];
	const heroTopMaskColors = ["rgba(8,15,27,0.36)", "rgba(8,15,27,0.18)", "rgba(8,15,27,0)"];
	const panelGradientColors = isDarkMode
		? [panelSurface, panelSurface, panelSurfaceBottom]
		: [panelSurface, panelSurface, panelSurfaceBottom];
	const panelLowerBlendColors = isDarkMode
		? ["rgba(8,15,27,0)", "rgba(8,15,27,0.02)", "rgba(8,15,27,0.08)"]
		: ["rgba(248,250,252,0)", "rgba(248,250,252,0.02)", "rgba(248,250,252,0.08)"];
	const panelBottomFadeColors = isDarkMode
		? ["rgba(8,15,27,0.14)", "rgba(8,15,27,0.04)", "rgba(8,15,27,0)"]
		: ["rgba(248,250,252,0.14)", "rgba(248,250,252,0.04)", "rgba(248,250,252,0)"];
	const expandedShellSurface = isDarkMode ? "rgba(8,15,27,0.94)" : "rgba(255,255,255,0.94)";
	const expandedCardSurfaceColors = isDarkMode
		? ["rgba(8,15,27,0.94)", "rgba(8,15,27,0.88)", "rgba(8,15,27,0.52)"]
		: ["rgba(255,255,255,0.94)", "rgba(255,255,255,0.88)", "rgba(255,255,255,0.52)"];
	const expandedHeroShadeColors = isDarkMode
		? ["rgba(8,15,27,0.04)", "rgba(8,15,27,0.16)", "rgba(8,15,27,0.58)", expandedShellSurface]
		: ["rgba(248,250,252,0.02)", "rgba(248,250,252,0.06)", "rgba(248,250,252,0.48)", expandedShellSurface];
	const expandedHeroTopMaskColors = ["rgba(8,15,27,0.42)", "rgba(8,15,27,0.22)", "rgba(8,15,27,0)"];
	const expandedTitleColor = titleColor;
	const expandedSubtitleColor = subtleColor;
	const expandedBodyLowerBlendColors = isDarkMode
		? ["rgba(8,15,27,0)", "rgba(8,15,27,0.04)", "rgba(8,15,27,0.12)"]
		: ["rgba(255,255,255,0)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0.12)"];
	const expandedBottomFadeColors = isDarkMode
		? ["rgba(8,15,27,0.14)", "rgba(8,15,27,0.04)", "rgba(8,15,27,0)"]
		: ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0)"];
	const heroRevealProgress = useRef(new Animated.Value(revealHero ? 1 : 0)).current;

	useEffect(() => {
		Animated.spring(heroRevealProgress, {
			toValue: revealHero ? 1 : 0,
			tension: 64,
			friction: 11,
			useNativeDriver: false,
		}).start();
	}, [heroRevealProgress, revealHero]);

	const heroHeight = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 270],
	});
	const heroOpacity = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 1],
	});
	const detailPanelMarginTop = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [-16, -76],
	});
	const detailPanelPaddingTop = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [20, 46],
	});
	const actionRowMarginTop = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [40, 0],
	});
	const placeHeaderHeight = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 132],
	});
	const placeHeaderOpacity = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 1],
	});
	const placeHeaderMarginTop = heroRevealProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, -64],
	});
	const heroSwipeResponder = useMemo(() => {
		if (typeof onCycleHospital !== "function") return null;

		return PanResponder.create({
			onMoveShouldSetPanResponder: (_event, gestureState) => {
				const absDx = Math.abs(gestureState.dx);
				const absDy = Math.abs(gestureState.dy);
				return absDx > 24 && absDy < 14 && absDx > absDy * 2;
			},
			onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
				const absDx = Math.abs(gestureState.dx);
				const absDy = Math.abs(gestureState.dy);
				return absDx > 24 && absDy < 14 && absDx > absDy * 2;
			},
			onPanResponderRelease: (_event, gestureState) => {
				if (
					Math.abs(gestureState.dx) > 64 &&
					Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.8
				) {
					onCycleHospital();
				}
			},
			onPanResponderTerminationRequest: () => true,
		});
	}, [onCycleHospital]);
	const heroSwipeHandlers = heroSwipeResponder?.panHandlers ?? {};

	if (revealHero) {
		return (
			<View style={styles.scrollContent}>
				<View style={styles.expandedCardWrap}>
					<View style={styles.expandedCard}>
						<LinearGradient
							pointerEvents="none"
							colors={expandedCardSurfaceColors}
							style={styles.expandedCardSurface}
						/>
						<ImageBackground
							source={heroSource}
							resizeMode="cover"
							fadeDuration={0}
							style={styles.expandedHero}
							imageStyle={styles.expandedHeroImage}
							{...heroSwipeHandlers}
						>
							<LinearGradient
								pointerEvents="none"
								colors={expandedHeroShadeColors}
								style={StyleSheet.absoluteFillObject}
							/>
							<LinearGradient
								pointerEvents="none"
								colors={expandedHeroTopMaskColors}
								style={styles.expandedHeroTopMask}
							/>

							{heroBadges.length > 0 ? (
								<View style={styles.expandedHeroBadgeRow}>
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

							<View style={styles.expandedHeaderBlock}>
								<View onLayout={onExpandedHeaderLayout} style={styles.expandedHeaderMeasure}>
									<View
										style={[
											styles.expandedPlaceMark,
											{
												backgroundColor: placeMarkSurface,
												borderWidth: placeMarkBorderWidth,
												borderColor: placeMarkBorderColor,
											},
										]}
									>
										<MaterialCommunityIcons
											name="hospital-building"
											size={24}
											color={placeMarkIconColor}
										/>
									</View>
									<Text
										numberOfLines={2}
										style={[styles.expandedPlaceTitle, { color: expandedTitleColor }]}
									>
										{summary.title}
									</Text>
									{headerSubtitle ? (
										<Text
											numberOfLines={2}
											style={[styles.expandedPlaceSubtitle, { color: expandedSubtitleColor }]}
										>
											{headerSubtitle}
										</Text>
									) : null}
								</View>
							</View>
						</ImageBackground>

						<View style={styles.expandedBody}>
							<LinearGradient
								pointerEvents="none"
								colors={expandedBodyLowerBlendColors}
								style={styles.expandedBodyLowerBlend}
							/>
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
								title="Transport"
								items={ambulanceServiceCards}
								type="ambulance"
								rowSurface={rowSurface}
								compact={false}
								selectedId={selectedAmbulanceServiceId}
								onSelectId={onSelectAmbulanceServiceId}
								selectionEnabled
								onOpenDetails={onOpenServiceDetails}
							/>

							<MapHospitalDetailServiceRail
								title="Room options"
								items={roomServiceCards}
								type="room"
								rowSurface={rowSurface}
								compact={false}
								selectedId={selectedRoomServiceId}
								onSelectId={onSelectRoomServiceId}
								selectionEnabled
								onOpenDetails={onOpenServiceDetails}
							/>

							{hasGallery ? (
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									directionalLockEnabled
									nestedScrollEnabled
									style={styles.galleryScroller}
									contentContainerStyle={styles.galleryContent}
								>
									{galleryPhotos.map((photo, index) => (
										<ImageBackground
											key={`${photo}-${index}`}
											source={galleryPhotoSources[index]}
											resizeMode="cover"
											fadeDuration={0}
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
					<LinearGradient
						pointerEvents="none"
						colors={expandedBottomFadeColors}
						style={styles.expandedCardBottomFade}
					/>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.scrollContent}>
			<Animated.View
				style={[
					styles.heroRevealFrame,
					{
						height: heroHeight,
						opacity: heroOpacity,
					},
				]}
			>
				<ImageBackground
					source={heroSource}
					resizeMode="cover"
					fadeDuration={0}
					style={styles.hero}
					imageStyle={styles.heroImage}
				>
					<LinearGradient
						pointerEvents="none"
						colors={heroBlendColors}
						style={styles.heroBlend}
					/>
					<LinearGradient
						pointerEvents="none"
						colors={heroTopMaskColors}
						style={styles.heroTopMask}
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

					<View style={styles.heroFooter} />
				</ImageBackground>
			</Animated.View>

			<Animated.View
				style={[
					styles.detailPanel,
					{
						marginTop: detailPanelMarginTop,
						paddingTop: detailPanelPaddingTop,
					},
				]}
			>
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
					<Animated.View
						style={[
							styles.placeHeaderReveal,
							{
								height: placeHeaderHeight,
								opacity: placeHeaderOpacity,
								marginTop: placeHeaderMarginTop,
							},
						]}
					>
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
								<MaterialCommunityIcons name="hospital-building" size={24} color={placeMarkIconColor} />
							</View>
							<Text numberOfLines={2} style={[styles.placeTitle, { color: titleColor }]}>
								{summary.title}
							</Text>
							{headerSubtitle ? (
								<Text numberOfLines={2} style={[styles.placeSubtitle, { color: subtleColor }]}>
									{headerSubtitle}
								</Text>
							) : null}
						</View>
					</Animated.View>

					{placeActions.length > 0 ? (
						<Animated.View style={[styles.placeActionRow, { marginTop: actionRowMarginTop }]}>
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
						</Animated.View>
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
						title="Transport"
						items={ambulanceServiceCards}
						type="ambulance"
						rowSurface={rowSurface}
						compact
						selectedId={selectedAmbulanceServiceId}
						onSelectId={onSelectAmbulanceServiceId}
						selectionEnabled
						onOpenDetails={onOpenServiceDetails}
					/>

					<MapHospitalDetailServiceRail
						title="Room options"
						items={roomServiceCards}
						type="room"
						rowSurface={rowSurface}
						compact
						selectedId={selectedRoomServiceId}
						onSelectId={onSelectRoomServiceId}
						selectionEnabled
						onOpenDetails={onOpenServiceDetails}
					/>

					{hasGallery ? (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							directionalLockEnabled
							nestedScrollEnabled
							style={styles.galleryScroller}
							contentContainerStyle={styles.galleryContent}
						>
							{galleryPhotos.map((photo, index) => (
								<ImageBackground
									key={`${photo}-${index}`}
									source={galleryPhotoSources[index]}
									resizeMode="cover"
									fadeDuration={0}
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
			</Animated.View>
		</View>
	);
}
