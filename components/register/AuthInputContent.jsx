// components/register/AuthInputContent.jsx
"use client";

import React from "react";
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";

export default function AuthInputContent({
	type,
	inputValue,
	setInputValue,
	buttonScale,
	onSubmit,
}) {
	const { isDarkMode } = useTheme();
	const colors = {
		inputBg: isDarkMode ? "#161B22" : "#F3F4F6",
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		primary: "#86100E",
	};

	return (
		<View>
			{/* Label */}
			<Text
				className="text-[10px] font-black tracking-[2px] mb-3 ml-1"
				style={{ color: colors.primary }}
			>
				{type === "phone" ? "PHONE NUMBER" : "EMAIL ADDRESS"}
			</Text>

			{/* Input + CTA */}
			<View
				style={{ backgroundColor: colors.inputBg }}
				className="flex-row items-center rounded-2xl px-4 h-[72px] border border-gray-500/5"
			>
				<Ionicons
					name={type === "phone" ? "call-outline" : "mail-outline"}
					size={20}
					color={colors.primary}
					className="mr-3"
				/>

				<TextInput
					autoFocus
					selectionColor={colors.primary}
					keyboardType={type === "phone" ? "phone-pad" : "email-address"}
					placeholder={type === "phone" ? "000 000 0000" : "name@ivisit.com"}
					placeholderTextColor={isDarkMode ? "#444" : "#BBB"}
					value={inputValue}
					onChangeText={setInputValue}
					className="flex-1 text-xl font-bold ml-2"
					style={{ color: colors.text }}
				/>

				{/* Inline CTA */}
				<Animated.View
					style={{
						transform: [{ scale: buttonScale }],
						opacity: inputValue.length > 0 ? 1 : 0.4,
					}}
				>
					<Pressable
						onPress={onSubmit}
						disabled={inputValue.length <= 3}
						style={{ backgroundColor: colors.primary }}
						className="w-12 h-12 rounded-xl items-center justify-center"
					>
						<Ionicons name="arrow-forward" size={24} color="white" />
					</Pressable>
				</Animated.View>
			</View>

			{/* Verification reassurance */}
			<View className="flex-row items-center mt-6 ml-1">
				<Ionicons name="shield-checkmark" size={14} color="#10B981" />
				<Text className="text-[11px] text-gray-500 font-bold ml-2 tracking-tight">
					iVisit Encryption Active
				</Text>
			</View>
		</View>
	);
}
