// app/(stacks)/_layout.js

import { Stack } from "expo-router";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router"; // Import useRouter for navigation

// Define common stack options
const commonStackOptions = {
	headerStyle: { backgroundColor: "#fff" }, // Header background color
	headerTitleAlign: "left", // Center the title on all screens
	gestureEnabled: true, // Enable gestures for swiping between tabs
	gestureDirection: "horizontal", // Swipe gesture direction
	headerTitleStyle: {
		fontWeight: "bold", // Bold font for the title
		fontSize: 18, // Adjust the size if needed
	},
	headerShadowVisible: false, // Hide the shadow under the header
};

export default function StacksLayout() {
	const router = useRouter(); // Initialize the router for navigation

	return <Stack></Stack>;
}
