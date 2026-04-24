import React from "react";
import { View, Text, Image, Pressable, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { STACK_TOP_PADDING } from "../../../constants/layout";
import { COLORS } from "../../../constants/colors";

// PULLBACK NOTE: ProfileHero - Modular hero section component
// Extracted from ProfileScreen to follow /map module pattern
// REASON: Separation of concerns, easier debugging and maintenance

export default function ProfileHero({
	user,
	imageUri,
	displayId,
	isDarkMode,
	fadeAnim,
	slideAnim,
	imageScale,
	pickImage,
	colors,
}) {
	return (
		<Animated.View
			style={{
				opacity: fadeAnim,
				transform: [{ translateY: slideAnim }, { scale: imageScale }],
				alignItems: "center",
				paddingBottom: 32,
				paddingTop: STACK_TOP_PADDING,
			}}
		>
			<Pressable onPress={pickImage} style={{ position: "relative" }}>
				<Image
					key={imageUri}
					source={
						imageUri ? { uri: imageUri } : require("../../../assets/profile.jpg")
					}
					style={{
						width: 120,
						height: 120,
						borderRadius: 36,
						backgroundColor: COLORS.brandPrimary + "15",
					}}
				/>
				<View
					style={{
						position: "absolute",
						bottom: -4,
						right: -4,
						backgroundColor: COLORS.brandPrimary,
						borderRadius: 14,
						width: 44,
						height: 44,
						justifyContent: "center",
						alignItems: "center",
						shadowColor: COLORS.brandPrimary,
						shadowOffset: { width: 0, height: 4 },
						shadowOpacity: 0.3,
						shadowRadius: 8,
						elevation: 6,
					}}
				>
					<Ionicons name="camera" size={22} color="#FFFFFF" />
				</View>
			</Pressable>

			<Text
				style={{
					fontSize: 28,
					fontWeight: "900",
					color: colors.text,
					marginTop: 16,
					textAlign: "center",
					letterSpacing: -1.0,
				}}
			>
				{user?.fullName || "Your Name"}
			</Text>

			<Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
				{user?.email || "email@example.com"}
			</Text>

			<View style={{
				marginTop: 8,
				backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
				paddingHorizontal: 12,
				paddingVertical: 4,
				borderRadius: 12,
			}}>
				<Text style={{
					fontSize: 12,
					fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
					fontWeight: "700",
					color: COLORS.brandPrimary,
					letterSpacing: 1
				}}>
					{displayId || 'IVP-PENDING'}
				</Text>
			</View>

			{user?.hasInsurance && (
				<View
					style={{
						marginTop: 16,
						backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(134, 16, 14, 0.05)",
						paddingHorizontal: 16,
						paddingVertical: 8,
						borderRadius: 16,
						borderWidth: 1,
						borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(134, 16, 14, 0.1)",
						flexDirection: "row",
						alignItems: "center",
						gap: 8,
					}}
				>
					<View
						style={{
							width: 8,
							height: 8,
							borderRadius: 4,
							backgroundColor: COLORS.brandPrimary,
							shadowColor: COLORS.brandPrimary,
							shadowOpacity: 0.5,
							shadowRadius: 4,
						}}
					/>
					<Text
						style={{
							fontSize: 12,
							fontWeight: "800",
							color: isDarkMode ? "#FFFFFF" : COLORS.brandPrimary,
							letterSpacing: 0.5,
							textTransform: "uppercase",
						}}
					>
						iVisit Basic Member
					</Text>
				</View>
			)}
		</Animated.View>
	);
}
