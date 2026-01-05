"use client";

// app/(auth)/_layout.js

import { Stack } from "expo-router";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { commonScreenOptions } from "../../utils/navigationOptions";
import { useTheme } from "../../contexts/ThemeContext";
import {
	RegistrationProvider,
	useRegistration,
} from "../../contexts/RegistrationContext";
import { LoginProvider } from "../../contexts/LoginContext";

function AuthStackScreens() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const { previousStep, canGoBack: canGoBackInFlow } = useRegistration();

	const handleBackPress = () => {
		if (canGoBackInFlow) {
			console.log("[v0] Back pressed - using registration flow");
			previousStep();
		} else {
			console.log("[v0] Back pressed - using router");
			router.back();
		}
	};

	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{
					title: "Welcome to iVisit",
					headerShown: false,
					headerTitleAlign: "center",
					gestureEnabled: true,
					gestureDirection: "horizontal",
					headerStyle: {
						backgroundColor: "#fff",
					},
				}}
			/>

			<Stack.Screen
				name="login"
				options={commonScreenOptions({
					title: "Login",
					headerRight: () => (
						<Pressable
							onPress={() => router.push("signup")}
							className="flex flex-row items-center justify-center max-w-[38vw] mr-2"
						>
							<Text
								numberOfLines={2}
								ellipsizeMode="tail"
								className="text-xs text-gray-500"
							>
								Dont have an acount?
							</Text>
							<Text className="text-primary ml-1 text-xs">Sign up</Text>
						</Pressable>
					),
				})}
			/>

			<Stack.Screen
				name="onboarding"
				options={commonScreenOptions({
					title: "Onboarding",
					headerRight: () => (
						<Pressable onPress={() => router.push("signup")} className="mx-2">
							<Text
								className={`text-xs ${
									isDarkMode ? "text-white" : "text-primary"
								}`}
							>
								Skip
							</Text>
						</Pressable>
					),
				})}
			/>

			<Stack.Screen
				name="signup"
				options={commonScreenOptions({
					title: "Sign Up",
					headerLeft: () => (
						<Pressable onPress={handleBackPress} className="ml-2">
							<Ionicons
								name="arrow-back"
								size={24}
								color={isDarkMode ? "#FFF" : "#000"}
							/>
						</Pressable>
					),
					headerRight: () => (
						<Pressable onPress={() => router.push("login")} className="flex flex-row items-center justify-center max-w-[40vw] mx-2">
							<Text className="text-xs text-gray-500">
								Have an account?{" "}
								<Text className="text-primary font-semibold">Login</Text>
							</Text>
						</Pressable>
					),
				})}
			/>
		</Stack>
	);
}

export default function AuthLayout() {
	return (
		<RegistrationProvider>
			<LoginProvider>
				<AuthStackScreens />
			</LoginProvider>
		</RegistrationProvider>
	);
}
