import { useEffect, useRef } from "react";
import {
	View,
	Text,
	Modal,
	Animated,
	Pressable,
	Dimensions,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ComingSoonModal({ visible, onClose, featureName }) {
	const { isDarkMode } = useTheme();
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					tension: 65,
					friction: 11,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [visible]);

	const handleClose = () => {
		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: SCREEN_HEIGHT,
				duration: 250,
				useNativeDriver: true,
			}),
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}),
		]).start(() => onClose());
	};

	const colors = {
		bg: isDarkMode ? "#111827" : "#FFFFFF",
		text: isDarkMode ? "#F9FAFB" : "#111827",
		subtext: isDarkMode ? "#9CA3AF" : "#6B7280",
		card: isDarkMode ? "#1F2937" : "#F3F4F6",
	};

	return (
		<Modal visible={visible} transparent animationType="none">
			<View style={styles.container}>
				<Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
					<Pressable style={styles.backdropPress} onPress={handleClose} />
				</Animated.View>

				<Animated.View
					style={[
						styles.modalContainer,
						{
							transform: [{ translateY: slideAnim }],
							backgroundColor: colors.bg,
						},
					]}
				>
					<View style={styles.indicator} />

					<View style={styles.content}>
						<View
							style={[
								styles.iconContainer,
								{ backgroundColor: isDarkMode ? "#374151" : "#E5E7EB" },
							]}
						>
							<Ionicons
								name="rocket"
								size={32}
								color={COLORS.brandPrimary}
							/>
						</View>

						<Text style={[styles.title, { color: colors.text }]}>
							Coming Soon
						</Text>

						<Text style={[styles.description, { color: colors.subtext }]}>
							We're working hard to bring{" "}
							<Text style={{ fontWeight: "700", color: colors.text }}>
								{featureName}
							</Text>{" "}
							to iVisit. Stay tuned for updates in the next release!
						</Text>

						<Pressable
							style={[
								styles.button,
								{ backgroundColor: COLORS.brandPrimary },
							]}
							onPress={handleClose}
						>
							<Text style={styles.buttonText}>Got it!</Text>
						</Pressable>
					</View>
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "flex-end",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	backdropPress: {
		flex: 1,
	},
	modalContainer: {
		borderTopLeftRadius: 32,
		borderTopRightRadius: 32,
		padding: 24,
		paddingTop: 12,
		minHeight: 320,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 10,
	},
	indicator: {
		width: 40,
		height: 5,
		backgroundColor: "#E5E7EB",
		borderRadius: 100,
		alignSelf: "center",
		marginBottom: 24,
	},
	content: {
		alignItems: "center",
	},
	iconContainer: {
		width: 72,
		height: 72,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "800",
		marginBottom: 12,
		textAlign: "center",
	},
	description: {
		fontSize: 16,
		lineHeight: 24,
		textAlign: "center",
		marginBottom: 32,
		paddingHorizontal: 16,
	},
	button: {
		width: "100%",
		paddingVertical: 16,
		borderRadius: 16,
		alignItems: "center",
		shadowColor: COLORS.brandPrimary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	buttonText: {
		color: "white",
		fontSize: 17,
		fontWeight: "700",
	},
});
