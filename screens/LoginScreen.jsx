import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	Pressable,
	ActivityIndicator,
	Modal,
	ScrollView,
	TouchableOpacity,
	Image,
	Keyboard,
} from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import Input from "../components/form/Input";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useToast } from "../contexts/ToastContext";
import useLogin from "../hooks/mutations/useLogin";
import { Ionicons } from "@expo/vector-icons";
import useForgotPassword from "../hooks/mutations/useForgotPassword";
import useResetPassword from "../hooks/mutations/useResetPassword";

const LoginSchema = Yup.object().shape({
	email: Yup.string().email("Invalid email").required("Email is required"),
	password: Yup.string()
		.min(6, "Password too short")
		.required("Password is required"),
});

const ResetPasswordSchema = Yup.object().shape({
	resetToken: Yup.string().required("Reset code is required"),
	newPassword: Yup.string()
		.min(6, "Password too short")
		.required("New password is required"),
});

const LoginScreen = () => {
	const [loading, setLoading] = useState(false);
	const [resetEmail, setResetEmail] = useState("");
	const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
	const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
	const [resetToken, setResetToken] = useState("");
	const { login: loginUser } = useLogin();
	const { forgotPassword, loading: isLoading } = useForgotPassword();
	const { resetPassword, loading: isPending } = useResetPassword();
	const router = useRouter();
	const { showToast } = useToast();
	const [keyboardVisible, setKeyboardVisible] = useState(false);

	const handleLogin = async (values) => {
		setLoading(true);
		try {
			const isLoggedIn = await loginUser(values);
			if (isLoggedIn) {
				router.replace("/(tabs)");
				showToast("Login successful!", "success");
			}
		} catch (error) {
			showToast("Login failed: " + error.message, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleForgotPassword = async (email) => {
		setLoading(true);
		try {
			const response = await forgotPassword(email);
			setResetToken(response.resetToken);
			setResetEmail(email);
			setForgotPasswordVisible(false);
			setResetPasswordVisible(true);
			showToast("Reset code sent!", "success");
		} catch (error) {
			showToast("Failed to request reset code: " + error.message, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleResetPassword = async (values) => {
		setLoading(true);
		try {
			await resetPassword({
				resetToken: values.resetToken,
				newPassword: values.newPassword,
				email: resetEmail,
			});
			setResetPasswordVisible(false);
			showToast("Password reset successful!", "success");
		} catch (error) {
			showToast("Failed to reset password: " + error.message, "error");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const keyboardDidShowListener = Keyboard.addListener(
			"keyboardDidShow",
			() => setKeyboardVisible(true)
		);
		const keyboardDidHideListener = Keyboard.addListener(
			"keyboardDidHide",
			() => setKeyboardVisible(false)
		);

		return () => {
			keyboardDidShowListener.remove();
			keyboardDidHideListener.remove();
		};
	}, []);

	return (
		<LinearGradient
			colors={["#fff", "#f0fff4", "#fff"]}
			className="flex-1 justify-between items-center p-6 bg-backgroundLight"
		>
			<View className="flex flex-col flex-shrink">
				<View className="justify-center space-y-2">
					<Text className="text-6xl text-center font-[900] text-primary">
						Welcome Back
					</Text>
					<Text className="text-lg text-center text-gray-500">
						Login to your account
					</Text>
				</View>
				{!keyboardVisible && (
					<Image
						source={require("../assets/sign/login.png")}
						className="contain w-[320px] h-[320px] flex-1"
						resizeMode="contain"
					/>
				)}
			</View>
			<View className="w-full">
				<ScrollView>
					<Formik
						initialValues={{ email: "", password: "" }}
						validationSchema={LoginSchema}
						onSubmit={handleLogin}
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
									icon="lock-closed"
									secureTextEntry
									onChangeText={handleChange("password")}
									onBlur={handleBlur("password")}
									value={values.password}
									error={touched.password && errors.password}
								/>

								<Pressable
									onPress={() => setForgotPasswordVisible(true)}
									className="mt-1 items-end mr-2"
								>
									<Text className="text-center text-primary">
										Forgot Password?
									</Text>
								</Pressable>

								<Pressable
									onPress={handleSubmit}
									disabled={loading}
									className="w-full bg-primary rounded-xl py-4 text-lg mt-4 flex flex-row px-6 items-center justify-between space-x-4"
									android_ripple={{ color: "#333" }}
								>
									<Text className="text-white text-xl">
										{loading ? "Logging in..." : "Login"}
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

			<Modal visible={forgotPasswordVisible} animationType="slide" transparent>
				<LinearGradient
					colors={["#fff", "#f0fff4", "#fff"]}
					className="flex flex-col w-full h-full p-6 pt-3 bg-backgroundLight justify-center items-center"
				>
					<View className="flex flex-row justify-between items-center w-full">
						<TouchableOpacity onPress={() => setForgotPasswordVisible(false)}>
							<Ionicons name="arrow-back" size={24} color="black" />
						</TouchableOpacity>
						<Text className="text-lg">Forgot Password</Text>
					</View>

					<View className="w-full flex-1 justify-center items-center">
						{!keyboardVisible && (
							<Image
								source={require("../assets/sign/forgot.png")}
								className="contain w-[320px] h-[320px] flex-1"
								resizeMode="contain"
							/>
						)}
						<Formik
							initialValues={{ email: "" }}
							onSubmit={(values) => handleForgotPassword(values.email)}
						>
							{({
								handleBlur,
								handleSubmit,
								handleChange,
								values,
								errors,
								touched,
							}) => (
								<>
									<Input
										label="Email"
										placeholder="Enter your email"
										icon="mail"
										onChangeText={handleChange("email")}
										onBlur={handleBlur("email")}
										value={values.email}
										error={touched.email && errors.email}
									/>
									<Pressable
										onPress={handleSubmit}
										disabled={loading}
										className="w-full bg-primary rounded-xl py-4 text-lg mt-4 flex flex-row px-6 items-center justify-between space-x-4"
										android_ripple={{ color: "#333" }}
									>
										<Text className="text-white text-xl">
											{isLoading ? "Requesting" : "Request Reset Code"}
										</Text>
										<View className="w-8 h-8 bg-none border border-white rounded-full justify-center items-center">
											<Ionicons name="arrow-forward" size={18} color="white" />
										</View>
									</Pressable>
								</>
							)}
						</Formik>
					</View>
				</LinearGradient>
			</Modal>

			<Modal visible={resetPasswordVisible} animationType="slide" transparent>
				<LinearGradient
					colors={["#fff", "#f0fff4", "#fff"]}
					className="flex flex-col w-full h-full p-6 pt-3 bg-backgroundLight justify-center items-center"
				>
					<View className="flex flex-row justify-between items-center w-full">
						<TouchableOpacity onPress={() => setResetPasswordVisible(false)}>
							<Ionicons name="arrow-back" size={24} color="black" />
						</TouchableOpacity>
						<Text className="text-lg">Reset Password</Text>
					</View>
					<View className="w-full flex-1 justify-center items-center">
						<View className="bg-gray-200 mt-4 p-6 rounded-xl text-center items-center justify-center space-y-2">
							<Text>Reset Code, Valid for 1 hour</Text>
							<Text className="text-2xl font-bold tracking-widest">
								{resetToken}
							</Text>
						</View>

						{!keyboardVisible && (
							<Image
								source={require("../assets/sign/reset.png")}
								className="contain w-[320px] h-[320px] flex-1"
								resizeMode="contain"
							/>
						)}
						<Formik
							initialValues={{ resetToken: resetToken, newPassword: "" }}
							validationSchema={ResetPasswordSchema}
							onSubmit={handleResetPassword}
						>
							{({
								handleBlur,
								handleSubmit,
								handleChange,
								values,
								errors,
								touched,
							}) => (
								<>
									<Input
										label="Reset Code"
										placeholder="Enter your reset code"
										icon="key"
										onChangeText={handleChange("resetToken")}
										onBlur={handleBlur("resetToken")}
										value={values.resetToken}
										error={touched.resetToken && errors.resetToken}
									/>
									<Input
										label="New Password"
										placeholder="Enter new password"
										icon="lock-closed"
										secureTextEntry
										onChangeText={handleChange("newPassword")}
										onBlur={handleBlur("newPassword")}
										value={values.newPassword}
										error={touched.newPassword && errors.newPassword}
									/>
									<Pressable
										onPress={handleSubmit}
										disabled={loading}
										className="w-full bg-primary rounded-xl py-4 text-lg mt-4 flex flex-row px-6 items-center justify-between space-x-4"
										android_ripple={{ color: "#333" }}
									>
										<Text className="text-white text-xl">
											{isPending ? "Resetting" : "Reset Password"}
										</Text>
										<View className="w-8 h-8 bg-none border border-white rounded-full justify-center items-center">
											<Ionicons name="arrow-forward" size={18} color="white" />
										</View>
									</Pressable>
								</>
							)}
						</Formik>
					</View>
				</LinearGradient>
			</Modal>
		</LinearGradient>
	);
};

export default LoginScreen;
