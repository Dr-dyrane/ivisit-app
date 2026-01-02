// components/register/AuthInputModal.jsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	Modal,
	Animated,
	Pressable,
	KeyboardAvoidingView,
	Platform,
	Dimensions,
	Keyboard,
	PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import * as Haptics from "expo-haptics";
import AuthInputContent from "./AuthInputContent";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * AuthInputModal
 * Full-screen modal for phone/email authentication
 * Animations: slide-in sheet, backdrop fade, pan-to-dismiss, CTA button scaling
 * Props:
 * - visible: boolean -> controls modal visibility
 * - type: 'phone' | 'email' -> input type
 * - onClose: function -> called when modal is closed
 */
export default function AuthInputModal({ visible, type, onClose }) {
	const { isDarkMode } = useTheme();
	const [inputValue, setInputValue] = useState("");

	/** Animation references */
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;
	const panY = useRef(new Animated.Value(0)).current;
	const buttonScale = useRef(new Animated.Value(0.8)).current;

	/** Theme colors */
	const colors = {
		sheet: isDarkMode ? "#0D1117" : "#FFFFFF",
		border: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
	};

	/** Animate modal entrance */
	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					tension: 45,
					friction: 10,
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

	/** Animate CTA button scaling when typing */
	useEffect(() => {
		Animated.spring(buttonScale, {
			toValue: inputValue.length > 3 ? 1 : 0.8,
			useNativeDriver: true,
		}).start();
	}, [inputValue]);

	/** Handle modal dismissal */
	const handleDismiss = () => {
		Keyboard.dismiss();
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
		]).start(onClose);
	};

	/** Pan-to-dismiss gesture */
	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onPanResponderMove: (_, gestureState) => {
				if (gestureState.dy > 0) panY.setValue(gestureState.dy);
			},
			onPanResponderRelease: (_, gestureState) => {
				if (gestureState.dy > 120) handleDismiss();
				else
					Animated.spring(panY, {
						toValue: 0,
						friction: 8,
						useNativeDriver: true,
					}).start();
			},
		})
	).current;

	/** CTA submission handler */
	const handleSubmit = () => {
		if (inputValue.length > 3) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			console.log("Proceed to OTP with:", inputValue);
		}
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={handleDismiss}
		>
			<View className="flex-1 justify-end">
				{/* BACKDROP */}
				<Animated.View
					style={{ opacity: bgOpacity }}
					className="absolute inset-0 bg-black/70"
				>
					<Pressable className="flex-1" onPress={handleDismiss} />
				</Animated.View>

				{/* MODAL SHEET */}
				<Animated.View
					{...panResponder.panHandlers}
					style={{
						transform: [{ translateY: slideAnim }, { translateY: panY }],
						backgroundColor: colors.sheet,
						borderColor: colors.border,
						borderTopWidth: 1,
						height: SCREEN_HEIGHT * 0.75,
					}}
					className="rounded-t-[32px] shadow-2xl overflow-hidden"
				>
					{/* HEADER */}
					<View className="px-8 pt-4">
						<View className="w-10 h-1 bg-gray-500/20 rounded-full self-center mb-6" />

						<View className="flex-row justify-between items-center mb-2">
							<Text
								style={{
									color: colors.sheet === "#FFFFFF" ? "#0F172A" : "#FFFFFF",
								}}
								className="text-2xl font-black tracking-tighter"
							>
								{type === "phone" ? "Mobile Access" : "Secure Email"}
							</Text>
							<Pressable
								onPress={handleDismiss}
								className="w-8 h-8 rounded-full bg-gray-500/10 items-center justify-center"
							>
								<Ionicons
									name="close"
									size={18}
									color={isDarkMode ? "#AAA" : "#666"}
								/>
							</Pressable>
						</View>

						<Text className="text-gray-500 text-sm font-medium mb-8">
							Code will be sent for emergency verification.
						</Text>
					</View>

					{/* INPUT & CTA SECTION (modular, platform-specific) */}
					{Platform.OS === "ios" ? (
						<KeyboardAvoidingView behavior="padding" className="px-8">
							<AuthInputContent
								type={type}
								inputValue={inputValue}
								setInputValue={setInputValue}
								buttonScale={buttonScale}
								onSubmit={handleSubmit}
							/>
						</KeyboardAvoidingView>
					) : (
						<View className="px-8">
							<AuthInputContent
								type={type}
								inputValue={inputValue}
								setInputValue={setInputValue}
								buttonScale={buttonScale}
								onSubmit={handleSubmit}
							/>
						</View>
					)}
				</Animated.View>
			</View>
		</Modal>
	);
}
