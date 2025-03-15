// MoreScreen.js
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";

const MoreScreen = () => {
	const router = useRouter();
	const { showToast } = useToast();
	const { logout } = useAuth();

	const BusinessData = [
		{
			title: "Businesses",
			icon: "business", // Business icon
			route: "business",
		},
		{
			title: "Performance",
			icon: "bar-chart", // Bar chart icon
			route: "performance",
		},
		{
			title: "Users",
			icon: "people", // People icon
			route: "users",
		},
		{
			title: "Accounts", // Updated title
			icon: "wallet", // Wallet icon for accounts
			route: "accounts",
		},
	];

	const utilities = [
		{ title: "Settings", icon: "settings", route: "settings" },
		{
			title: "Notifications",
			icon: "notifications",
			route: "notifications",
		},
		{ title: "Help", icon: "help-circle", route: "help" },
		{
			title: "Log out",
			icon: "log-out",
			action: async () => {
				const result = await logout();
				if (result.success) {
					showToast(result.message, "success");
					router.replace("(auth)");
				} else {
					showToast(result.message, "error");
				}
			},
			color: "red",
		},
	];

	return (
		<View className="flex-1 bg-white p-4">
			<View className="mb-6">
				<Text className="text-gray-500 mb-4">Manage Your Business</Text>
				{BusinessData.map((option, index) => (
					<TouchableOpacity
						key={index}
						className="flex-row items-center p-3 mb-3 bg-slate-50 rounded-xl justify-between"
						onPress={() => router.push(option.route)}
					>
						<View className="flex flex-row items-center">
							<View className={`bg-[#E5F5F1] p-2 rounded-lg`}>
								<Ionicons name={option.icon} size={18} color="#008773" />
							</View>
							<Text className="text-md ml-4 text-gray-800">{option.title}</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color="teal" />
					</TouchableOpacity>
				))}
			</View>
			<View>
				<Text className="text-gray-500 mb-4">Utilities</Text>
				{utilities.map((option, index) => (
					<TouchableOpacity
						key={index}
						className="flex-row items-center p-3 mb-3 bg-slate-50 rounded-xl justify-between"
						onPress={() =>
							option.route ? router.push(option.route) : option.action()
						}
					>
						<View className="flex flex-row items-center">
							<View
								className={`${
									option.title === "Log out" ? "bg-red-50" : "bg-[#E5F5F1]"
								} p-2 rounded-lg`}
							>
								<Ionicons
									name={option.icon}
									size={18}
									color={option.title === "Log out" ? "red" : "#008773"}
								/>
							</View>
							<Text className="text-md ml-4 text-gray-800">{option.title}</Text>
						</View>
						<Ionicons
							name="chevron-forward"
							size={18}
							color={option.title === "Log out" ? "red" : "teal"}
						/>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
};

export default MoreScreen;
