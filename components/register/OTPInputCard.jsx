import { useRef, useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

/**
 * OTPInputCard - iVisit
 * 6-digit OTP input with auto-focus and resend functionality
 * Used in both registration and login flows
 */
export default function OTPInputCard({ method, contact, onVerified }) {
	const { isDarkMode } = useTheme();
	const [otp, setOtp] = useState(["", "", "", "", "", ""]);
	const [timer, setTimer] = useState(60);
	const [canResend, setCanResend] = useState(false);

	const inputRefs = useRef([]);
	const shakeAnim = useRef(new Animated.Value(0)).current;
	const buttonScale = useRef(new Animated.Value(1)).current;

	const isComplete = otp.every((digit) => digit !== "");

    // Update OTP length if needed (e.g. from props or config)
    // Currently hardcoded to 6 as per standard Supabase OTP.
    // If you receive an 8 digit code, we need to update the state initialization and UI mapping.
    // For now, let's keep it 6. If the user reports 8, we can change the initial state to 8 empty strings.

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

	const handleOTPChange = (value, index) => {
		const digit = value.slice(-1);
		if (!/^\d*$/.test(digit)) return;

		const newOtp = [...otp];
		newOtp[index] = digit;
		setOtp(newOtp);

		// Auto-focus next input
		if (digit && index < 5) {
			inputRefs.current[index + 1]?.focus();
		}

		// Auto-submit when complete
		if (newOtp.every((d) => d !== "")) {
			const otpString = newOtp.join("");
			handleVerify(otpString);
		}
	};

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
		if (otpString.length !== 6) {
			triggerShake();
			return;
		}

		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		onVerified?.(otpString);
	};

	const handleResend = () => {
		if (!canResend) return;

		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setTimer(60);
		setCanResend(false);
		setOtp(["", "", "", "", "", ""]);
		inputRefs.current[0]?.focus();
        // Propagate resend action to parent if needed, or re-trigger request in parent
        if (props.onResend) {
             props.onResend();
        }
	};

	const colors = {
		inputBg: isDarkMode ? COLORS.bgDarkAlt : "#F3F4F6",
		text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
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
							className="w-12 h-16 text-center text-2xl font-black rounded-xl"
							style={{
								backgroundColor: colors.inputBg,
								color: colors.text,
								borderWidth: digit ? 2 : 0,
								borderColor: digit ? COLORS.brandPrimary : "transparent",
							}}
							value={digit}
							onChangeText={(value) => handleOTPChange(value, index)}
							onKeyPress={(e) => handleKeyPress(e, index)}
							keyboardType="number-pad"
							maxLength={1}
							selectTextOnFocus
							autoFocus={index === 0}
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
					disabled={!isComplete}
					className="h-16 rounded-2xl items-center justify-center"
					style={{
						backgroundColor: isComplete
							? COLORS.brandPrimary
							: isDarkMode
							? COLORS.bgDarkAlt
							: "#E5E7EB",
					}}
				>
					<Text
						className="text-base font-black tracking-[2px]"
						style={{ color: isComplete ? COLORS.bgLight : COLORS.textMuted }}
					>
						VERIFY
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
