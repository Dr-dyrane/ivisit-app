"use client";
import { View, Text, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme, ThemeMode } from "../contexts/ThemeContext";

export default function ThemeToggle({ showLabel = true, size = "md" }) {
	const { isDarkMode, themeMode, setTheme } = useTheme();

	// Determine sizes based on the size prop
	const iconSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;

	const cycleTheme = () => {
		if (themeMode === ThemeMode.LIGHT) {
			setTheme(ThemeMode.DARK);
		} else if (themeMode === ThemeMode.DARK) {
			setTheme(ThemeMode.SYSTEM);
		} else {
			setTheme(ThemeMode.LIGHT);
		}
	};

	return (
		<View className="flex-row items-center justify-center p-2">
			{/* Background & Border Adjusted for Dark Mode */}
			<View
				className={`flex-row rounded-full border p-1 ${
					isDarkMode ? "bg-primary border-border-dark" : "bg-background border-primary"
				}`}
			>
				<Pressable
					className={`p-2 rounded-full ${
						themeMode === ThemeMode.LIGHT
							? isDarkMode
								? "bg-background"
								: "bg-primary"
							: "bg-transparent"
					}`}
					onPress={() => setTheme(ThemeMode.LIGHT)}
				>
					<Feather
						name="sun"
						size={iconSize}
						color={
							themeMode === ThemeMode.LIGHT
								? isDarkMode
									? "black"
									: "white"
								: isDarkMode
								? "white"
								: "#86100E"
						}
					/>
				</Pressable>

				<Pressable
					className={`p-2 rounded-full ${
						themeMode === ThemeMode.DARK
							? isDarkMode
								? "bg-white"
								: "bg-primary"
							: "bg-transparent"
					}`}
					onPress={() => setTheme(ThemeMode.DARK)}
				>
					<Feather
						name="moon"
						size={iconSize}
						color={
							themeMode === ThemeMode.DARK
								? isDarkMode
									? "#86100E"
									: "white"
								: isDarkMode
								? "white"
								: "#86100E"
						}
					/>
				</Pressable>

				<Pressable
					className={`p-2 rounded-full ${
						themeMode === ThemeMode.SYSTEM
							? isDarkMode
								? "bg-white"
								: "bg-primary"
							: "bg-transparent"
					}`}
					onPress={() => setTheme(ThemeMode.SYSTEM)}
				>
					<Feather
						name="smartphone"
						size={iconSize}
						color={
							themeMode === ThemeMode.SYSTEM
								? isDarkMode
									? "black"
									: "white"
								: isDarkMode
								? "white"
								: "#86100E"
						}
					/>
				</Pressable>
			</View>

			{showLabel && (
				<Text
					className={`ml-2 text-base ${
						isDarkMode ? "text-white" : "text-textDark"
					}`}
				>
					{themeMode === ThemeMode.LIGHT
						? "Light"
						: themeMode === ThemeMode.DARK
						? "Dark"
						: "System"}
				</Text>
			)}
		</View>
	);
}
