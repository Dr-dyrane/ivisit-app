// components/register/ProfileForm.jsx

"use client";

import { useState, useRef, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	Pressable,
	Animated,
	Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useRegistration } from "../../contexts/RegistrationContext";
import { COLORS } from "../../constants/colors";

/**
 * ProfileForm - iVisit Registration
 * ----------------------------------
 * Final step of registration flow:
 *  - Collect first name, last name, and profile image
 *  - Compute fullName
 *  - Sync everything to RegistrationContext
 *
 * Props:
 *  - onComplete: callback fired after successful profile save
 */
export default function ProfileForm({ onComplete }) {
	const { isDarkMode } = useTheme();
	const { registrationData, updateRegistrationData, nextStep } =
		useRegistration();

	// Local form state
	const [firstName, setFirstName] = useState(registrationData.firstName || "");
	const [lastName, setLastName] = useState(registrationData.lastName || "");
	const [imageUri, setImageUri] = useState(registrationData.imageUri || null);
	const [loading, setLoading] = useState(false);
	const [currentField, setCurrentField] = useState("firstName");

	// Animations
	const shakeAnim = useRef(new Animated.Value(0)).current;
	const buttonScale = useRef(new Animated.Value(1)).current;

	const colors = {
		inputBg: isDarkMode ? COLORS.bgDarkAlt : "#F3F4F6",
		text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
	};

	/**
	 * Pick an image from the device library
	 * - Stores the URI in local state and RegistrationContext
	 */
	const handlePickImage = async () => {
		Haptics.selectionAsync();

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		});

		if (!result.canceled && result.assets.length > 0) {
			const uri = result.assets[0].uri;
			setImageUri(uri);
			updateRegistrationData({ imageUri: uri });
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		}
	};

	/**
	 * Sync local state when registrationData changes
	 * (e.g., user navigates back to this step)
	 */
	useEffect(() => {
		setFirstName(registrationData.firstName || "");
		setLastName(registrationData.lastName || "");
		setImageUri(registrationData.imageUri || null);
	}, [
		registrationData.firstName,
		registrationData.lastName,
		registrationData.imageUri,
	]);

	/**
	 * Shake animation for invalid input
	 */
	const triggerShake = () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		Animated.sequence([
			Animated.timing(shakeAnim, {
				toValue: 10,
				duration: 50,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: -10,
				duration: 50,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: 10,
				duration: 50,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: 0,
				duration: 50,
				useNativeDriver: true,
			}),
		]).start();
	};

	/**
	 * Submit profile form
	 * - Validates inputs
	 * - Computes fullName
	 * - Updates RegistrationContext
	 * - Moves to next step
	 */
	const handleSubmit = async () => {
		if (!firstName.trim() || !lastName.trim()) {
			triggerShake();
			return;
		}

		setLoading(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		try {
			const profileData = {
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				fullName: `${firstName.trim()} ${lastName.trim()}`,
				imageUri,
				profileComplete: true,
			};

			// Update context with all profile fields
			updateRegistrationData(profileData);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			nextStep();
			onComplete?.(profileData);
		} catch (error) {
			console.error("[ProfileForm] Error saving profile:", error);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			triggerShake();
		} finally {
			setLoading(false);
		}
	};

	// Button press animation
	const handlePressIn = () => {
		Animated.spring(buttonScale, {
			toValue: 0.96,
			useNativeDriver: true,
		}).start();
	};
	const handlePressOut = () => {
		Animated.spring(buttonScale, {
			toValue: 1,
			friction: 3,
			useNativeDriver: true,
		}).start();
	};

	const isValid = firstName.trim() && lastName.trim();

	return (
		<View>
			<Text
				className="text-3xl font-black tracking-tight mb-3"
				style={{ color: colors.text }}
			>
				Complete Your Profile
			</Text>

			<Text
				className="text-base leading-6 mb-8"
				style={{ color: COLORS.textMuted }}
			>
				Help us personalize your iVisit experience
			</Text>

			{/* Profile Image Picker */}
			<Pressable onPress={handlePickImage} className="self-center mb-8">
				<View
					className="w-24 h-24 rounded-full items-center justify-center"
					style={{ backgroundColor: colors.inputBg }}
				>
					{imageUri ? (
						<Image
							source={{ uri: imageUri }}
							className="w-24 h-24 rounded-full"
						/>
					) : (
						<Ionicons name="camera" size={32} color={COLORS.textMuted} />
					)}
				</View>
				<Text
					className="text-xs font-medium text-center mt-2"
					style={{ color: COLORS.brandPrimary }}
				>
					Add Photo
				</Text>
			</Pressable>

			{/* First Name */}
			<Animated.View
				style={{
					transform: [
						{ translateX: currentField === "firstName" ? shakeAnim : 0 },
					],
				}}
			>
				<View
					className="rounded-2xl px-5 h-[72px] mb-4 flex-row items-center"
					style={{ backgroundColor: colors.inputBg }}
				>
					<Ionicons
						name="person-outline"
						size={22}
						color={COLORS.textMuted}
						style={{ marginRight: 12 }}
					/>
					<TextInput
						placeholder="First Name"
						placeholderTextColor={COLORS.textMuted}
						value={firstName}
						onChangeText={setFirstName}
						onFocus={() => setCurrentField("firstName")}
						autoCapitalize="words"
						selectionColor={COLORS.brandPrimary}
						returnKeyType="next"
						className="flex-1 text-xl font-bold"
						style={{ color: colors.text }}
					/>
				</View>
			</Animated.View>

			{/* Last Name */}
			<Animated.View
				style={{
					transform: [
						{ translateX: currentField === "lastName" ? shakeAnim : 0 },
					],
				}}
			>
				<View
					className="rounded-2xl px-5 h-[72px] mb-6 flex-row items-center"
					style={{ backgroundColor: colors.inputBg }}
				>
					<Ionicons
						name="person-outline"
						size={22}
						color={COLORS.textMuted}
						style={{ marginRight: 12 }}
					/>
					<TextInput
						placeholder="Last Name"
						placeholderTextColor="#666"
						value={lastName}
						onChangeText={setLastName}
						onFocus={() => setCurrentField("lastName")}
						autoCapitalize="words"
						selectionColor={COLORS.brandPrimary}
						returnKeyType="done"
						onSubmitEditing={handleSubmit}
						className="flex-1 text-xl font-bold"
						style={{ color: colors.text }}
					/>
				</View>
			</Animated.View>

			{/* Submit Button */}
			<Animated.View style={{ transform: [{ scale: buttonScale }] }}>
				<Pressable
					onPress={handleSubmit}
					onPressIn={handlePressIn}
					onPressOut={handlePressOut}
					disabled={!isValid || loading}
					className="h-16 rounded-2xl items-center justify-center"
					style={{
						backgroundColor: isValid
							? COLORS.brandPrimary
							: isDarkMode
							? COLORS.bgDarkAlt
							: "#E5E7EB",
						opacity: loading ? 0.7 : 1,
					}}
				>
					<Text
						className="text-base font-black tracking-[2px]"
						style={{ color: isValid ? COLORS.bgLight : COLORS.textMuted }}
					>
						{loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
					</Text>
				</Pressable>
			</Animated.View>
		</View>
	);
}
