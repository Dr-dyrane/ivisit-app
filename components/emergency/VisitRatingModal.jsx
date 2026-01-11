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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function VisitRatingModal({
	visible,
	title = "Rate your visit",
	subtitle = null,
	onClose,
	onSubmit,
}) {
	const { isDarkMode } = useTheme();
	const [rating, setRating] = useState(0);
	const [comment, setComment] = useState("");
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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

	useEffect(() => {
		const show = Keyboard.addListener("keyboardDidShow", () =>
			setIsKeyboardVisible(true)
		);
		const hide = Keyboard.addListener("keyboardDidHide", () =>
			setIsKeyboardVisible(false)
		);
		return () => {
			show.remove();
			hide.remove();
		};
	}, []);

	const colors = useMemo(() => {
		return {
			bg: isDarkMode ? "#111827" : "#FFFFFF",
			text: isDarkMode ? "#F9FAFB" : "#0F172A",
			subtext: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.62)",
			card: isDarkMode ? "rgba(255,255,255,0.06)" : "#F1F5F9",
			border: isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
		};
	}, [isDarkMode]);

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
		onSubmit?.({ rating, comment: comment?.trim() || null });
		close();
	}, [close, comment, onSubmit, rating]);

	const stars = useMemo(() => [1, 2, 3, 4, 5], []);

	return (
		<Modal visible={visible} transparent animationType="none" onRequestClose={close}>
			<View style={styles.container}>
				<Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
					<Pressable
						style={styles.backdropPress}
						onPress={() => {
							if (isKeyboardVisible) {
								Keyboard.dismiss();
								return;
							}
							close();
						}}
					/>
					<BlurView intensity={30} tint={isDarkMode ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
				</Animated.View>

				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
				>
					<Animated.View
						style={[
							styles.sheet,
							{ transform: [{ translateY: slideAnim }], backgroundColor: colors.bg },
						]}
					>
						<View
							style={[
								styles.indicator,
								{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.20)"
										: "#E5E7EB",
								},
							]}
						/>

						<View style={styles.header}>
							<Text style={[styles.title, { color: colors.text }]}>{title}</Text>
							{subtitle ? (
								<Text
									style={[styles.subtitle, { color: colors.subtext }]}
									numberOfLines={2}
								>
									{subtitle}
								</Text>
							) : null}
						</View>

						<Pressable
							style={{ flex: 1 }}
							onPress={() => {
								if (isKeyboardVisible) Keyboard.dismiss();
							}}
						>
						<View
							style={[
								styles.card,
								{ backgroundColor: colors.card, borderColor: colors.border },
							]}
						>
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
												size={28}
												color={active ? COLORS.brandPrimary : colors.subtext}
											/>
										</Pressable>
									);
								})}
							</View>

							<TextInput
								value={comment}
								onChangeText={setComment}
								placeholder="Optional feedback"
								placeholderTextColor={
									isDarkMode
										? "rgba(255,255,255,0.45)"
										: "rgba(15,23,42,0.35)"
								}
								style={[
									styles.input,
									{
										color: colors.text,
										borderColor: colors.border,
										backgroundColor: isDarkMode
											? "rgba(255,255,255,0.04)"
											: "#FFFFFF",
									},
								]}
								multiline
								textAlignVertical="top"
							/>
						</View>
						</Pressable>

						<View style={styles.actions}>
							<Pressable
								onPress={() => {
									if (isKeyboardVisible) {
										Keyboard.dismiss();
										return;
									}
									close();
								}}
								style={({ pressed }) => [
									styles.secondaryBtn,
									{
										borderColor: colors.border,
										opacity: pressed ? 0.85 : 1,
									},
								]}
							>
								<Text style={[styles.secondaryText, { color: colors.text }]}>
									Not now
								</Text>
							</Pressable>
							<Pressable
								onPress={handleSubmit}
								disabled={rating < 1}
								style={({ pressed }) => [
									styles.primaryBtn,
									{
										backgroundColor: COLORS.brandPrimary,
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
	container: {
		flex: 1,
		justifyContent: "flex-end",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.45)",
	},
	backdropPress: {
		flex: 1,
	},
	sheet: {
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		paddingTop: 10,
		paddingHorizontal: 18,
		paddingBottom: 22,
		minHeight: 360,
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
		marginBottom: 14,
	},
	header: {
		alignItems: "center",
		marginBottom: 14,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	subtitle: {
		marginTop: 6,
		fontSize: 14,
		textAlign: "center",
	},
	card: {
		borderRadius: 18,
		borderWidth: 1,
		padding: 14,
	},
	starsRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 10,
		marginBottom: 12,
	},
	input: {
		minHeight: 110,
		borderRadius: 14,
		borderWidth: 1,
		padding: 12,
		fontSize: 14,
	},
	actions: {
		flexDirection: "row",
		gap: 12,
		marginTop: 14,
	},
	secondaryBtn: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 14,
		paddingVertical: 12,
		alignItems: "center",
	},
	secondaryText: {
		fontSize: 15,
		fontWeight: "600",
	},
	primaryBtn: {
		flex: 1,
		borderRadius: 14,
		paddingVertical: 12,
		alignItems: "center",
	},
	primaryText: {
		fontSize: 15,
		fontWeight: "700",
		color: "#FFFFFF",
	},
});
