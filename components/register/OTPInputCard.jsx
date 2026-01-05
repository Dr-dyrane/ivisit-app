"use client";

import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";

export default function OTPInputCard({ method, contact, onVerified, onResend, onEdit, resendCooldown = 30 }) {
	const { isDarkMode } = useTheme();
	const [otp, setOtp] = useState(["", "", "", "", "", ""]);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [loading, setLoading] = useState(false);
	const [cooldown, setCooldown] = useState(0);
	const inputRefs = useRef([]);

	const shakeAnim = useRef(new Animated.Value(0)).current;
	const buttonScale = useRef(new Animated.Value(1)).current;

	const colors = {
		inputBg: isDarkMode ? COLORS.bgDarkAlt : "#F3F4F6",
		text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
		border: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
	};

	useEffect(() => {
		inputRefs.current[0]?.focus();
	}, []);

	const handleChange = (text, index) => {
		const digit = text.replace(/[^0-9]/g, "");

		// Handle paste
		if (digit.length > 1) {
			const digits = digit.split("").slice(0, 6);
			const newOtp = [...otp];
			digits.forEach((d, i) => {
				if (index + i < 6) newOtp[index + i] = d;
			});
			setOtp(newOtp);
			const nextIndex = Math.min(index + digits.length, 5);
			inputRefs.current[nextIndex]?.focus();
			setFocusedIndex(nextIndex);
			Haptics.selectionAsync();
			return;
		}

		const newOtp = [...otp];
		newOtp[index] = digit;
		setOtp(newOtp);

		if (digit && index < 5) {
			inputRefs.current[index + 1]?.focus();
			setFocusedIndex(index + 1);
			Haptics.selectionAsync();
		}
	};

	const handleKeyPress = (e, index) => {
		if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
			inputRefs.current[index - 1]?.focus();
			setFocusedIndex(index - 1);
			Haptics.selectionAsync();
		}
	};

	const triggerShake = () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		Animated.sequence([
			Animated.timing(shakeAnim, {
				toValue: 10,
				duration: 50,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: -10,
				duration: 50,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: 10,
				duration: 50,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: 0,
				duration: 50,
				useNativeDriver: true,
			}),
		]).start();
	};

	const handleSubmit = async () => {
		const otpValue = otp.join("");
		console.log("[v0] OTP Submit pressed - Value:", otpValue);

		if (otpValue.length !== 6) {
			triggerShake();
			return;
		}

		setLoading(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		try {
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));
			console.log("[v0] OTP verified successfully:", otpValue);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			onVerified?.(otpValue);
		} catch (error) {
			console.error("[v0] OTP verification error:", error);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			triggerShake();
		} finally {
			setLoading(false);
		}
	};

	const handlePressIn = () => {
		Animated.spring(buttonScale, {
			toValue: 0.96,
			useNativeDriver: true,
		}).start();
	};

	const handlePressOut = () => {
		Animated.spring(buttonScale, {
			toValue: 1,
			friction: 3,
			useNativeDriver: true,
		}).start();
	};

	const isComplete = otp.every((digit) => digit !== "");

	useEffect(() => {
		let interval;
		if (cooldown > 0) {
			interval = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
		}
		return () => clearInterval(interval);
	}, [cooldown]);

	const handleResend = async () => {
		if (cooldown > 0) return;
		setLoading(true);
		try {
			// simulate resend
			await new Promise((r) => setTimeout(r, 700));
			onResend?.();
			setCooldown(resendCooldown);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		} catch (err) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View>
			<Text className="text-sm font-medium mb-6" style={{ color: COLORS.textMuted }}>
				We sent a 6-digit code to{"\n"}
				<Text className="font-black" style={{ color: colors.text }}>
					{contact}
				</Text>
			</Text>

			<Animated.View
				style={{ transform: [{ translateX: shakeAnim }] }}
				className="flex-row justify-between mb-8"
			>
				{otp.map((digit, index) => (
					<TextInput
						key={index}
						ref={(ref) => (inputRefs.current[index] = ref)}
						value={digit}
						onChangeText={(text) => handleChange(text, index)}
						onKeyPress={(e) => handleKeyPress(e, index)}
						onFocus={() => setFocusedIndex(index)}
						maxLength={1}
						keyboardType="number-pad"
						selectionColor={COLORS.brandPrimary}
						className="text-2xl font-black text-center rounded-2xl"
						style={{
							width: 48,
							height: 64,
							backgroundColor: colors.inputBg,
							color: colors.text,
							borderWidth: 2,
							borderColor: focusedIndex === index ? COLORS.brandPrimary : colors.border,
						}}
					/>
				))}
			</Animated.View>

			<Animated.View style={{ transform: [{ scale: buttonScale }] }}>
				<Pressable
					onPress={handleSubmit}
					onPressIn={handlePressIn}
					onPressOut={handlePressOut}
					disabled={!isComplete || loading}
					className="h-16 rounded-2xl items-center justify-center"
					style={{
						backgroundColor: isComplete
							? COLORS.brandPrimary
							: isDarkMode
							? COLORS.bgDarkAlt
							: "#E5E7EB",
						opacity: loading ? 0.7 : 1,
					}}
				>
					<Text
						className="text-base font-black tracking-[2px]"
						style={{ color: isComplete ? COLORS.bgLight : COLORS.textMuted }}
					>
						{loading ? "VERIFYING..." : "VERIFY CODE"}
					</Text>
				</Pressable>
			</Animated.View>

			<View className="mt-6">
				<Pressable onPress={handleResend} disabled={loading || cooldown > 0} className="mb-2">
					<Text className="text-center text-sm font-medium" style={{ color: COLORS.brandPrimary }}>
						{cooldown > 0 ? `Resend available in ${cooldown}s` : "Didn't receive a code? Resend"}
					</Text>
				</Pressable>

				{onEdit && (
					<Pressable onPress={onEdit} disabled={loading}>
						<Text className="text-center text-sm" style={{ color: COLORS.textMuted }}>
							Edit {method === "phone" ? "number" : "email"}
						</Text>
					</Pressable>
				)}
			</View>
		</View>
	);
}
