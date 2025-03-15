import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	Pressable,
	ActivityIndicator,
	ScrollView,
	Image,
	Keyboard,
} from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import Input from "../components/form/Input"; // Reusable Input Component
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import useSignUp from "../hooks/mutations/useSignup";
import { useToast } from "../contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";

// Validation Schema for the Signup Form
const SignupSchema = Yup.object().shape({
	username: Yup.string().required("Username is required"),
	email: Yup.string().email("Invalid email").required("Email is required"),
	password: Yup.string()
		.min(6, "Password too short")
		.required("Password is required"),
	confirmPassword: Yup.string()
		.oneOf([Yup.ref("password"), null], "Passwords must match")
		.required("Confirm Password is required"),
});

const SignupScreen = () => {
	const [loading, setLoading] = useState(false);
	const [keyboardVisible, setKeyboardVisible] = useState(false); // Track keyboard visibility
	const { showToast } = useToast();
	const router = useRouter();
	const { signUp } = useSignUp();

	useEffect(() => {
		// Add event listeners for keyboard open and close
		const keyboardDidShowListener = Keyboard.addListener(
			"keyboardDidShow",
			() => {
				setKeyboardVisible(true);
			}
		);
		const keyboardDidHideListener = Keyboard.addListener(
			"keyboardDidHide",
			() => {
				setKeyboardVisible(false);
			}
		);

		return () => {
			// Remove event listeners on cleanup
			keyboardDidShowListener.remove();
			keyboardDidHideListener.remove();
		};
	}, []);

	// Simulate Signup API Call
	const handleSignup = async (values) => {
		setLoading(true);
		try {
			const { email, password, username } = values;
			const isSignedUp = await signUp({ email, password, username });
			if (isSignedUp) {
				router.replace("/(tabs)"); // Navigate on successful login
				showToast("Sign-up successful!", "success");
			}
		} catch (error) {
			showToast("Sign-up failed: " + error.message, "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<LinearGradient
			colors={["#fff", "#f0fff4", "#fff"]}
			className="flex-1 justify-between items-center p-6 bg-backgroundLight"
		>
			{!keyboardVisible && (
				<View className="flex flex-col flex-shrink">
					{/* Conditionally render the image if the keyboard is not visible */}
					<View className="justify-center space-y-2">
						<Text className="text-6xl text-center font-[900] text-primary">
							Register
						</Text>
						<Text className="text-lg text-center text-gray-500">
							Create your new account
						</Text>
					</View>

					<Image
						source={require("../assets/sign/signup.png")}
						className="w-[220px] h-[220px] flex-1"
						resizeMode="contain"
					/>
				</View>
			)}
			<View className="w-full">
				<ScrollView>
					<Formik
						initialValues={{
							username: "",
							email: "",
							password: "",
							confirmPassword: "",
						}}
						validationSchema={SignupSchema}
						onSubmit={handleSignup}
					>
						{({
							handleChange,
							handleBlur,
							handleSubmit,
							values,
							errors,
							touched,
						}) => (
							<>
								<Input
									label="Username"
									placeholder="Enter your username"
									icon="person"
									onChangeText={handleChange("username")}
									onBlur={handleBlur("username")}
									value={values.username}
									error={touched.username && errors.username}
								/>

								<Input
									label="Email"
									placeholder="Enter your email"
									icon="mail"
									onChangeText={handleChange("email")}
									onBlur={handleBlur("email")}
									value={values.email}
									error={touched.email && errors.email}
								/>

								<Input
									label="Password"
									placeholder="Enter your password"
									secureTextEntry
									icon="lock-closed"
									onChangeText={handleChange("password")}
									onBlur={handleBlur("password")}
									value={values.password}
									error={touched.password && errors.password}
								/>

								<Input
									label="Confirm Password"
									placeholder="Confirm your password"
									secureTextEntry
									icon="lock-closed"
									onChangeText={handleChange("confirmPassword")}
									onBlur={handleBlur("confirmPassword")}
									value={values.confirmPassword}
									error={touched.confirmPassword && errors.confirmPassword}
								/>

								<Pressable
									onPress={handleSubmit}
									disabled={loading}
									className="w-full bg-primary rounded-xl py-4 text-lg mt-4 flex flex-row px-6 items-center justify-between space-x-4"
									android_ripple={{ color: "#333" }}
								>
									<Text className="text-white text-lg">
										{loading ? "Signing up..." : "Sign Up"}
									</Text>
									<View className="w-8 h-8 bg-none border border-white rounded-full justify-center items-center">
										<Ionicons name="arrow-forward" size={18} color="white" />
									</View>
								</Pressable>
							</>
						)}
					</Formik>
				</ScrollView>
			</View>
			{loading && (
				<ActivityIndicator size="large" color="#4CAF50" className="mt-4" />
			)}
		</LinearGradient>
	);
};

export default SignupScreen;
