// components/SignUpMethodCard.js

"use client";

/**
 * SignUpMethodCard - iVisit Registration Method Selection
 * Displays phone and email signup options
 */

import { useRef, useEffect } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export default function SignUpMethodCard({ onSelect }) {
	const { isDarkMode } = useTheme();

	const colors = {
		primary: COLORS.brandPrimary,
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		subtitle: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#1E293B" : "#F3E7E7",
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

	const MethodButton = ({ type, icon, label, description }) => {
		const scale = useRef(new Animated.Value(1)).current;

		const handlePress = () => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			Animated.sequence([
				Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }),
				Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
			]).start();
			onSelect(type);
		};

		return (
			<Animated.View style={{ transform: [{ scale }] }}>
				<Pressable
					onPress={handlePress}
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
				Ready for{"\n"}
				<Text style={{ color: colors.primary }}>Better Care?</Text>
			</Animated.Text>

			<Animated.View
				style={{ opacity: listOpacity, transform: [{ translateY: listAnim }] }}
			>
				<MethodButton
					type="phone"
					icon="call"
					label="Phone Number"
					description="Immediate medical dispatch"
				/>
				<MethodButton
					type="email"
					icon="mail"
					label="Email Address"
					description="Official records & verification"
				/>
			</Animated.View>
		</View>
	);
}
