import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	Modal,
	Animated,
	Pressable,
	KeyboardAvoidingView,
	Platform,
	Dimensions,
	ScrollView,
	Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginModal({
	visible,
	onClose,
	onBack,
	title,
	subtitle,
	children,
	showBack = false,
	stepText = null,
	keyboardOffsetExtra = 90,
}) {
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;
	const insets = useSafeAreaInsets();
	const { isDarkMode } = useTheme();
	const closeScale = useRef(new Animated.Value(1)).current;
	const backScale = useRef(new Animated.Value(1)).current;

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
		} else {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: SCREEN_HEIGHT,
					duration: 240,
					useNativeDriver: true,
				}),
				Animated.timing(bgOpacity, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [visible]);

	const handleDismiss = () => {
		Keyboard.dismiss();
		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: SCREEN_HEIGHT,
				duration: 240,
				useNativeDriver: true,
			}),
			Animated.timing(bgOpacity, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}),
		]).start(onClose);
	};

	const colors = {
		bg: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
		text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={handleDismiss}
		>
			<View style={{ flex: 1, justifyContent: "flex-end" }}>
				<Animated.View
					style={{ opacity: bgOpacity }}
					className="absolute inset-0 bg-black/60"
				>
					<Pressable style={{ flex: 1 }} onPress={handleDismiss} />
				</Animated.View>

				<Animated.View
					style={{
						transform: [{ translateY: slideAnim }],
						backgroundColor: colors.bg,
						height: SCREEN_HEIGHT * 0.85,
					}}
					className="rounded-t-[32px] px-6 pt-4 shadow-2xl"
				>
					<View className="w-12 h-1.5 bg-gray-500/20 rounded-full self-center mb-6" />

					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : "height"}
						keyboardVerticalOffset={insets.bottom + keyboardOffsetExtra}
						className="flex-1"
					>
						<ScrollView
							contentContainerStyle={{
								flexGrow: 1,
								paddingBottom: insets.bottom + keyboardOffsetExtra,
							}}
							keyboardShouldPersistTaps="handled"
						>
							<View className="flex-row items-start mb-6">
								{showBack && (
									<Animated.View
										style={{
											transform: [{ scale: backScale }],
											marginRight: 12,
										}}
									>
										<Pressable
											onPressIn={() =>
												Animated.spring(backScale, {
													toValue: 0.94,
													useNativeDriver: true,
												}).start()
											}
											onPressOut={() =>
												Animated.spring(backScale, {
													toValue: 1,
													friction: 4,
													useNativeDriver: true,
												}).start()
											}
											onPress={() => {
												onBack && onBack();
											}}
											className="p-2 mr-4 rounded-full bg-gray-200/10"
										>
											<Ionicons
												name="arrow-back"
												size={20}
												color={colors.text}
											/>
										</Pressable>
									</Animated.View>
								)}

								<View className="flex-1">
									{stepText && (
										<Text className="text-[10px] tracking-[3px] mb-2 uppercase text-red-800 font-black">
											{stepText}
										</Text>
									)}
									{stepText && (
										<Text
											className="text-[10px] tracking-[3px] mb-2 uppercase font-black"
											style={{ color: COLORS.brandPrimary }}
										>
											{stepText}
										</Text>
									)}
									{title && (
										<Text
											className="text-2xl font-black"
											style={{ color: colors.text }}
										>
											{title}
										</Text>
									)}
									{subtitle && (
										<Text
											className="text-sm mt-2"
											style={{ color: COLORS.textMuted }}
										>
											{subtitle}
										</Text>
									)}
								</View>

								<Animated.View style={{ transform: [{ scale: closeScale }] }}>
									<Pressable
										onPressIn={() =>
											Animated.spring(closeScale, {
												toValue: 0.94,
												useNativeDriver: true,
											}).start()
										}
										onPressOut={() =>
											Animated.spring(closeScale, {
												toValue: 1,
												friction: 4,
												useNativeDriver: true,
											}).start()
										}
										onPress={handleDismiss}
										className="p-2 bg-gray-200/10 rounded-full"
									>
										<Ionicons name="close" size={20} color={colors.text} />
									</Pressable>
								</Animated.View>
							</View>

							<View className="flex-1">{children}</View>
						</ScrollView>
					</KeyboardAvoidingView>
				</Animated.View>
			</View>
		</Modal>
	);
}
