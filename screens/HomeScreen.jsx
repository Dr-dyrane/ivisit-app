import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

export default function WelcomeScreen() {
	const { user } = useAuth(); // Get user info from context

	return (
		<LinearGradient
			colors={["#fff", "#f0f0f0"]}
			style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
		>
			<View style={{ alignItems: "center" }}>
				<Ionicons name="person-circle" size={80} color="#008773" />
				<Text style={{ fontSize: 24, fontWeight: "bold", marginTop: 10 }}>
					Welcome, {user?.name || "User"}!
				</Text>
				<Text style={{ fontSize: 16, color: "gray", marginTop: 5 }}>
					{user?.email || "No email available"}
				</Text>
			</View>

			<TouchableOpacity
				style={{
					marginTop: 20,
					backgroundColor: "#008773",
					padding: 12,
					borderRadius: 10,
				}}
			>
				<Text style={{ color: "#fff", fontSize: 16 }}>Get Started</Text>
			</TouchableOpacity>
		</LinearGradient>
	);
}
