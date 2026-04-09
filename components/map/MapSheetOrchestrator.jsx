import React, { useEffect, useMemo, useRef } from "react";
import {
	Animated,
	Image,
	ImageBackground,
	PanResponder,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import InAppBrowserLink from "../ui/InAppBrowserLink";
import { getMapSheetTokens } from "./mapSheetTokens";
import { MAP_CARE_PULSE_MS, MAP_SHEET_SNAP_SPRING } from "./mapMotionTokens";

export const MAP_SHEET_MODES = {
	EXPLORE_INTENT: "explore_intent",
	HOSPITAL_PREVIEW: "hospital_preview",
	AMBULANCE_DECISION: "ambulance_decision",
	BED_DECISION: "bed_decision",
	COMMIT_DETAILS: "commit_details",
	COMMIT_AUTH: "commit_auth",
	COMMIT_PAYMENT: "commit_payment",
	TRACKING: "tracking",
};

export const MAP_SHEET_SNAP_STATES = {
	COLLAPSED: "collapsed",
	HALF: "half",
	EXPANDED: "expanded",
};

const MAP_SHEET_SNAP_INDEX = {
	[MAP_SHEET_SNAP_STATES.COLLAPSED]: 0,
	[MAP_SHEET_SNAP_STATES.HALF]: 1,
	[MAP_SHEET_SNAP_STATES.EXPANDED]: 2,
};

const FEATURED_HOSPITAL_IMAGE = require("../../assets/features/emergency.png");
const FEATURED_CAROUSEL_SIDE_PADDING = 24;
const FEATURED_CAROUSEL_GAP = 10;
const FEATURED_CAROUSEL_PEEK = 16;

function getNextSnapStateUp(snapState) {
	switch (snapState) {
		case MAP_SHEET_SNAP_STATES.COLLAPSED:
			return MAP_SHEET_SNAP_STATES.HALF;
		case MAP_SHEET_SNAP_STATES.HALF:
			return MAP_SHEET_SNAP_STATES.EXPANDED;
		default:
			return MAP_SHEET_SNAP_STATES.EXPANDED;
	}
}

function getNextSnapStateDown(snapState) {
	switch (snapState) {
		case MAP_SHEET_SNAP_STATES.EXPANDED:
			return MAP_SHEET_SNAP_STATES.HALF;
		case MAP_SHEET_SNAP_STATES.HALF:
			return MAP_SHEET_SNAP_STATES.COLLAPSED;
		default:
			return MAP_SHEET_SNAP_STATES.COLLAPSED;
	}
}

export function getMapSheetHeight(screenHeight, snapState) {
	switch (snapState) {
		case MAP_SHEET_SNAP_STATES.COLLAPSED:
			return 66;
		case MAP_SHEET_SNAP_STATES.EXPANDED:
			return Math.max(540, Math.min(screenHeight * 0.86, 780));
		case MAP_SHEET_SNAP_STATES.HALF:
		default:
			return Math.max(360, Math.min(screenHeight * 0.5, 460));
	}
}

function MapSheetProfileTrigger({ onPress, userImageSource, isSignedIn, isCollapsed = false }) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.avatarPressable,
				isCollapsed ? styles.avatarPressableCollapsed : null,
				{ transform: [{ scale: pressed ? 0.96 : 1 }] },
			]}
		>
			<Image
				source={userImageSource}
				resizeMode="cover"
				style={[
					styles.avatarImage,
					isCollapsed ? styles.avatarImageCollapsed : null,
					{
						shadowColor: "#000000",
						shadowOpacity: 0.16,
						shadowRadius: 12,
						shadowOffset: { width: 0, height: 6 },
						...Platform.select({
							web: {
								boxShadow: "0px 10px 18px rgba(15,23,42,0.18)",
							},
						}),
					},
				]}
			/>
			{isSignedIn ? <View style={[styles.avatarDot, isCollapsed ? styles.avatarDotCollapsed : null]} /> : null}
		</Pressable>
	);
}

function MapSheetShell({
	sheetHeight,
	snapState,
	topSlot = null,
	footerSlot = null,
	onHandlePress,
	children,
}) {
	const { isDarkMode } = useTheme();
	const isAndroid = Platform.OS === "android";
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const snapProgress = useRef(
		new Animated.Value(MAP_SHEET_SNAP_INDEX[snapState] ?? MAP_SHEET_SNAP_INDEX[MAP_SHEET_SNAP_STATES.HALF]),
	).current;
	const dragTranslateY = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.spring(snapProgress, {
			toValue:
				MAP_SHEET_SNAP_INDEX[snapState] ??
				MAP_SHEET_SNAP_INDEX[MAP_SHEET_SNAP_STATES.HALF],
			useNativeDriver: false,
			...MAP_SHEET_SNAP_SPRING,
		}).start();
	}, [snapProgress, snapState]);

	useEffect(() => {
		Animated.spring(dragTranslateY, {
			toValue: 0,
			useNativeDriver: false,
			...MAP_SHEET_SNAP_SPRING,
		}).start();
	}, [dragTranslateY, snapState]);

	const sideInset = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [16, tokens.islandMargin, 0],
	});
	const bottomInset = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [18, tokens.islandMargin, 0],
	});
	const topRadius = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [34, tokens.sheetRadius, 34],
	});
	const bottomRadius = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [34, tokens.sheetRadius, 0],
	});
	const handleWidth = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [54, 48, 46],
	});
	const horizontalPadding = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [0, 0, 0],
	});
	const topPadding = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [2, 6, 8],
	});
	const bottomPadding = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [4, 10, 12],
	});
	const handleBottomMargin = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [3, 6, 7],
	});

	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
				onPanResponderGrant: () => {
					dragTranslateY.stopAnimation();
				},
				onPanResponderMove: (_, gestureState) => {
					const rawDy = gestureState.dy;
					const minDy = snapState === MAP_SHEET_SNAP_STATES.EXPANDED ? 0 : -220;
					const maxDy = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED ? 0 : 180;
					const clampedDy = Math.max(minDy, Math.min(maxDy, rawDy));
					dragTranslateY.setValue(clampedDy);
				},
				onPanResponderRelease: (_, gestureState) => {
					const { dy, vy } = gestureState;
					let nextState = snapState;

					if (dy <= -44 || vy <= -0.28) {
						nextState = getNextSnapStateUp(snapState);
					} else if (dy >= 44 || vy >= 0.28) {
						nextState = getNextSnapStateDown(snapState);
					}

					if (nextState !== snapState) {
						onHandlePress?.(nextState);
					} else {
						Animated.spring(dragTranslateY, {
							toValue: 0,
							useNativeDriver: false,
							...MAP_SHEET_SNAP_SPRING,
						}).start();
					}
				},
				onPanResponderTerminate: () => {
					Animated.spring(dragTranslateY, {
						toValue: 0,
						useNativeDriver: false,
						...MAP_SHEET_SNAP_SPRING,
					}).start();
				},
			}),
		[dragTranslateY, onHandlePress, snapState],
	);

	return (
		<Animated.View
			style={[
				styles.sheetHost,
				tokens.shadowStyle,
				{
					left: sideInset,
					right: sideInset,
					bottom: bottomInset,
					height: sheetHeight,
					borderTopLeftRadius: topRadius,
					borderTopRightRadius: topRadius,
					borderBottomLeftRadius: bottomRadius,
					borderBottomRightRadius: bottomRadius,
					transform: [{ translateY: dragTranslateY }],
				},
			]}
		>
			{isAndroid ? (
				<Animated.View
					pointerEvents="none"
					style={[
						styles.sheetUnderlay,
						{
							borderTopLeftRadius: topRadius,
							borderTopRightRadius: topRadius,
							borderBottomLeftRadius: bottomRadius,
							borderBottomRightRadius: bottomRadius,
							backgroundColor: tokens.glassUnderlay,
						},
					]}
				/>
			) : null}

			<Animated.View
				style={[
					styles.sheetClip,
					{
						borderTopLeftRadius: topRadius,
						borderTopRightRadius: topRadius,
						borderBottomLeftRadius: bottomRadius,
						borderBottomRightRadius: bottomRadius,
						backgroundColor: isAndroid ? tokens.glassSurface : "transparent",
					},
				]}
			>
				{Platform.OS === "ios" ? (
					<BlurView
						intensity={tokens.blurIntensity}
						tint={isDarkMode ? "dark" : "light"}
						style={StyleSheet.absoluteFill}
					/>
				) : null}

				<Animated.View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFillObject,
						{
							borderTopLeftRadius: topRadius,
							borderTopRightRadius: topRadius,
							borderBottomLeftRadius: bottomRadius,
							borderBottomRightRadius: bottomRadius,
							backgroundColor: tokens.glassBackdrop,
						},
					]}
				/>
				<Animated.View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFillObject,
						{
							borderTopLeftRadius: topRadius,
							borderTopRightRadius: topRadius,
							borderBottomLeftRadius: bottomRadius,
							borderBottomRightRadius: bottomRadius,
							backgroundColor: tokens.glassOverlay,
						},
					]}
				/>

				<Animated.View
					style={[
						styles.sheetContent,
						{
							paddingHorizontal: horizontalPadding,
							paddingTop: topPadding,
							paddingBottom: bottomPadding,
						},
					]}
				>
					<View {...panResponder.panHandlers} style={styles.dragZone}>
						<Pressable
							onPress={() => onHandlePress?.()}
							hitSlop={
								isCollapsed
									? { top: 14, bottom: 14, left: 16, right: 16 }
									: 12
							}
							style={[
								styles.handleTapTarget,
								isCollapsed ? styles.handleTapTargetCollapsed : null,
							]}
						>
						<Animated.View
							style={[
								styles.handle,
								{
									width: handleWidth,
									backgroundColor: tokens.handleColor,
									marginBottom: handleBottomMargin,
								},
							]}
						/>
						</Pressable>
					</View>
					{topSlot}
					{children ? <View style={styles.contentViewport}>{children}</View> : null}
					{footerSlot}
				</Animated.View>
			</Animated.View>
		</Animated.View>
	);
}

function buildFeaturedHospitalFeatures(hospital) {
	const features = [];
	const distance = typeof hospital?.distance === "string" ? hospital.distance.trim() : "";
	const eta = typeof hospital?.eta === "string" ? hospital.eta.trim() : "";
	const beds = Number(hospital?.availableBeds);

	if (distance) features.push(distance);
	if (eta) features.push(eta);
	if (Number.isFinite(beds) && beds > 0) {
		features.push(`${beds} beds`);
	}

	return features.slice(0, 2);
}

function SectionLabel({ title, color }) {
	return (
		<View style={styles.sectionLabelBlock}>
			<Text style={[styles.sectionLabel, { color }]}>{title}</Text>
		</View>
	);
}

function FeaturedHospitalPlaceholderCard({ titleColor, bodyColor, compact = false, cardWidth = null, cardHeight = null }) {
	const cardStyle = compact
		? styles.featuredStaticSlot
		: [styles.featuredCard, cardWidth ? { width: cardWidth } : null, cardHeight ? { height: cardHeight } : null];

	return (
		<View style={[cardStyle, styles.placeholderCard]}>
			<LinearGradient
				colors={["rgba(255,255,255,0.08)", "rgba(15,23,42,0.14)"]}
				start={{ x: 0.12, y: 0.08 }}
				end={{ x: 0.86, y: 0.92 }}
				style={[styles.placeholderCardInner, compact ? styles.placeholderCardInnerCompact : null]}
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

function FeaturedHospitalCard({
	hospital,
	titleColor,
	bodyColor,
	onPress,
	compact = false,
	cardWidth = null,
	cardHeight = null,
}) {
	const cardStyle = compact
		? styles.featuredStaticSlot
		: [styles.featuredCard, cardWidth ? { width: cardWidth } : null, cardHeight ? { height: cardHeight } : null];
	const imageStyle = compact ? styles.featuredStaticImage : styles.featuredCardImage;
	const imageImageStyle = compact ? styles.featuredStaticImageStyle : styles.featuredCardImageStyle;

	return (
		<Pressable onPress={() => onPress?.(hospital)} style={cardStyle}>
			<ImageBackground
				source={FEATURED_HOSPITAL_IMAGE}
				resizeMode="cover"
				style={imageStyle}
				imageStyle={imageImageStyle}
			>
				<LinearGradient
					colors={["rgba(8,15,27,0.02)", "rgba(8,15,27,0.18)", "rgba(8,15,27,0.72)"]}
					style={StyleSheet.absoluteFill}
				/>
				<View style={styles.featuredCardContent}>
					<Text numberOfLines={2} style={[styles.featuredTitle, { color: titleColor }]}>
						{hospital?.name || "Hospital"}
					</Text>
					{buildFeaturedHospitalFeatures(hospital).length > 0 ? (
						<Text numberOfLines={compact ? 2 : 1} style={[styles.featuredMeta, { color: bodyColor }]}>
							{buildFeaturedHospitalFeatures(hospital).join(" | ")}
						</Text>
					) : null}
				</View>
			</ImageBackground>
		</Pressable>
	);
}

function buildVisibleHospitalSlots(featuredHospitals) {
	const actualHospitals = Array.isArray(featuredHospitals) ? featuredHospitals.filter(Boolean) : [];
	const targetSlotCount = Math.max(3, actualHospitals.length + 2);
	const placeholderCount = Math.max(0, targetSlotCount - actualHospitals.length);
	return {
		items: [
			...actualHospitals.map((hospital) => ({ type: "hospital", hospital })),
			...Array.from({ length: placeholderCount }, (_, index) => ({
				type: "placeholder",
				key: `placeholder-${index}`,
			})),
		],
		useHorizontalScroll: true,
	};
}

function HospitalRail({ featuredHospitals, titleColor, bodyColor, onOpenFeaturedHospital }) {
	const { items } = buildVisibleHospitalSlots(featuredHospitals);
	const { width: screenWidth } = useWindowDimensions();
	const carouselCardWidth = useMemo(() => {
		const computedWidth = Math.round(
			(screenWidth - FEATURED_CAROUSEL_SIDE_PADDING * 2 - FEATURED_CAROUSEL_GAP * 2 - FEATURED_CAROUSEL_PEEK) / 2,
		);
		return Math.max(184, Math.min(computedWidth, 224));
	}, [screenWidth]);
	const carouselCardHeight = useMemo(() => Math.round(carouselCardWidth * 1.36), [carouselCardWidth]);

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			decelerationRate="fast"
			snapToAlignment="start"
			snapToInterval={carouselCardWidth + FEATURED_CAROUSEL_GAP}
			contentContainerStyle={[
				styles.featuredScrollContent,
				{
					paddingLeft: FEATURED_CAROUSEL_SIDE_PADDING,
					paddingRight: FEATURED_CAROUSEL_SIDE_PADDING,
					gap: FEATURED_CAROUSEL_GAP,
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
						cardWidth={carouselCardWidth}
						cardHeight={carouselCardHeight}
					/>
				) : (
					<FeaturedHospitalPlaceholderCard
						key={item.key || `placeholder-${index}`}
						titleColor={titleColor}
						bodyColor={bodyColor}
						cardWidth={carouselCardWidth}
						cardHeight={carouselCardHeight}
					/>
				),
			)}
		</ScrollView>
	);
}

function CareIntentOrb({
	label,
	subtext,
	iconName,
	colors,
	hierarchy = "secondary",
	onPress,
	isSelected = false,
	titleColor,
	mutedColor,
	pulseProgress = null,
}) {
	const animatedScale =
		hierarchy === "primary" && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [1, 1.03],
				})
			: 1;
	const wrapperOpacity =
		hierarchy === "primary" ? 1 : hierarchy === "secondary" ? 0.84 : 0.68;
	const shadowOpacity =
		hierarchy === "primary" ? 0.26 : hierarchy === "secondary" ? 0.12 : 0.06;
	const shadowRadius =
		hierarchy === "primary" ? 24 : hierarchy === "secondary" ? 12 : 6;
	const shadowOffset = hierarchy === "primary" ? 14 : hierarchy === "secondary" ? 8 : 4;
	const elevation = hierarchy === "primary" ? 12 : hierarchy === "secondary" ? 5 : 2;

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.careAction,
				pressed ? styles.careActionPressed : null,
				{ opacity: pressed ? Math.max(wrapperOpacity - 0.08, 0.54) : wrapperOpacity },
			]}
		>
			<Animated.View
				style={{
					transform: [{ scale: isSelected ? 1.05 : animatedScale }],
				}}
			>
				<LinearGradient
					colors={colors}
					start={{ x: 0.18, y: 0.18 }}
					end={{ x: 0.82, y: 0.9 }}
					style={[
						styles.careIconWrap,
						{
							shadowColor: "#000000",
							shadowOpacity,
							shadowRadius,
							shadowOffset: { width: 0, height: shadowOffset },
							elevation,
							...Platform.select({
								web: {
									boxShadow:
										hierarchy === "primary"
											? "0px 18px 30px rgba(15,23,42,0.24)"
											: hierarchy === "secondary"
												? "0px 10px 16px rgba(15,23,42,0.14)"
												: "0px 5px 9px rgba(15,23,42,0.08)",
								},
							}),
						},
					]}
				>
					<MaterialCommunityIcons name={iconName} size={38} color="#FFFFFF" />
				</LinearGradient>
			</Animated.View>
			<Text
				style={[
					styles.careLabel,
					{
						color:
							hierarchy === "primary"
								? titleColor
								: hierarchy === "secondary"
									? mutedColor
									: mutedColor,
					},
				]}
			>
				{label}
			</Text>
			<Text
				style={[
					styles.careSubtext,
					{
						color:
							hierarchy === "primary"
								? mutedColor
								: hierarchy === "secondary"
									? mutedColor
									: mutedColor,
					},
				]}
			>
				{subtext}
			</Text>
		</Pressable>
	);
}

function MapExploreIntentSheet({
	sheetHeight,
	snapState,
	nearestHospital,
	nearestHospitalMeta,
	selectedCare,
	onOpenSearch,
	onOpenHospitals,
	onChooseCare,
	onOpenProfile,
	onOpenCareHistory,
	onOpenFeaturedHospital,
	onSnapStateChange,
	profileImageSource,
	isSignedIn,
	nearbyHospitalCount,
	totalAvailableBeds,
	nearbyBedHospitals,
	featuredHospitals = [],
}) {
	const { isDarkMode } = useTheme();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const pulseProgress = useRef(new Animated.Value(0)).current;
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const isExpanded = snapState === MAP_SHEET_SNAP_STATES.EXPANDED;

	useEffect(() => {
		const pulseLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseProgress, {
					toValue: 1,
					duration: MAP_CARE_PULSE_MS,
					useNativeDriver: true,
				}),
				Animated.timing(pulseProgress, {
					toValue: 0,
					duration: MAP_CARE_PULSE_MS,
					useNativeDriver: true,
				}),
			]),
		);
		pulseLoop.start();

		return () => {
			pulseLoop.stop();
			pulseProgress.stopAnimation();
		};
	}, [pulseProgress]);

	const handleSnapToggle = (nextState = null) => {
		if (typeof onSnapStateChange !== "function") return;
		onSnapStateChange(nextState || getNextSnapStateUp(snapState));
	};

	const topRow = (
		<View style={[styles.topRow, isCollapsed ? styles.topRowCollapsed : null]}>
			<Pressable
				onPress={onOpenSearch}
				style={[
					styles.searchPill,
					isCollapsed ? styles.searchPillCollapsed : null,
					{
						borderRadius: tokens.cardRadius,
						backgroundColor: tokens.searchSurface,
					},
				]}
			>
				<Ionicons name="search" size={isCollapsed ? 18 : 20} color={tokens.titleColor} />
				<Text style={[styles.searchText, { color: tokens.titleColor }]}>Search</Text>
			</Pressable>

			<MapSheetProfileTrigger
				onPress={onOpenProfile}
				userImageSource={profileImageSource}
				isSignedIn={isSignedIn}
				isCollapsed={isCollapsed}
			/>
		</View>
	);

	const footerTerms = !isCollapsed ? (
		<View style={styles.footerSlot}>
			<InAppBrowserLink
				label="Terms & conditions"
				url="https://ivisit.ng/terms"
				color={tokens.mutedText}
				style={styles.termsLink}
				textStyle={styles.termsText}
			/>
		</View>
	) : null;

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			topSlot={topRow}
			footerSlot={footerTerms}
			onHandlePress={handleSnapToggle}
		>
			{isCollapsed ? null : (
				<ScrollView
					showsVerticalScrollIndicator={false}
					scrollEnabled={isExpanded}
					contentContainerStyle={styles.bodyScrollContent}
				>
					<View style={styles.contentSectionInset}>
						<Pressable
							onPress={onOpenHospitals}
							style={[
								styles.hospitalCard,
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
									Nearest hospital
								</Text>
								<Text numberOfLines={1} style={[styles.hospitalTitle, { color: tokens.titleColor }]}>
									{nearestHospital?.name || "Finding nearest hospital"}
								</Text>
								<Text numberOfLines={1} style={[styles.hospitalMeta, { color: tokens.bodyText }]}>
									{nearestHospitalMeta.join(" | ") || "Tap to see nearby hospitals"}
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={18} color={tokens.mutedText} />
						</Pressable>
					</View>

					<View style={styles.contentSectionInset}>
						<Pressable
							onPress={onOpenCareHistory}
							style={({ pressed }) => [
								styles.sectionTrigger,
								pressed ? styles.sectionTriggerPressed : null,
							]}
						>
							<Text style={[styles.sectionLabel, { color: tokens.mutedText }]}>Choose care</Text>
							<Ionicons name="chevron-forward" size={16} color={tokens.mutedText} />
						</Pressable>

						<View style={styles.careRow}>
							<CareIntentOrb
								label="Ambulance"
								subtext={nearbyHospitalCount > 0 ? `${nearbyHospitalCount} nearby` : "Nearby help"}
								iconName="ambulance"
								colors={["#A11217", "#6D080D"]}
								hierarchy="primary"
								onPress={() => onChooseCare("ambulance")}
								isSelected={selectedCare === "ambulance"}
								titleColor={tokens.titleColor}
								mutedColor={tokens.mutedText}
								pulseProgress={pulseProgress}
							/>

							<CareIntentOrb
								label="Bed space"
								subtext={
									totalAvailableBeds > 0
										? `${totalAvailableBeds} available`
										: nearbyBedHospitals > 0
											? `${nearbyBedHospitals} nearby`
											: "Nearby beds"
								}
								iconName="bed"
								colors={["#6F8DA7", "#506A86"]}
								hierarchy="secondary"
								onPress={() => onChooseCare("bed")}
								isSelected={selectedCare === "bed"}
								titleColor={tokens.titleColor}
								mutedColor={tokens.mutedText}
							/>

							<CareIntentOrb
								label="Compare"
								subtext="All options"
								iconName="format-list-bulleted"
								colors={["#7A8592", "#596370"]}
								hierarchy="tertiary"
								onPress={onOpenCareHistory}
								titleColor={tokens.titleColor}
								mutedColor={tokens.mutedText}
							/>
						</View>
					</View>

					{isExpanded ? (
						<>
							<View style={styles.expandedSection}>
								<View style={styles.featuredRailViewport}>
									<HospitalRail
										featuredHospitals={featuredHospitals}
										titleColor="#F8FAFC"
										bodyColor="rgba(248,250,252,0.82)"
										onOpenFeaturedHospital={onOpenFeaturedHospital}
									/>
								</View>
							</View>
						</>
					) : null}
				</ScrollView>
			)}
		</MapSheetShell>
	);
}

export default function MapSheetOrchestrator({
	mode = MAP_SHEET_MODES.EXPLORE_INTENT,
	snapState = MAP_SHEET_SNAP_STATES.HALF,
	screenHeight,
	nearestHospital,
	nearestHospitalMeta = [],
	selectedCare = null,
	onOpenSearch,
	onOpenHospitals,
	onChooseCare,
	onOpenProfile,
	onOpenCareHistory = () => {},
	onOpenFeaturedHospital = () => {},
	onSnapStateChange = () => {},
	profileImageSource,
	isSignedIn = false,
	nearbyHospitalCount = 0,
	totalAvailableBeds = 0,
	nearbyBedHospitals = 0,
	featuredHospitals = [],
}) {
	const sheetHeight = useMemo(
		() => getMapSheetHeight(screenHeight, snapState),
		[screenHeight, snapState],
	);

	switch (mode) {
		case MAP_SHEET_MODES.EXPLORE_INTENT:
		default:
			return (
				<MapExploreIntentSheet
					sheetHeight={sheetHeight}
					snapState={snapState}
					nearestHospital={nearestHospital}
					nearestHospitalMeta={nearestHospitalMeta}
					selectedCare={selectedCare}
					onOpenSearch={onOpenSearch}
					onOpenHospitals={onOpenHospitals}
					onChooseCare={onChooseCare}
					onOpenProfile={onOpenProfile}
					onOpenCareHistory={onOpenCareHistory}
					onOpenFeaturedHospital={onOpenFeaturedHospital}
					onSnapStateChange={onSnapStateChange}
					profileImageSource={
						profileImageSource || require("../../assets/profile.jpg")
					}
					isSignedIn={isSignedIn}
					nearbyHospitalCount={nearbyHospitalCount}
					totalAvailableBeds={totalAvailableBeds}
					nearbyBedHospitals={nearbyBedHospitals}
					featuredHospitals={featuredHospitals}
				/>
			);
	}
}

const styles = StyleSheet.create({
	sheetHost: {
		position: "absolute",
		overflow: "visible",
	},
	sheetUnderlay: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
	},
	sheetClip: {
		flex: 1,
		overflow: "hidden",
		borderCurve: "continuous",
	},
	sheetContent: {
		flex: 1,
	},
	handle: {
		alignSelf: "center",
		height: 5,
		borderRadius: 999,
	},
	dragZone: {
		alignItems: "center",
	},
	handleTapTarget: {
		alignSelf: "center",
		paddingHorizontal: 8,
		paddingTop: 0,
		paddingBottom: 0,
	},
	handleTapTargetCollapsed: {
		paddingHorizontal: 10,
		paddingTop: 2,
		paddingBottom: 2,
	},
	contentViewport: {
		flex: 1,
	},
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 24,
		paddingHorizontal: 18,
	},
	topRowCollapsed: {
		marginBottom: 0,
	},
	searchPill: {
		flex: 1,
		minHeight: 52,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	searchPillCollapsed: {
		minHeight: 44,
		paddingHorizontal: 14,
	},
	searchText: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: "700",
	},
	bodyScrollContent: {
		paddingBottom: 6,
	},
	contentSectionInset: {
		paddingHorizontal: 18,
	},
	avatarPressable: {
		width: 44,
		height: 44,
		position: "relative",
		alignItems: "center",
		justifyContent: "center",
	},
	avatarPressableCollapsed: {
		width: 40,
		height: 40,
	},
	avatarImage: {
		width: 42,
		height: 42,
		borderRadius: 21,
	},
	avatarImageCollapsed: {
		width: 38,
		height: 38,
		borderRadius: 19,
	},
	avatarDot: {
		position: "absolute",
		bottom: 2,
		right: 1,
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: "#10B981",
		borderWidth: 2,
		borderColor: "#FFFFFF",
	},
	avatarDotCollapsed: {
		bottom: 1,
		right: 0,
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	hospitalCard: {
		paddingHorizontal: 14,
		paddingVertical: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		marginBottom: 28,
	},
	hospitalIconWrap: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
	},
	hospitalCardCopy: {
		flex: 1,
	},
	hospitalEyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		letterSpacing: 0.8,
		textTransform: "uppercase",
	},
	hospitalTitle: {
		marginTop: 4,
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
	},
	hospitalMeta: {
		marginTop: 4,
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "400",
	},
	sectionTrigger: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		alignSelf: "flex-start",
		marginBottom: 24,
	},
	sectionTriggerPressed: {
		opacity: 0.78,
	},
	sectionLabelBlock: {
		marginBottom: 18,
	},
	sectionLabel: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
	},
	careRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 10,
	},
	expandedSection: {
		marginTop: 32,
	},
	featuredRailViewport: {
		marginHorizontal: -18,
		overflow: "hidden",
	},
	featuredScrollContent: {
		paddingLeft: 24,
		paddingRight: 24,
		gap: 10,
	},
	featuredStaticRow: {
		flexDirection: "row",
		alignItems: "stretch",
		gap: 10,
		paddingHorizontal: 18,
	},
	featuredCard: {
		width: 212,
		height: 288,
		borderRadius: 30,
		overflow: "hidden",
	},
	featuredStaticSlot: {
		flex: 1,
		height: 218,
		borderRadius: 28,
		overflow: "hidden",
	},
	featuredCardImage: {
		flex: 1,
		justifyContent: "flex-end",
	},
	featuredStaticImage: {
		flex: 1,
		justifyContent: "flex-end",
	},
	featuredCardImageStyle: {
		borderRadius: 30,
	},
	featuredStaticImageStyle: {
		borderRadius: 28,
	},
	featuredCardContent: {
		paddingHorizontal: 14,
		paddingVertical: 14,
	},
	featuredTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
	},
	featuredMeta: {
		marginTop: 4,
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "400",
	},
	placeholderCard: {
		backgroundColor: "rgba(255,255,255,0.03)",
	},
	placeholderCardInner: {
		flex: 1,
		borderRadius: 28,
	},
	placeholderCardInnerCompact: {
		borderRadius: 28,
	},
	placeholderCopy: {
		flex: 1,
		justifyContent: "flex-end",
		paddingHorizontal: 14,
		paddingVertical: 14,
	},
	placeholderTitleBlock: {
		gap: 6,
	},
	placeholderTitleSkeleton: {
		height: 18,
		borderRadius: 999,
		backgroundColor: "rgba(248,250,252,0.22)",
		width: "86%",
	},
	placeholderTitleSkeletonShort: {
		width: "64%",
	},
	placeholderMetaSkeleton: {
		height: 12,
		borderRadius: 999,
		backgroundColor: "rgba(248,250,252,0.14)",
		width: "58%",
		marginTop: 10,
	},
	footerSlot: {
		width: "100%",
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 6,
		paddingBottom: 2,
		paddingHorizontal: 18,
	},
	termsLink: {
		marginTop: 2,
		alignSelf: "center",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 2,
	},
	termsText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
		textAlign: "center",
	},
	careAction: {
		flex: 1,
		alignItems: "center",
		justifyContent: "flex-start",
		paddingVertical: 2,
		paddingHorizontal: 1,
	},
	careActionPressed: {
		opacity: 0.88,
	},
	careIconWrap: {
		width: 88,
		height: 88,
		borderRadius: 44,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	careLabel: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "800",
		textAlign: "center",
	},
	careSubtext: {
		marginTop: 3,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
		textAlign: "center",
	},
});
