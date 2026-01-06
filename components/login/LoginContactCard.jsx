// components/login/LoginContactCard.jsx

/**
 * LoginContactCard
 * Choose between Email or Phone for contact - iVisit UI/UX
 */

import { useRef, useEffect, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export default function LoginContactCard({
	authMethod,
	onSelect,
	disabled = false,
}) {
	const { isDarkMode } = useTheme();
	const [selectedType, setSelectedType] = useState(null);

	const colors = {
		primary: COLORS.brandPrimary,
		text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
		subtitle: isDarkMode ? "#94A3B8" : COLORS.textMuted,
		card: isDarkMode ? COLORS.bgDark : "#F3E7E7",
	};

	const listAnim = useRef(new Animated.Value(30)).current;
	const listOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
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
	}, []);

	const ContactButton = ({ type, icon, label, description }) => {
		const scale = useRef(new Animated.Value(1)).current;
		const isSelected = selectedType === type;

		const handlePress = () => {
			if (disabled || isSelected) {
				console.log(
					"[v0] LoginContactCard: Click ignored - disabled or already selected"
				);
				return;
			}

			console.log("[v0] LoginContactCard: Selected", type);
			setSelectedType(type);
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
						borderRadius: 30,
						padding: 20,
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
							width: 56,
							height: 56,
							borderRadius: 16,
							alignItems: "center",
							justifyContent: "center",
							marginRight: 16,
						}}
					>
						<Ionicons name={icon} size={26} color="white" />
					</View>

					<View style={{ flex: 1 }}>
						<Text
							style={{
								color: colors.text,
								fontSize: 19,
								fontWeight: "900",
								letterSpacing: -0.5,
							}}
						>
							{label}
						</Text>
						<Text
							style={{ color: colors.subtitle, fontSize: 14, marginTop: 2 }}
						>
							{description}
						</Text>
					</View>

					<View
						style={{
							width: 36,
							height: 36,
							borderRadius: 12,
							backgroundColor: isDarkMode
								? "rgba(255,255,255,0.025)"
								: "rgba(0,0,0,0.025)",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Ionicons
							name="chevron-forward"
							size={16}
							color={colors.subtitle}
						/>
					</View>
				</Pressable>
			</Animated.View>
		);
	};

	const methodText = authMethod === "otp" ? "send your code" : "verify you";

	return (
		<View>
			<Text
				style={{
					fontSize: 28,
					fontWeight: "900",
					marginBottom: 24,
					color: colors.text,
					letterSpacing: -0.5,
				}}
			>
				How can we{"\n"}
				<Text style={{ color: colors.primary }}>{methodText}?</Text>
			</Text>

			<Animated.View
				style={{ opacity: listOpacity, transform: [{ translateY: listAnim }] }}
			>
				<ContactButton
					type="email"
					icon="mail"
					label="Email Address"
					description="Secure email verification"
				/>
				<ContactButton
					type="phone"
					icon="call"
					label="Phone Number"
					description="SMS verification"
				/>
			</Animated.View>
		</View>
	);
}
