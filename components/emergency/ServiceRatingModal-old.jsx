import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
	Modal,
	View,
	Text,
	Pressable,
	StyleSheet,
	Animated,
	Dimensions,
	TextInput,
	KeyboardAvoidingView,
	Keyboard,
	Platform,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { useAndroidKeyboardAwareModal } from "../../hooks/ui/useAndroidKeyboardAwareModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function ServiceRatingModal({
	visible,
	serviceType = "visit", // "ambulance", "bed", "visit"
	title = "Rate your service",
	subtitle = null,
	serviceDetails = null, // { provider, hospital, duration, etc. }
	onClose,
	onSubmit,
}) {
	const { isDarkMode } = useTheme();
	const [rating, setRating] = useState(0);
	const [comment, setComment] = useState("");

	const { modalHeight, keyboardHeight, getKeyboardAvoidingViewProps, getScrollViewProps } = 
		useAndroidKeyboardAwareModal({ defaultHeight: SCREEN_HEIGHT * 0.85 });

	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!visible) return;
		setRating(0);
		setComment("");
		Animated.parallel([
			Animated.spring(slideAnim, {
				toValue: 0,
				tension: 70,
				friction: 12,
				useNativeDriver: true,
			}),
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 220,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, slideAnim, visible]);

	const colors = useMemo(() => ({
		bg: isDarkMode ? "#111827" : "#FFFFFF",
		text: isDarkMode ? "#F9FAFB" : "#0F172A",
		subtext: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.62)",
		card: isDarkMode ? "rgba(255,255,255,0.06)" : "#F8FAFC",
		border: isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
		accent: serviceType === "ambulance" ? "#DC2626" : serviceType === "bed" ? "#059669" : COLORS.brandPrimary,
	}), [isDarkMode, serviceType]);

	const close = useCallback(() => {
		Keyboard.dismiss();
		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: SCREEN_HEIGHT,
				duration: 220,
				useNativeDriver: true,
			}),
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 180,
				useNativeDriver: true,
			}),
		]).start(() => onClose?.());
	}, [fadeAnim, onClose, slideAnim]);

	const handleSubmit = useCallback(() => {
		if (rating < 1) return;
		onSubmit?.({ rating, comment: comment?.trim() || null, serviceType });
		close();
	}, [close, comment, onSubmit, rating, serviceType]);

	const stars = useMemo(() => [1, 2, 3, 4, 5], []);

	const getServiceIcon = () => {
		switch (serviceType) {
			case "ambulance": return "medical";
			case "bed": return "bed";
			default: return "calendar";
		}
	};

	return (
		<Modal visible={visible} transparent animationType="none" onRequestClose={close}>
			<View style={styles.container}>
				<Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
					<Pressable
						style={styles.backdropPress}
						onPress={() => {
							if (keyboardHeight > 0) {
								Keyboard.dismiss();
								return;
							}
							close();
						}}
					/>
					<BlurView intensity={30} tint={isDarkMode ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
				</Animated.View>

				<KeyboardAvoidingView {...getKeyboardAvoidingViewProps()}>
					<Animated.View
						style={[
							styles.sheet,
							{ transform: [{ translateY: slideAnim }], backgroundColor: colors.bg },
						]}
					>
						<View
							style={[
								styles.indicator,
								{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.20)" : "#E5E7EB" },
							]}
						/>

						<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
							{/* Service Header */}
							<View style={styles.serviceHeader}>
								<View style={[styles.iconContainer, { backgroundColor: `${colors.accent}15` }]}>
									<Ionicons name={getServiceIcon()} size={32} color={colors.accent} />
								</View>
								<View style={styles.headerText}>
									<Text style={[styles.title, { color: colors.text }]}>{title}</Text>
									{subtitle && (
										<Text style={[styles.subtitle, { color: colors.subtext }]}>{subtitle}</Text>
									)}
								</View>
							</View>

							{/* Service Details */}
							{serviceDetails && (
								<View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
									{serviceDetails.provider && (
										<View style={styles.detailRow}>
											<Ionicons name="person" size={16} color={colors.subtext} />
											<Text style={[styles.detailText, { color: colors.text }]}>
												{serviceDetails.provider}
											</Text>
										</View>
									)}
									{serviceDetails.hospital && (
										<View style={styles.detailRow}>
											<Ionicons name="business" size={16} color={colors.subtext} />
											<Text style={[styles.detailText, { color: colors.text }]}>
												{serviceDetails.hospital}
											</Text>
										</View>
									)}
									{serviceDetails.duration && (
										<View style={styles.detailRow}>
											<Ionicons name="time" size={16} color={colors.subtext} />
											<Text style={[styles.detailText, { color: colors.text }]}>
												{serviceDetails.duration}
											</Text>
										</View>
									)}
								</View>
							)}

							{/* Rating Section */}
							<View style={[styles.ratingSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
								<Text style={[styles.sectionTitle, { color: colors.text }]}>
									How was your {serviceType === "ambulance" ? "emergency response" : serviceType === "bed" ? "hospital stay" : "visit"}?
								</Text>
								<View style={styles.starsRow}>
									{stars.map((s) => {
										const active = s <= rating;
										return (
											<Pressable
												key={s}
												onPress={() => {
													Keyboard.dismiss();
													setRating(s);
												}}
												style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
											>
												<Ionicons
													name={active ? "star" : "star-outline"}
													size={36}
													color={active ? colors.accent : colors.subtext}
												/>
											</Pressable>
										);
									})}
								</View>
								{rating > 0 && (
									<Text style={[styles.ratingText, { color: colors.accent }]}>
										{rating === 5 ? "Excellent!" : rating === 4 ? "Good" : rating === 3 ? "Okay" : rating === 2 ? "Poor" : "Very Poor"}
									</Text>
								)}
							</View>

							{/* Feedback Section */}
							<View style={[styles.feedbackSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
								<Text style={[styles.sectionTitle, { color: colors.text }]}>
									Tell us more (optional)
								</Text>
								<TextInput
									value={comment}
									onChangeText={setComment}
									placeholder="Share your experience to help us improve..."
									placeholderTextColor={colors.subtext}
									style={[
										styles.input,
										{
											color: colors.text,
											borderColor: colors.border,
											backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "#FFFFFF",
										},
									]}
									multiline
									textAlignVertical="top"
								/>
							</View>
						</ScrollView>

						{/* Actions */}
						<View style={styles.actions}>
							<Pressable
								onPress={() => {
									if (keyboardHeight > 0) {
										Keyboard.dismiss();
										return;
									}
									close();
								}}
								style={({ pressed }) => [
									styles.secondaryBtn,
									{ borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
								]}
							>
								<Text style={[styles.secondaryText, { color: colors.text }]}>Skip</Text>
							</Pressable>
							<Pressable
								onPress={handleSubmit}
								disabled={rating < 1}
								style={({ pressed }) => [
									styles.primaryBtn,
									{
										backgroundColor: colors.accent,
										opacity: rating < 1 ? 0.45 : pressed ? 0.85 : 1,
									},
								]}
							>
								<Text style={styles.primaryText}>Submit</Text>
							</Pressable>
						</View>
					</Animated.View>
				</KeyboardAvoidingView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: "flex-end" },
	backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
	backdropPress: { flex: 1 },
	sheet: {
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		paddingTop: 10,
		paddingHorizontal: 20,
		paddingBottom: 22,
		minHeight: 400,
		maxHeight: modalHeight,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -6 },
		shadowOpacity: 0.12,
		shadowRadius: 20,
		elevation: 20,
	},
	indicator: {
		width: 40,
		height: 5,
		borderRadius: 999,
		alignSelf: "center",
		marginBottom: 16,
	},
	scrollContent: { paddingBottom: 20 },
	serviceHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 20,
	},
	iconContainer: {
		width: 64,
		height: 64,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
	},
	headerText: { flex: 1 },
	title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
	subtitle: { marginTop: 4, fontSize: 14, color: "#64748B" },
	detailsCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 16,
		marginBottom: 16,
	},
	detailRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	detailRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	detailText: { marginLeft: 12, fontSize: 14, fontWeight: "500" },
	ratingSection: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 20,
		marginBottom: 16,
		alignItems: "center",
	},
	sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 16, textAlign: "center" },
	starsRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 12 },
	ratingText: { fontSize: 16, fontWeight: "600" },
	feedbackSection: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 20,
		marginBottom: 16,
	},
	input: {
		minHeight: 100,
		borderRadius: 12,
		borderWidth: 1,
		padding: 14,
		fontSize: 15,
	},
	actions: {
		flexDirection: "row",
		gap: 12,
		marginTop: 8,
	},
	secondaryBtn: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 14,
		paddingVertical: 14,
		alignItems: "center",
	},
	secondaryText: { fontSize: 15, fontWeight: "600" },
	primaryBtn: {
		flex: 1,
		borderRadius: 14,
		paddingVertical: 14,
		alignItems: "center",
	},
	primaryText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
