import React, { useRef, useEffect } from "react";
import { View, Text, Pressable, Image, Platform, Animated, StyleSheet } from "react-native";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";
import StatusIndicator from "../ui/StatusIndicator";

/**
 * HospitalCardSkeleton - Shimmer loading placeholder
 */
export function HospitalCardSkeleton() {
	const { isDarkMode } = useTheme();
	const shimmerAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const shimmer = Animated.loop(
			Animated.sequence([
				Animated.timing(shimmerAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(shimmerAnim, {
					toValue: 0,
					duration: 1000,
					useNativeDriver: true,
				}),
			])
		);
		shimmer.start();
		return () => shimmer.stop();
	}, []);

	const cardBackground = isDarkMode ? "#0B0F1A" : "#F3E7E7";
	const shimmerColor = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
	const shimmerHighlight = isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";

	const animatedBg = {
		backgroundColor: shimmerAnim.interpolate({
			inputRange: [0, 1],
			outputRange: [shimmerColor, shimmerHighlight],
		}),
	};

	return (
		<View
			style={[
				skeletonStyles.container,
				{
					backgroundColor: cardBackground,
					...Platform.select({
						ios: {
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 2 },
							shadowOpacity: 0.03,
							shadowRadius: 6,
						},
						android: { elevation: 1 },
					}),
				},
			]}
		>
			{/* Image placeholder */}
			<Animated.View style={[skeletonStyles.image, animatedBg]} />

			{/* Content */}
			<View style={skeletonStyles.content}>
				{/* Title */}
				<Animated.View style={[skeletonStyles.title, animatedBg]} />

				{/* Rating row */}
				<View style={skeletonStyles.row}>
					<Animated.View style={[skeletonStyles.ratingPill, animatedBg]} />
					<Animated.View style={[skeletonStyles.statusPill, animatedBg]} />
				</View>

				{/* Specialty tags */}
				<View style={skeletonStyles.row}>
					<Animated.View style={[skeletonStyles.tag, animatedBg]} />
					<Animated.View style={[skeletonStyles.tag, { width: 50 }, animatedBg]} />
				</View>
			</View>

			{/* Price/ETA */}
			<View style={skeletonStyles.priceSection}>
				<Animated.View style={[skeletonStyles.priceLine, animatedBg]} />
				<Animated.View style={[skeletonStyles.etaLine, animatedBg]} />
			</View>
		</View>
	);
}

const skeletonStyles = StyleSheet.create({
	container: {
		borderRadius: 30,
		padding: 16,
		marginBottom: 16,
	},
	image: {
		width: "100%",
		height: 130,
		borderRadius: 20,
		marginBottom: 12,
	},
	content: {
		flex: 1,
	},
	title: {
		height: 20,
		width: "70%",
		borderRadius: 10,
		marginBottom: 10,
	},
	row: {
		flexDirection: "row",
		marginBottom: 8,
	},
	ratingPill: {
		height: 16,
		width: 40,
		borderRadius: 8,
		marginRight: 12,
	},
	statusPill: {
		height: 16,
		width: 60,
		borderRadius: 8,
	},
	tag: {
		height: 22,
		width: 70,
		borderRadius: 11,
		marginRight: 6,
	},
	priceSection: {
		position: "absolute",
		top: 16,
		right: 16,
		alignItems: "flex-end",
	},
	priceLine: {
		height: 22,
		width: 50,
		borderRadius: 11,
		marginBottom: 6,
	},
	etaLine: {
		height: 14,
		width: 40,
		borderRadius: 7,
	},
});

/**
 * HospitalCard - Apple-style glass card for hospitals
 *
 * Premium frosted glass design with bubble shadows
 */
export default function HospitalCard({
	hospital,
	isSelected,
	onSelect,
	onCall,
	mode = "emergency", // "emergency" or "booking"
}) {
	const { isDarkMode } = useTheme();

	if (!hospital) return null;

	// Solid card colors matching app design system (no borders)
	const cardBackground = isSelected
		? isDarkMode ? `${COLORS.brandPrimary}18` : `${COLORS.brandPrimary}10`
		: isDarkMode ? "#0B0F1A" : "#F3E7E7";

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

	const handlePress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onSelect(hospital.id);
	};

	const handleCallPress = () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		onCall(hospital.id);
	};

	return (
		<Pressable
			onPress={handlePress}
			style={({ pressed }) => ({
				backgroundColor: cardBackground,
				borderRadius: 30, // More rounded, no border
				padding: 16,
				marginBottom: 16,
				transform: [{ scale: pressed ? 0.98 : 1 }],
				...Platform.select({
					ios: {
						shadowColor: isSelected ? COLORS.brandPrimary : "#000",
						shadowOffset: { width: 0, height: isSelected ? 6 : 3 },
						shadowOpacity: isSelected ? 0.15 : 0.04,
						shadowRadius: isSelected ? 12 : 6,
					},
					android: { elevation: isSelected ? 4 : 2 },
				}),
			})}
		>
			<Image
				source={{ uri: hospital.image }}
				style={{
					width: "100%",
					height: 130,
					borderRadius: 20, // More rounded image
					marginBottom: 12,
					backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
				}}
				resizeMode="cover"
			/>

			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "flex-start",
					marginBottom: 12,
				}}
			>
				<View style={{ flex: 1 }}>
					<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
						<Text
							style={{
								fontSize: 18,
								fontWeight: "700",
								color: textColor,
								letterSpacing: -0.3,
								flex: 1,
							}}
						>
							{hospital.name}
						</Text>
						{hospital.verified && (
							<Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginLeft: 8 }} />
						)}
					</View>

					<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
						<Ionicons name="star" size={16} color="#FFC107" />
						<Text
							style={{ fontSize: 14, color: mutedColor, marginLeft: 4, marginRight: 12 }}
						>
							{hospital.rating}
						</Text>
						<StatusIndicator
							status={hospital.availableBeds > 0 ? "available" : "busy"}
							text={hospital.availableBeds > 0 ? "Available" : "Full"}
							size="small"
							showIcon={false}
						/>
					</View>

					{/* Specialties */}
					<View style={{ flexDirection: "row", flexWrap: "wrap" }}>
						{hospital.specialties.slice(0, 2).map((specialty, index) => (
							<View
								key={index}
								style={{
									backgroundColor: `${COLORS.brandPrimary}15`,
									paddingHorizontal: 10,
									paddingVertical: 5,
									borderRadius: 14, // More rounded
									marginRight: 6,
									marginBottom: 4,
								}}
							>
								<Text
									style={{
										fontSize: 11,
										color: COLORS.brandPrimary,
										fontWeight: "600",
									}}
								>
									{specialty}
								</Text>
							</View>
						))}
					</View>
				</View>

				<View style={{ alignItems: "flex-end" }}>
					<Text
						style={{
							fontSize: 20,
							fontWeight: "800",
							color: COLORS.brandPrimary,
							marginBottom: 4,
						}}
					>
						{hospital.price}
					</Text>
					<Text
						style={{
							fontSize: 12,
							color: mutedColor,
							textAlign: "right",
						}}
					>
						Wait: {hospital.waitTime}
					</Text>
				</View>
			</View>

			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					marginBottom: 12,
				}}
			>
				<View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
					<Ionicons name="location" size={16} color={COLORS.brandPrimary} />
					<Text
						style={{ fontSize: 13, color: mutedColor, marginLeft: 6 }}
					>
						{hospital.distance}
					</Text>
				</View>
				<View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
					<Fontisto
						name={mode === "booking" ? "bed-patient" : "clock"}
						size={16}
						color={COLORS.brandPrimary}
					/>
					<Text
						style={{ fontSize: 13, color: mutedColor, marginLeft: 6 }}
					>
						{mode === "booking" ? `${hospital.availableBeds} beds` : `ETA: ${hospital.eta}`}
					</Text>
				</View>
			</View>

			{isSelected && (
				<Pressable
					onPress={handleCallPress}
					style={{
						backgroundColor: COLORS.brandPrimary,
						paddingVertical: 14,
						paddingHorizontal: 20,
						borderRadius: 20, // More rounded
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						marginTop: 8,
					}}
				>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<Fontisto
							name={mode === "booking" ? "bed-patient" : "ambulance"}
							size={20}
							color="#FFFFFF"
						/>
						<Text
							style={{
								color: "#FFFFFF",
								fontSize: 15,
								fontWeight: "700",
								marginLeft: 10,
								letterSpacing: 0.3,
							}}
						>
							{mode === "booking" ? "Book Bed" : "Request Now"}
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
				</Pressable>
			)}
		</Pressable>
	);
}
