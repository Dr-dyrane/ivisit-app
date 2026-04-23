import React from "react";
import { ImageBackground, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PanResponder } from "react-native";
import { styles as bodyStyles } from "./mapVisitDetail.styles";

// PULLBACK NOTE: Extract PassportHero to separate component for modularity
// OLD: PassportHero embedded in MapVisitDetailBody
// NEW: Separate component file for easier maintenance and platform inclusivity

function HeroIcon({ iconDescriptor, size, color }) {
	if (!iconDescriptor) {
		return <Ionicons name="medical-outline" size={size} color={color} />;
	}
	if (iconDescriptor.library === "material") {
		return (
			<Ionicons
				name={iconDescriptor.name}
				size={size}
				color={color}
			/>
		);
	}
	return <Ionicons name={iconDescriptor.name} size={size} color={color} />;
}

export default function PassportHero({ hero, theme, onSwipeToToggle }) {
	const heroTitle = hero?.title || "Visit";
	const heroSubtitle = hero?.subtitle || hero?.supportLine || "";

	// PULLBACK NOTE: Add hero swipe gesture to toggle collapse/expand
	// OLD: No swipe gesture on hero
	// NEW: PanResponder for swipe to toggle between COLLAPSED and HALF states
	const heroSwipeResponder = React.useMemo(() => {
		if (typeof onSwipeToToggle !== "function") return null;

		return PanResponder.create({
			onMoveShouldSetPanResponder: (_event, gestureState) => {
				const absDx = Math.abs(gestureState.dx);
				const absDy = Math.abs(gestureState.dy);
				const absVx = Math.abs(gestureState.vx || 0);
				return absDx > 16 && (absDx > absDy * 1.16 || absVx > 0.2);
			},
			onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
				const absDx = Math.abs(gestureState.dx);
				const absDy = Math.abs(gestureState.dy);
				const absVx = Math.abs(gestureState.vx || 0);
				return absDx > 16 && (absDx > absDy * 1.16 || absVx > 0.2);
			},
			onPanResponderRelease: (_event, gestureState) => {
				const absDx = Math.abs(gestureState.dx);
				const absDy = Math.abs(gestureState.dy);
				const absVx = Math.abs(gestureState.vx || 0);
				if (
					(absDx > 42 && absDx > absDy * 1.08) ||
					(absVx > 0.36 && absDx > 18)
				) {
					onSwipeToToggle();
				}
			},
			onPanResponderTerminationRequest: () => true,
		});
	}, [onSwipeToToggle]);
	const heroSwipeHandlers = heroSwipeResponder?.panHandlers ?? {};

	return (
		<ImageBackground
			source={hero.imageSource}
			resizeMode="cover"
			fadeDuration={0}
			style={bodyStyles.heroCanvas}
			imageStyle={bodyStyles.heroCanvasImage}
			onError={(error) => {
				console.log("[PassportHero] Image load error:", error.nativeEvent?.error || error);
			}}
			{...heroSwipeHandlers}
		>
			<LinearGradient
				pointerEvents="none"
				colors={["rgba(8,15,27,0)", "rgba(8,15,27,0.14)", "rgba(8,15,27,0.26)", "rgba(8,15,27,0.40)"]}
				style={StyleSheet.absoluteFillObject}
			/>
			<LinearGradient
				pointerEvents="none"
				colors={["rgba(8,15,27,0.36)", "rgba(8,15,27,0.18)", "rgba(8,15,27,0)"]}
				style={bodyStyles.heroTopMask}
			/>
			<LinearGradient
				pointerEvents="none"
				colors={["rgba(8,15,27,0)", "rgba(8,15,27,0.10)", "rgba(8,15,27,0.28)", "rgba(8,15,27,0.58)"]}
				style={bodyStyles.heroBottomMerge}
			/>

			{hero.badges?.length > 0 ? (
				<View style={bodyStyles.heroBadgeRow}>
					{hero.badges.map((badge, index) => {
						const item =
							badge && typeof badge === "object"
								? badge
								: { label: String(badge || ""), tone: "neutral" };
						if (!item.label) return null;
						const badgeBg =
							item.tone === "verified"
								? "rgba(16,185,129,0.18)"
								: item.tone === "alert"
									? "rgba(225,29,72,0.18)"
									: "rgba(255,255,255,0.12)";
						return (
							<View
								key={`${item.label}-${index}`}
								style={[bodyStyles.heroBadge, { backgroundColor: badgeBg }]}
							>
								<HeroIcon item={item} color="#F8FAFC" size={12} />
								<Text style={bodyStyles.heroBadgeText}>{item.label}</Text>
							</View>
						);
					})}
				</View>
			) : null}

			<View style={bodyStyles.heroHeaderBlock}>
				<View style={bodyStyles.heroPlaceMarkWrap}>
					<View
						style={[
							bodyStyles.heroPlaceMark,
							{ backgroundColor: theme.placeMarkSurface },
						]}
					>
						<HeroIcon
							item={hero.icon}
							size={20}
							color={theme.placeMarkIconColor}
						/>
					</View>
				</View>
				<Text
					numberOfLines={2}
					style={[bodyStyles.heroTitle, { color: theme.heroOnImageTitleColor }]}
				>
					{heroTitle}
				</Text>
				{hero.subtitle ? (
					<Text
						numberOfLines={2}
						style={[
							bodyStyles.heroSubtitle,
							{ color: theme.heroOnImageBodyColor },
						]}
					>
						{heroSubtitle}
					</Text>
				) : null}
			</View>
		</ImageBackground>
	);
}
