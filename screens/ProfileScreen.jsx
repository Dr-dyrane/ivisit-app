import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	Image,
	TextInput,
	Pressable,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useToast } from "../contexts/ToastContext";
import * as ImagePicker from "expo-image-picker";
import { updateUserAPI, getCurrentUserAPI } from "../api/auth"; // Import both API functions
import { Ionicons, MaterialIcons } from "@expo/vector-icons"; // Icon packages
import ProfileField from "../components/form/ProfileField";
import { useAuth } from "../contexts/AuthContext";

const ProfileScreen = () => {
	const { syncUserData } = useAuth(); // Get syncUserData from context
	const { showToast } = useToast();
	const [fullName, setFullName] = useState("");
	const [username, setUsername] = useState("");
	const [gender, setGender] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [dateOfBirth, setDateOfBirth] = useState("");
	const [imageUri, setImageUri] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isDataLoading, setIsDataLoading] = useState(true);

	// Load current user data
	useEffect(() => {
		const fetchUserData = async () => {
			setIsDataLoading(true); // Start loading
			try {
				const { data: userData } = await getCurrentUserAPI();
				//console.log(userData);
				setFullName(userData.fullName || "Test User");
				setUsername(userData.username || "testUser");
				setGender(userData.gender || "Male");
				setEmail(userData.email || "test@example.com");
				setPhone(userData.phone || "08036048719");
				setAddress(userData.address || "Somehwere in Nigeria");
				setDateOfBirth(userData.dateOfBirth || "26 02 1994");
				setImageUri(userData.imageUri || null);
			} catch (error) {
				// Handle and show detailed error message
				const errorMessage =
					error.response?.data?.message || error.message || "An error occurred";
				showToast(errorMessage, "error");
			} finally {
				setIsDataLoading(false); // End loading
			}
		};
		fetchUserData();
	}, []);

	// Function to handle image picking
	const pickImage = async () => {
		try {
			let result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [4, 3],
				quality: 1,
			});

			if (!result.canceled && result.assets && result.assets.length > 0) {
				// Correctly setting the picked image URI
				setImageUri(result.assets[0].uri);
				showToast("Image selected successfully", "success");
			} else if (result.canceled) {
				showToast("Image selection canceled", "warning");
			} else {
				showToast("No image selected", "warning");
			}
		} catch (error) {
			// Handle possible errors with image picker
			showToast(`Image picker error: ${error.message}`, "error");
		}
	};

	// Function to handle profile update
	const handleUpdateProfile = async () => {
		setIsLoading(true);
		try {
			const updatedData = {
				fullName,
				username,
				gender,
				email,
				phone,
				address,
				dateOfBirth,
				imageUri,
			};
			await updateUserAPI(updatedData);
			await syncUserData();
			showToast("Profile updated successfully", "success");
		} catch (error) {
			// Handle and show detailed error message
			const errorMessage =
				error.response?.data?.message ||
				error.message ||
				"Failed to update profile";
			showToast(errorMessage, "error");
		} finally {
			setIsLoading(false);
		}
	};

	const handleFieldUpdate = async (field, value) => {
		if (!validate(value)) {
			showToast(`Invalid ${field}`, "error"); // Show error for invalid field
			return; // Exit if validation fails
		}
		try {
			await updateUserAPI({ [field]: value });
			showToast(`${field} updated successfully`, "success");
		} catch (error) {
			showToast(`Failed to update ${field}`, "error");
		}
	};

	// Render the profile screen
	return (
		<LinearGradient colors={["#fff", "#fff", "#fff"]} className="flex-1 p-4 pt-0">
			{isDataLoading ? (
				// Show a loading spinner while data is loading
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator size="large" color="#0000ff" />
				</View>
			) : (
				<ScrollView>
					<View className="flex flex-row space-x-4 items-center mb-4 bg-primary shadow-md p-4 rounded-2xl">
						<Pressable
							onPress={pickImage}
							className="relative border-2 rounded-full border-accent/50"
						>
							<Image
								source={
									imageUri
										? { uri: imageUri }
										: require("../assets/profile.jpg")
								}
								resizeMode="fit"
								className="w-24 h-24 rounded-full"
							/>
							{/* Icon Overlay */}
							<View className="absolute bottom-2 -right-2 p-2 bg-accent/50 rounded-full">
								<Ionicons name="camera" size={20} color="#fff" />
							</View>
						</Pressable>
						<View className="flex flex-col">
							<Text className="text-xl font-bold text-white">{fullName}</Text>
							<Text className="text-xl font-bold text-white">{phone}</Text>
						</View>
					</View>

					{/* Field Group */}
					<View className="w-full">
						<ProfileField
							label="Full Name"
							value={fullName}
							onChange={setFullName}
							iconName="person"
							onUpdate={() => handleFieldUpdate("fullName", fullName)} // Pass specific update handler
							fieldType="fullName" // Specify field type for validation
						/>
						<ProfileField
							label="Username"
							value={username}
							onChange={setUsername}
							iconName="person-outline"
							onUpdate={() => handleFieldUpdate("username", username)}
							fieldType="username" // Specify field type for validation
						/>
						<ProfileField
							label="Gender"
							value={gender}
							onChange={setGender}
							iconName={gender.toLowerCase() || "male"}
							onUpdate={() => handleFieldUpdate("gender", gender)}
							fieldType="gender" // Specify field type for validation
						/>
						<ProfileField
							label="Email"
							value={email}
							onChange={setEmail}
							iconName="mail"
							onUpdate={() => handleFieldUpdate("email", email)}
							fieldType="email" // Specify field type for validation
						/>
						<ProfileField
							label="Phone Number"
							value={phone}
							onChange={setPhone}
							iconName="call"
							onUpdate={() => handleFieldUpdate("phone", phone)}
							fieldType="number" // Specify field type for validation
						/>
						<ProfileField
							label="Address"
							value={address}
							onChange={setAddress}
							iconName="home"
							onUpdate={() => handleFieldUpdate("address", address)}
							fieldType="address" // Specify field type for validation
						/>
						<ProfileField
							label="Date of Birth"
							value={dateOfBirth}
							onChange={setDateOfBirth}
							iconName="calendar"
							onUpdate={() => handleFieldUpdate("dateOfBirth", dateOfBirth)}
							fieldType="dateOfBirth" // Specify field type for validation
						/>
					</View>

					{/* Save Button */}
					<Pressable
						onPress={handleUpdateProfile}
						className="flex flex-row mt-4 bg-primary p-4 rounded-xl items-center w-full px-6 justify-between space-x-4 shadow-md"
						disabled={isLoading}
					>
						<Text className="text-white font-bold text-lg">
							{isLoading ? "Updating..." : "Save Changes"}
						</Text>
						<View className="w-8 h-8 bg-none border border-white rounded-full justify-center items-center">
							<Ionicons name="arrow-down" size={18} color="white" />
						</View>
					</Pressable>
				</ScrollView>
			)}
		</LinearGradient>
	);
};

export default ProfileScreen;
