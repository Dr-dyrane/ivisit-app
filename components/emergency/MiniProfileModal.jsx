import { useEffect, useRef } from "react";
import { View, Text, Image, Pressable, Modal, Animated, Dimensions, ScrollView, StyleSheet } from "react-native";
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

export default function MiniProfileModal({ visible, onClose }) {
	const { isDarkMode } = useTheme();
	const { user } = useAuth();
	const { visitCounts } = useVisits();
	const { profile: medicalProfile } = useMedicalProfile();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }),
				Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
			]).start();
		}
	}, [visible]);

	const handleDismiss = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		Animated.parallel([
			Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
			Animated.timing(bgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
		]).start(() => onClose());
	};

	const executeNav = (navFn) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		handleDismiss();
		setTimeout(() => navFn({ router }), 300);
	};

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const textMuted = isDarkMode ? "#94A3B8" : "#64748B";
	const widgetBg = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

	return (
		<Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
			<View style={styles.modalWrapper}>
				<Animated.View style={[styles.backdrop, { opacity: bgOpacity }]}>
					<Pressable style={{ flex: 1 }} onPress={handleDismiss} />
				</Animated.View>

				<Animated.View style={[styles.modalCard, { 
                    transform: [{ translateY: slideAnim }], 
                    backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
                    paddingBottom: insets.bottom + 20
                }]}>
					{/* Handle */}
					<View style={styles.handleContainer}>
						<View style={[styles.handle, { backgroundColor: isDarkMode ? "#334155" : "#E2E8F0" }]} />
					</View>

					<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
						
						{/* HEADER SECTION: Identity Card */}
						<View style={styles.profileHeader}>
							<Pressable onPress={() => executeNav(navigateToProfile)} style={styles.avatarContainer}>
								<Image
									source={user?.imageUri ? { uri: user.imageUri } : require("../../assets/profile.jpg")}
									style={styles.avatarImage}
								/>
								<View style={styles.activeSeal}>
									<Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
								</View>
							</Pressable>
							<Text style={[styles.userName, { color: textColor }]}>
								{user?.fullName || "User Profile"}
							</Text>
							<Text style={[styles.userEmail, { color: textMuted }]}>
								{user?.email || "medical@ivisit.com"}
							</Text>
						</View>

						{/* VISITS WIDGET: High-Contrast Dashboard */}
						<Pressable onPress={() => executeNav(navigateToVisits)} style={[styles.widget, { backgroundColor: widgetBg }]}>
							<View style={styles.widgetHeader}>
								<Text style={[styles.widgetTitle, { color: textColor }]}>YOUR VISITS</Text>
								<Ionicons name="arrow-forward-circle" size={24} color={COLORS.brandPrimary} />
							</View>
							
							<View style={styles.statsRow}>
								<View style={styles.statItem}>
									<Text style={[styles.statNumber, { color: COLORS.brandPrimary }]}>{visitCounts?.upcoming || 0}</Text>
									<Text style={[styles.statLabel, { color: textMuted }]}>UPCOMING</Text>
								</View>
								<View style={[styles.divider, { backgroundColor: isDarkMode ? "#1E293B" : "#E2E8F0" }]} />
								<View style={styles.statItem}>
									<Text style={[styles.statNumber, { color: textColor }]}>{visitCounts?.completed || 0}</Text>
									<Text style={[styles.statLabel, { color: textMuted }]}>HISTORY</Text>
								</View>
							</View>
						</Pressable>

						{/* MEDICAL PASSPORT SECTION */}
						<View style={[styles.widget, { backgroundColor: widgetBg, marginTop: 16 }]}>
							<Pressable onPress={() => executeNav(navigateToMedicalProfile)} style={styles.widgetHeader}>
								<Text style={[styles.widgetTitle, { color: textColor }]}>MEDICAL PASSPORT</Text>
								<Text style={styles.editLabel}>VIEW ALL</Text>
							</Pressable>

							{[
								{ label: "Blood Type", icon: "water", value: medicalProfile?.bloodType || "Not set" },
								{ label: "Allergies", icon: "warning", value: medicalProfile?.allergies || "None" },
								{ label: "Medications", icon: "medical", value: medicalProfile?.medications || "None" },
							].map((item, index) => (
								<Pressable 
                                    key={index} 
                                    onPress={() => executeNav(navigateToMedicalProfile)} 
                                    style={[styles.medicalItem, { borderTopWidth: index === 0 ? 0 : 1, borderTopColor: isDarkMode ? "#1E293B" : "#E2E8F0" }]}
                                >
									<View style={[styles.iconBox, { backgroundColor: COLORS.brandPrimary + '15' }]}>
										<Ionicons name={item.icon} size={18} color={COLORS.brandPrimary} />
									</View>
									<View style={styles.medicalInfo}>
										<Text style={[styles.medicalLabel, { color: textMuted }]}>{item.label}</Text>
										<Text style={[styles.medicalValue, { color: textColor }]}>{item.value}</Text>
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

const styles = StyleSheet.create({
	modalWrapper: { flex: 1, justifyContent: "flex-end" },
	backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)" },
	modalCard: {
		borderTopLeftRadius: 48, // Aggressive Premium Rounding
		borderTopRightRadius: 48,
		minHeight: SCREEN_HEIGHT * 0.6,
		maxHeight: SCREEN_HEIGHT * 0.85,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 20,
	},
	handleContainer: { alignItems: "center", paddingVertical: 18 },
	handle: { width: 44, height: 6, borderRadius: 3 },
	scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
	
	profileHeader: { alignItems: "center", marginBottom: 32 },
	avatarContainer: { position: "relative", marginBottom: 16 },
	avatarImage: { 
        width: 100, 
        height: 100, 
        borderRadius: 32, // Large Nested Squircle
        borderWidth: 3,
        borderColor: COLORS.brandPrimary 
    },
	activeSeal: {
		position: 'absolute',
		bottom: -4,
		right: -4,
		backgroundColor: COLORS.brandPrimary,
		width: 28,
		height: 28,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 3,
		borderColor: '#FFF',
	},
	userName: { fontSize: 24, fontWeight: "900", letterSpacing: -0.8 },
	userEmail: { fontSize: 14, fontWeight: "500", marginTop: 4, opacity: 0.7 },

	widget: { borderRadius: 32, padding: 24 },
	widgetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
	widgetTitle: { fontSize: 12, fontWeight: "900", letterSpacing: 1.2 },
	editLabel: { fontSize: 11, fontWeight: "800", color: COLORS.brandPrimary },

	statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	statItem: { flex: 1, alignItems: "center" },
	statNumber: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
	statLabel: { fontSize: 10, fontWeight: "800", marginTop: 4 },
	divider: { width: 1, height: 40, opacity: 0.5 },

	medicalItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
	iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
	medicalInfo: { flex: 1, marginLeft: 16 },
	medicalLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
	medicalValue: { fontSize: 15, fontWeight: "700", marginTop: 2 }
});