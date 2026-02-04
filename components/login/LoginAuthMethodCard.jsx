// components/login/LoginAuthMethodCard.jsx

/**
 * LoginAuthMethodCard
 * Choose between OTP or Password login - iVisit UI/UX
 */

import { useRef, useEffect, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export default function LoginAuthMethodCard({ onSelect, disabled = false }) {
	const { isDarkMode } = useTheme();
	const [selectedMethod, setSelectedMethod] = useState(null);

	const colors = {
		primary: COLORS.brandPrimary,
		text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
		subtitle: isDarkMode ? "#94A3B8" : COLORS.textMuted,
		card: isDarkMode ? COLORS.bgDark : "#F3E7E7",
		border: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
	};

	const headerAnim = useRef(new Animated.Value(20)).current;
	const headerOpacity = useRef(new Animated.Value(0)).current;
	const listAnim = useRef(new Animated.Value(30)).current;
	const listOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.spring(headerAnim, {
				toValue: 0,
				tension: 50,
				friction: 10,
				useNativeDriver: true,
			}),
			Animated.timing(headerOpacity, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
		]).start();

		// [MEMORY-LEAK-FIX] Store timer for cleanup
		const listTimer = setTimeout(() => {
			Animated.parallel([
				Animated.spring(listAnim, {
					toValue: 0,
					tension: 40,
					friction: 8,
					useNativeDriver: true,
				}),
				Animated.timing(listOpacity, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true,
				}),
			]).start();
		}, 150);

		return () => clearTimeout(listTimer);
	}, []);

	const AuthMethodButton = ({ type, icon, label, description }) => {
		const scale = useRef(new Animated.Value(1)).current;
		const isSelected = selectedMethod === type;

		const handlePress = () => {
			if (disabled || isSelected) {
				console.log(
					"[v0] LoginAuthMethodCard: Click ignored - disabled or already selected"
				);
				return;
			}

			console.log("[v0] LoginAuthMethodCard: Selected", type);
			setSelectedMethod(type);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

			Animated.sequence([
				Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }),
				Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
			]).start();

			setTimeout(() => {
				onSelect(type);
			}, 150);
		};

		return (
			<Animated.View style={{ transform: [{ scale }] }}>
				<Pressable
					onPress={handlePress}
					disabled={disabled || isSelected}
					style={{
						backgroundColor: colors.card,
						borderRadius: 36,
						padding: 24,
						flexDirection: "row",
						alignItems: "center",
						marginBottom: 16,
						shadowColor: "#000",
						shadowOffset: { width: 0, height: 4 },
						shadowOpacity: isDarkMode ? 0 : 0.03,
						shadowRadius: 10,
						opacity: (disabled || isSelected) && !isSelected ? 0.5 : 1,
					}}
				>
					<View
						style={{
							backgroundColor: colors.primary,
							width: 64,
							height: 64,
							borderRadius: 14,
							alignItems: "center",
							justifyContent: "center",
							marginRight: 20,
						}}
					>
						<Ionicons name={icon} size={28} color="white" />
					</View>

					<View style={{ flex: 1 }}>
						<Text
							style={{
								color: colors.text,
								fontSize: 20,
								fontWeight: "900",
								letterSpacing: -1.0,
							}}
						>
							{label}
						</Text>
						<Text
							style={{ color: colors.subtitle, fontSize: 14, marginTop: 4, fontWeight: "500" }}
						>
							{description}
						</Text>
					</View>

					<View
						style={{
							width: 40,
							height: 40,
							borderRadius: 14,
							backgroundColor: isDarkMode
								? "rgba(255,255,255,0.05)"
								: "rgba(0,0,0,0.03)",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Ionicons
							name="chevron-forward"
							size={18}
							color={colors.subtitle}
						/>
					</View>
				</Pressable>
			</Animated.View>
		);
	};

	return (
		<View>
			<Animated.Text
				style={{
					fontSize: 44,
					fontWeight: "900",
					lineHeight: 48,
					marginBottom: 32,
					color: colors.text,
					letterSpacing: -1.5,
					opacity: headerOpacity,
					transform: [{ translateY: headerAnim }],
				}}
			>
				Choose Your{"\n"}
				<Text style={{ color: colors.primary }}>Access Method</Text>
			</Animated.Text>

			<Animated.View
				style={{ opacity: listOpacity, transform: [{ translateY: listAnim }] }}
			>
				<AuthMethodButton
					type="otp"
					icon="shield-checkmark"
					label="Secure Code"
					description="One-time verification code"
				/>
				<AuthMethodButton
					type="password"
					icon="key"
					label="Password"
					description="Your secure password"
				/>
			</Animated.View>
		</View>
	);
}
