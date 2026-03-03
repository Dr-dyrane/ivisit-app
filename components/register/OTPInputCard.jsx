import { useRef, useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

const OTP_LENGTH = 6;
const EMPTY_OTP = Array(OTP_LENGTH).fill("");
const getDigitsOnly = (value) => String(value ?? "").replace(/\D/g, "");

const sanitizeOtp = (value) =>
	getDigitsOnly(value).slice(0, OTP_LENGTH);

/**
 * OTPInputCard - iVisit
 * 6-digit OTP input with auto-focus and resend functionality
 * Used in both registration and login flows
 */
export default function OTPInputCard({ method, contact, onVerified, onResend, loading }) {
	const { isDarkMode } = useTheme();
	const [otp, setOtp] = useState(EMPTY_OTP);
	const [timer, setTimer] = useState(60);
	const [canResend, setCanResend] = useState(false);

	const inputRefs = useRef([]);
	const shakeAnim = useRef(new Animated.Value(0)).current;
	const buttonScale = useRef(new Animated.Value(1)).current;
	const clipboardAutofilledRef = useRef(false);

	const isComplete = otp.every((digit) => digit !== "");

	// Timer countdown
	useEffect(() => {
		if (timer > 0) {
			const interval = setInterval(() => {
				setTimer((prev) => prev - 1);
			}, 1000);
			return () => clearInterval(interval);
		} else {
			setCanResend(true);
		}
	}, [timer]);

	const handleKeyPress = (e, index) => {
		if (e.nativeEvent.key === "Backspace") {
			if (otp[index] === "" && index > 0) {
				inputRefs.current[index - 1]?.focus();
			}
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

	const handleVerify = (otpString) => {
		if (loading) return; // Prevent double submission

		if (otpString.length !== OTP_LENGTH) {
			triggerShake();
			return;
		}

		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		onVerified?.(otpString);
	};

	const applyOtpDigits = (rawValue, startIndex = 0, options = {}) => {
		const { autoVerify = true, autoFocus = true } = options;
		const digits = sanitizeOtp(rawValue);
		if (!digits) return;

		const nextOtp = [...otp];
		for (let i = 0; i < digits.length; i += 1) {
			const targetIndex = startIndex + i;
			if (targetIndex >= OTP_LENGTH) break;
			nextOtp[targetIndex] = digits[i];
		}

		setOtp(nextOtp);

		const isCompleteCode = nextOtp.every((digit) => digit !== "");
		if (isCompleteCode && autoVerify) {
			handleVerify(nextOtp.join(""));
			return;
		}

		if (autoFocus) {
			const focusIndex = Math.min(startIndex + digits.length, OTP_LENGTH - 1);
			inputRefs.current[focusIndex]?.focus();
		}
	};

	const handleOTPChange = (value, index) => {
		const digits = sanitizeOtp(value);

		if (!digits) {
			const newOtp = [...otp];
			newOtp[index] = "";
			setOtp(newOtp);
			return;
		}

		// Supports full-code paste from any field (especially first field).
		if (digits.length > 1) {
			applyOtpDigits(digits, index);
			return;
		}

		const newOtp = [...otp];
		newOtp[index] = digits;
		setOtp(newOtp);

		if (index < OTP_LENGTH - 1) {
			inputRefs.current[index + 1]?.focus();
		}

		if (newOtp.every((digit) => digit !== "")) {
			handleVerify(newOtp.join(""));
		}
	};

	const tryAutofillFromClipboard = async () => {
		if (loading || clipboardAutofilledRef.current) return;
		if (otp.some((digit) => digit !== "")) return;

		try {
			const clipboardValue = await Clipboard.getStringAsync();
			const digitsOnly = getDigitsOnly(clipboardValue);
			if (digitsOnly.length !== OTP_LENGTH) return;

			clipboardAutofilledRef.current = true;
			applyOtpDigits(digitsOnly, 0, { autoVerify: true, autoFocus: false });
		} catch (error) {
			console.warn("Clipboard OTP autofill failed:", error?.message || error);
		}
	};

	const handleResend = () => {
		if (!canResend || loading) return;

		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setTimer(60);
		setCanResend(false);
		setOtp(EMPTY_OTP);
		clipboardAutofilledRef.current = false;
		inputRefs.current[0]?.focus();
		// Propagate resend action to parent if needed, or re-trigger request in parent
		if (onResend) {
			onResend();
		}
	};

	const colors = {
		// [AUTH_POLISH] Glassmorphism-inspired backgrounds
		inputBg: isDarkMode ? "rgba(22, 27, 34, 0.8)" : "rgba(243, 244, 246, 0.8)",
		text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
		border: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
	};

	return (
		<View>
			{/* Instruction */}
			<Text
				className="text-sm font-medium mb-6"
				style={{ color: COLORS.textMuted }}
			>
				We sent a verification code to{" "}
				<Text className="font-black" style={{ color: colors.text }}>
					{contact}
				</Text>
			</Text>

			{/* OTP Input Boxes */}
			<Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
				<View className="flex-row justify-between mb-6">
					{otp.map((digit, index) => (
						<TextInput
							key={index}
							ref={(ref) => (inputRefs.current[index] = ref)}
							className="w-12 h-16 text-center text-2xl font-black rounded-2xl"
							style={{
								backgroundColor: colors.inputBg,
								color: colors.text,
								borderWidth: 2,
								borderColor: digit ? COLORS.brandPrimary : colors.border,
							}}
							value={digit}
							onChangeText={(value) => handleOTPChange(value, index)}
							onKeyPress={(e) => handleKeyPress(e, index)}
							onFocus={() => {
								if (index === 0) {
									void tryAutofillFromClipboard();
								}
							}}
							keyboardType="number-pad"
							maxLength={index === 0 ? OTP_LENGTH : 1}
							selectTextOnFocus
							autoFocus={index === 0}
							autoComplete={index === 0 ? (Platform.OS === "android" ? "sms-otp" : "one-time-code") : "off"}
							textContentType={index === 0 ? "oneTimeCode" : undefined}
							selectionColor={COLORS.brandPrimary}
						/>
					))}
				</View>
			</Animated.View>

			{/* Resend Section */}
			<View className="flex-row items-center justify-center mb-6">
				{!canResend ? (
					<Text
						className="text-sm font-medium"
						style={{ color: COLORS.textMuted }}
					>
						Resend code in{" "}
						<Text className="font-black" style={{ color: COLORS.brandPrimary }}>
							{timer}s
						</Text>
					</Text>
				) : (
					<Pressable onPress={handleResend} className="flex-row items-center">
						<Ionicons
							name="refresh"
							size={16}
							color={COLORS.brandPrimary}
							style={{ marginRight: 6 }}
						/>
						<Text
							className="text-sm font-black"
							style={{ color: COLORS.brandPrimary }}
						>
							Resend Code
						</Text>
					</Pressable>
				)}
			</View>

			{/* Verify Button */}
			<Animated.View style={{ transform: [{ scale: buttonScale }] }}>
				<Pressable
					onPress={() => handleVerify(otp.join(""))}
					onPressIn={() => {
						Animated.spring(buttonScale, {
							toValue: 0.96,
							useNativeDriver: true,
						}).start();
					}}
					onPressOut={() => {
						Animated.spring(buttonScale, {
							toValue: 1,
							friction: 3,
							useNativeDriver: true,
						}).start();
					}}
					disabled={!isComplete || loading}
					className="h-16 rounded-2xl items-center justify-center"
					style={{
						backgroundColor: isComplete && !loading
							? COLORS.brandPrimary
							: isDarkMode
								? COLORS.bgDarkAlt
								: "#E5E7EB",
					}}
				>
					<Text
						className="text-base font-black tracking-[2px]"
						style={{ color: isComplete && !loading ? COLORS.bgLight : COLORS.textMuted }}
					>
						{loading ? "VERIFYING..." : "VERIFY"}
					</Text>
				</Pressable>
			</Animated.View>

			<Text
				className="mt-4 text-xs text-center leading-5"
				style={{ color: COLORS.textMuted }}
			>
				Enter the 6-digit code we sent to verify your{" "}
				{method === "phone" ? "phone number" : "email address"}.
			</Text>
		</View>
	);
}
