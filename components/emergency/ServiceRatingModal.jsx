// components/emergency/ServiceRatingModal.jsx

/**
 * ServiceRatingModal - Apple-inspired redesign
 * Clean, minimal design following app's no-border rule and theme system
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
	Modal,
	View,
	Text,
	Pressable,
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
		useAndroidKeyboardAwareModal({ 
			defaultHeight: SCREEN_HEIGHT,
			maxHeightPercentage: 0.9 
		});

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
		bg: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
		text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
		subtext: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
		card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
		accent: COLORS.brandPrimary,
	}), [isDarkMode]);

	const close = useCallback(() => {
		Keyboard.dismiss();
		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: SCREEN_HEIGHT,
				duration: 300,
				useNativeDriver: true,
			}),
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 250,
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

	const getServiceTypeLabel = () => {
		switch (serviceType) {
			case "ambulance": return "emergency response";
			case "bed": return "hospital stay";
			default: return "visit";
		}
	};

	const getRatingText = () => {
		switch (rating) {
			case 5: return "Excellent!";
			case 4: return "Good";
			case 3: return "Okay";
			case 2: return "Poor";
			case 1: return "Very Poor";
			default: return "";
		}
	};

	return (
		<Modal visible={visible} transparent animationType="none" onRequestClose={close}>
			<View className="flex-1">
				<Animated.View 
					style={{ opacity: fadeAnim }} 
					className="absolute inset-0 bg-black/50"
				>
					<Pressable 
						className="flex-1" 
						onPress={() => {
							if (keyboardHeight > 0) {
								Keyboard.dismiss();
								return;
							}
							close();
						}} 
					/>
					<BlurView 
						intensity={20} 
						tint={isDarkMode ? "dark" : "light"} 
						style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
					/>
				</Animated.View>

				<Animated.View
					style={{
						transform: [{ translateY: slideAnim }],
						backgroundColor: colors.bg,
						height: modalHeight,
					}}
					className="rounded-t-[40px] px-6 pt-4"
				>
					{/* Handle */}
					<View className="w-12 h-1.5 bg-gray-500/20 rounded-full self-center mb-8" />

					<ScrollView 
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingBottom: 40 }}
						keyboardShouldPersistTaps="handled"
					>
						{/* Header */}
						<View className="items-center mb-8">
							<View 
								className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
								style={{ backgroundColor: `${colors.accent}15` }}
							>
								<Ionicons name={getServiceIcon()} size={32} color={colors.accent} />
								</View>
								<Text 
									className="text-3xl font-black tracking-tighter text-center mb-2"
									style={{ color: colors.text }}
								>
									{title}
								</Text>
								{subtitle && (
									<Text 
										className="text-base text-center"
										style={{ color: colors.subtext }}
									>
										{subtitle}
									</Text>
								)}
							</View>

							{/* Service Details */}
							{serviceDetails && (
								<View 
									className="rounded-2xl p-4 mb-6"
									style={{ backgroundColor: colors.card }}
								>
									{serviceDetails.provider && (
										<View className="flex-row items-center mb-3">
											<Ionicons name="person" size={16} color={colors.subtext} style={{ marginRight: 12 }} />
											<Text 
												className="text-base font-medium"
												style={{ color: colors.text }}
											>
												{serviceDetails.provider}
											</Text>
										</View>
									)}
									{serviceDetails.hospital && (
										<View className="flex-row items-center mb-3">
											<Ionicons name="business" size={16} color={colors.subtext} style={{ marginRight: 12 }} />
											<Text 
												className="text-base font-medium"
												style={{ color: colors.text }}
											>
												{serviceDetails.hospital}
											</Text>
										</View>
									)}
									{serviceDetails.duration && (
										<View className="flex-row items-center">
											<Ionicons name="time" size={16} color={colors.subtext} style={{ marginRight: 12 }} />
											<Text 
												className="text-base font-medium"
												style={{ color: colors.text }}
											>
												{serviceDetails.duration}
											</Text>
										</View>
									)}
								</View>
							)}

							{/* Rating Section */}
							<View className="mb-6">
								<Text 
									className="text-lg font-semibold text-center mb-6"
									style={{ color: colors.text }}
								>
									How was your {getServiceTypeLabel()}?
								</Text>
								
								{/* Stars */}
								<View className="flex-row justify-center mb-4">
									{stars.map((star) => {
										const isActive = star <= rating;
										return (
											<Pressable
												key={star}
												onPress={() => {
													Keyboard.dismiss();
													setRating(star);
												}}
												className="p-2"
												style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
											>
												<Ionicons
													name={isActive ? "star" : "star-outline"}
													size={40}
													color={isActive ? colors.accent : colors.subtext}
												/>
											</Pressable>
										);
									})}
								</View>

								{/* Rating Text */}
								{rating > 0 && (
									<Text 
										className="text-center text-lg font-medium mb-2"
										style={{ color: colors.accent }}
									>
										{getRatingText()}
									</Text>
								)}
							</View>

							{/* Feedback Section */}
							<View className="mb-8">
								<Text 
									className="text-base font-medium mb-3"
									style={{ color: colors.text }}
								>
									Tell us more (optional)
								</Text>
								<TextInput
									value={comment}
									onChangeText={setComment}
									placeholder="Share your experience to help us improve..."
									placeholderTextColor={colors.subtext}
									className="rounded-2xl p-4 text-base"
									style={{
										color: colors.text,
										backgroundColor: colors.card,
										height: 100,
										textAlignVertical: 'top',
									}}
									multiline
								/>
							</View>

							{/* Actions */}
							<View className="flex-row gap-3">
								<Pressable
									onPress={() => {
										if (keyboardHeight > 0) {
											Keyboard.dismiss();
											return;
										}
										close();
									}}
									className="flex-1 h-14 rounded-2xl items-center justify-center"
									style={{ backgroundColor: colors.card }}
								>
									<Text 
										className="text-base font-semibold"
										style={{ color: colors.text }}
									>
										Skip
									</Text>
								</Pressable>
								
								<Pressable
									onPress={handleSubmit}
									disabled={rating < 1}
									className="flex-1 h-14 rounded-2xl items-center justify-center"
									style={{
										backgroundColor: rating >= 1 ? colors.accent : colors.card,
										opacity: rating >= 1 ? 1 : 0.5,
									}}
								>
									<Text 
										className="text-base font-semibold"
										style={{ color: rating >= 1 ? COLORS.bgLight : colors.text }}
									>
										Submit
									</Text>
								</Pressable>
							</View>
						</ScrollView>
					</Animated.View>
			</View>
		</Modal>
	);
}
