import React, { useState } from "react";
import { View, TextInput, Text, Pressable, Alert } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons"; // Icon packages

// Custom component to render editable fields
const ProfileField = ({
	label,
	value,
	onChange,
	iconName,
	onUpdate,
	fieldType,
}) => {
	// Warning state
	const [warning, setWarning] = useState("");

	// Comprehensive validation function
	const validate = (value) => {
		switch (fieldType) {
			case "fullName":
			case "username":
				return value.trim().length > 0; // Must not be empty
			case "gender":
				return value.trim().length > 0;
			case "email":
				const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				return emailPattern.test(value); // Valid email format
			case "number":
				const phonePattern = /^[0-9]{10,15}$/; // Adjust the regex pattern based on your phone number requirements
				return phonePattern.test(value); // Valid phone number format
			case "address":
				return value.trim().length > 0; // Must not be empty
			case "dateOfBirth":
				// Example: Simple validation for non-empty date
				return value.trim().length > 0; // You might want to implement a more specific date validation
			default:
				return true; // Default to valid
		}
	};

	const handleUpdate = () => {
		if (!validate(value)) {
			setWarning("Please enter a valid value."); // Set warning message
			return;
		}
		Alert.alert(
			"Confirm Update",
			"Are you sure you want to update this field?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "OK",
					onPress: () => {
						onUpdate(); // Call the onUpdate function if confirmed
						setWarning(""); // Clear warning if update is confirmed
					},
				},
			]
		);
	};

	return (
		<View className="flex flex-row items-center justify-start space-x-2 mb-4 px-2 py-1 rounded-xl bg-slate-50 shadow-lg">
			<View className="rounded-xl bg-[#E5F5F1] p-3">
				<Ionicons name={iconName} size={20} color="teal" />
			</View>
			<View className="flex flex-col flex-1 p-1 px-2 rounded-xl bg-white/30">
				<TextInput
					value={value}
					onChangeText={(text) => {
						setWarning(""); // Clear warning when user types
						onChange(text);
					}}
					className="w-48 text-left"
				/>
				<Text className="text-xs text-gray-400 font-medium">{label}</Text>
				{warning ? (
					<Text className="text-red-500 text-sm">{warning}</Text>
				) : null}
			</View>
			<Pressable
				onPress={handleUpdate}
				className="flex items-center rounded-full bg-white/20 p-3"
			>
				<Ionicons
					name="chevron-forward-outline"
					size={20}
					color="teal"
					className="ml-2"
				/>
			</Pressable>
		</View>
	);
};

export default ProfileField;
