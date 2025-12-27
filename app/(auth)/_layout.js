// app/(auth)/_layout.js

import { Stack } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { commonScreenOptions } from "../../utils/navigationOptions";
import { useTheme } from "../../contexts/ThemeContext";

export default function AuthLayout() {
	const router = useRouter();
	const { isDarkMode } = useTheme();

	const handleBackPress = () => {
		Alert.alert("Back pressed!", "Navigating to the previous screen.");
		router.back();
	};

	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{
					title: "Welcome to iVisit",
					headerShown: false,
					headerTitleAlign: "center", // Center the title
					gestureEnabled: true,
					gestureDirection: "horizontal",
					headerStyle: {
						backgroundColor: "#fff", // Set the header background color
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
								className="text-md text-gray-500"
							>
								Dont have an acount?
							</Text>
							<Text className="text-primary ml-1 text-md">Sign up</Text>
						</Pressable>
					),
				})}
			/>

			<Stack.Screen
				name="onboarding"
				options={commonScreenOptions({
					title: "Onboarding",
					headerRight: () => (
						<Pressable
							// onPress={() => router.push("signup")}
							className=""
						>
							<Text
								className={`text-lg ${
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
					headerRight: () => (
						<Pressable
							onPress={() => router.push("login")}
							className="flex flex-row items-center justify-center max-w-[40vw] mr-2"
						>
							<Text
								numberOfLines={2}
								ellipsizeMode="tail"
								className="text-md text-gray-500"
							>
								Already have an acount?
							</Text>
							<Text className="text-primary ml-1 text-md">Login</Text>
						</Pressable>
					),
				})}
			/>
		</Stack>
	);
}
