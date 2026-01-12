// components/emergency/MiniProfileModal.jsx
// Clean modal matching login/register style - animated slide from bottom

import { useEffect, useRef } from "react";
import { View, Text, Image, Pressable, Modal, Animated, Dimensions, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useVisits } from "../../contexts/VisitsContext";
import { useMedicalProfile } from "../../hooks/user/useMedicalProfile";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { navigateToMedicalProfile, navigateToProfile, navigateToVisits } from "../../utils/navigationHelpers";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * MiniProfileModal - Matches login/register modal style
 * - Large avatar centered
 * - Name & email below
 * - Visits list (tappable → goes to visits)
 * - Avatar tappable → goes to profile
 */
export default function MiniProfileModal({ visible, onClose }) {
	const { isDarkMode } = useTheme();
	const { user } = useAuth();
	const { visitCounts } = useVisits();
	const { profile: medicalProfile } = useMedicalProfile();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	// Animations (matching login/register modals)
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	const cardBg = isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt;
	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const textMuted = isDarkMode ? "#94A3B8" : "#64748B";
	const listItemBg = isDarkMode ? "#0B0F1A" : "#F3E7E7";

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					tension: 50,
					friction: 9,
					useNativeDriver: true,
				}),
				Animated.timing(bgOpacity, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [visible]);

	const handleDismiss = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: SCREEN_HEIGHT,
				duration: 250,
				useNativeDriver: true,
			}),
			Animated.timing(bgOpacity, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}),
		]).start(() => onClose());
	};

	const handleAvatarPress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		handleDismiss();
		setTimeout(() => navigateToProfile({ router }), 300);
	};

	const handleVisitsPress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		handleDismiss();
		setTimeout(() => navigateToVisits({ router }), 300);
	};

	const totalVisits = visitCounts?.all || 0;

	const handleMedicalPress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		handleDismiss();
		setTimeout(() => navigateToMedicalProfile({ router }), 300);
	};

	return (
		<Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
			<View style={{ flex: 1, justifyContent: "flex-end" }}>
				{/* Backdrop */}
				<Animated.View
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: "rgba(0,0,0,0.6)",
						opacity: bgOpacity,
					}}
				>
					<Pressable style={{ flex: 1 }} onPress={handleDismiss} />
				</Animated.View>

				{/* Modal Card - at least 50% height */}
				<Animated.View
					style={{
						transform: [{ translateY: slideAnim }],
						backgroundColor: cardBg,
						borderTopLeftRadius: 40,
						borderTopRightRadius: 40,
						minHeight: SCREEN_HEIGHT * 0.55,
						maxHeight: SCREEN_HEIGHT * 0.75,
					}}
				>
					{/* Handle */}
					<View style={{ alignItems: "center", paddingTop: 16, marginBottom: 20 }}>
						<View
							style={{
								width: 48,
								height: 6,
								borderRadius: 3,
								backgroundColor: isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
							}}
						/>
					</View>

					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{
							paddingHorizontal: 8,
							paddingBottom: insets.bottom + 32,
						}}
					>
						{/* Large Avatar (tappable → profile) */}
						<Pressable onPress={handleAvatarPress} style={{ alignItems: "center", marginBottom: 12 }}>
							<Image
								source={
									user?.imageUri
										? { uri: user.imageUri }
										: require("../../assets/profile.jpg")
								}
								style={{
									width: 80,
									height: 80,
									borderRadius: 40,
									borderWidth: 3,
									borderColor: COLORS.brandPrimary,
								}}
							/>
						</Pressable>

						{/* Name & Email */}
						<View style={{ alignItems: "center", marginBottom: 24 }}>
							<Text style={{ fontSize: 20, fontWeight: "900", color: textColor, letterSpacing: -0.5 }}>
								{user?.fullName || user?.username || "User"}
							</Text>
							<Text style={{ fontSize: 13, color: textMuted, marginTop: 2 }}>
								{user?.email || "email@example.com"}
							</Text>
						</View>

						{/* Visits Section (tappable → visits screen) */}
						<Pressable onPress={handleVisitsPress} style={{ marginBottom: 16 }}>
							<View style={{ backgroundColor: listItemBg, borderRadius: 20, padding: 16 }}>
								<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
									<Ionicons name="calendar" size={18} color={COLORS.brandPrimary} />
									<Text style={{ marginLeft: 8, fontSize: 14, fontWeight: "500", color: textColor }}>
										Your Visits
									</Text>
									<View style={{ flex: 1 }} />
									<Ionicons name="chevron-forward" size={16} color={textMuted} />
								</View>
								<View style={{ flexDirection: "row", justifyContent: "space-around" }}>
									<View style={{ alignItems: "center" }}>
										<Text style={{ fontSize: 22, fontWeight: "900", color: COLORS.brandPrimary }}>
											{visitCounts?.upcoming || 0}
										</Text>
										<Text style={{ fontSize: 11, color: textMuted }}>Upcoming</Text>
									</View>
									<View style={{ width: 1, backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }} />
									<View style={{ alignItems: "center" }}>
										<Text style={{ fontSize: 22, fontWeight: "900", color: textColor }}>
											{visitCounts?.completed || 0}
										</Text>
										<Text style={{ fontSize: 11, color: textMuted }}>Completed</Text>
									</View>
									<View style={{ width: 1, backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }} />
									<View style={{ alignItems: "center" }}>
										<Text style={{ fontSize: 22, fontWeight: "900", color: textColor }}>
											{totalVisits}
										</Text>
										<Text style={{ fontSize: 11, color: textMuted }}>All</Text>
									</View>
								</View>
							</View>
						</Pressable>

						{/* Medical History */}
						<View style={{ backgroundColor: listItemBg, borderRadius: 20, padding: 16 }}>
							<Pressable
								onPress={handleMedicalPress}
								style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}
							>
								<Ionicons name="medkit" size={18} color={COLORS.brandPrimary} />
								<Text style={{ marginLeft: 8, fontSize: 14, fontWeight: "500", color: textColor }}>
									Medical History
								</Text>
								<View style={{ flex: 1 }} />
								<Ionicons name="chevron-forward" size={16} color={textMuted} />
							</Pressable>

							{[
								{ 
									label: "Blood Type", 
									icon: "water-outline", 
									value: medicalProfile?.bloodType || "Not set" 
								},
								{ 
									label: "Allergies", 
									icon: "warning-outline", 
									value: medicalProfile?.allergies || "None listed" 
								},
								{ 
									label: "Medications", 
									icon: "medical-outline", 
									value: medicalProfile?.medications || "None listed" 
								},
								{ 
									label: "Past Surgeries", 
									icon: "bandage-outline", 
									value: medicalProfile?.surgeries || "None listed" 
								},
								{ 
									label: "Conditions", 
									icon: "fitness-outline", 
									value: medicalProfile?.conditions || "None listed" 
								},
							].map((item, index) => (
								<Pressable
									key={item.label}
									onPress={handleMedicalPress}
									style={{
										flexDirection: "row",
										alignItems: "center",
										paddingVertical: 10,
										borderTopWidth: index > 0 ? 1 : 0,
										borderTopColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
									}}
								>
									<View
										style={{
											width: 32,
											height: 32,
											borderRadius: 8,
											backgroundColor: `${COLORS.brandPrimary}15`,
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<Ionicons name={item.icon} size={16} color={COLORS.brandPrimary} />
									</View>
									<View style={{ flex: 1, marginLeft: 10 }}>
										<Text style={{ fontSize: 14, fontWeight:'400', color: textColor }}>
											{item.label}
										</Text>
										<Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
											{item.value}
										</Text>
									</View>
									<Ionicons name="chevron-forward" size={16} color={textMuted} />
								</Pressable>
							))}
						</View>
					</ScrollView>
				</Animated.View>
			</View>
		</Modal>
	);
}
