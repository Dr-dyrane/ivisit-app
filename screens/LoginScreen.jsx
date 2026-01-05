import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	ActivityIndicator,
	Modal,
	ScrollView,
	TouchableOpacity,
	Image,
	KeyboardAvoidingView,
	Platform,
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
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../constants/colors";
import SlideButton from "../components/ui/SlideButton";
import LoginModal from "../components/login/LoginModal";
import LoginFlow from "../components/login/LoginFlow";

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
	const [loginFlowVisible, setLoginFlowVisible] = useState(false);
	const [resetEmail, setResetEmail] = useState("");
	const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
	const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
	const [resetToken, setResetToken] = useState("");
	const { login: loginUser } = useLogin();
	const { forgotPassword, loading: isLoading } = useForgotPassword();
	const { resetPassword, loading: isPending } = useResetPassword();
	const router = useRouter();
	const { showToast } = useToast();
	const { isDarkMode } = useTheme();
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
		<>
			<LinearGradient
				colors={isDarkMode ? [COLORS.bgDark, COLORS.bgDarkAlt] : [COLORS.bgLight, "#F3E7E7"]}
				className="flex-1"
			>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 24}
				className="flex-1 px-6 py-8"
			>
				<View className="flex-1 justify-center items-center">
					<View className="items-center mb-6">
						<Image source={require("../assets/logo.png")} style={{ width: 56, height: 56 }} />
						<Text className="text-4xl font-black mt-3" style={{ color: isDarkMode ? "#FFF" : COLORS.brandPrimary }}>
							Welcome Back
						</Text>
						<Text className="text-base mt-2" style={{ color: isDarkMode ? "#9CA3AF" : COLORS.textMuted }}>
							Login to your account
						</Text>
					</View>

					{!keyboardVisible && (
						<Image source={require("../assets/sign/login.png")} style={{ width: 300, height: 220 }} resizeMode="contain" />
					)}

					<View className="w-full mt-6">
						<ScrollView keyboardShouldPersistTaps="handled">
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

										<TouchableOpacity onPress={() => setForgotPasswordVisible(true)} className="mt-2 items-end">
											<Text style={{ color: COLORS.brandPrimary }}>Forgot Password?</Text>
										</TouchableOpacity>

										<View className="mt-6">
											<SlideButton onPress={handleSubmit}>
												{loading ? "Logging in..." : "Login"}
											</SlideButton>
										</View>

										<TouchableOpacity onPress={() => setLoginFlowVisible(true)} className="mt-3 items-center">
											<Text style={{ color: COLORS.brandPrimary }}>Quick Login (OTP / Social)</Text>
										</TouchableOpacity>
									</>
								)}
							</Formik>
						</ScrollView>
					</View>
				</View>

				{loading && (
					<ActivityIndicator size="large" color={COLORS.success} className="mt-4" />
				)}
			</KeyboardAvoidingView>

			<LoginModal visible={forgotPasswordVisible} onClose={() => setForgotPasswordVisible(false)} title="Forgot Password" subtitle="Enter your email to request a reset code" showBack={false}>
				<View className="w-full">
					{!keyboardVisible && (
						<Image source={require("../assets/sign/forgot.png")} style={{ width: 280, height: 180 }} resizeMode="contain" />
					)}
					<Formik initialValues={{ email: "" }} onSubmit={(values) => handleForgotPassword(values.email)}>
						{({ handleBlur, handleSubmit, handleChange, values, errors, touched }) => (
							<>
								<Input label="Email" placeholder="Enter your email" icon="mail" onChangeText={handleChange("email")} onBlur={handleBlur("email")} value={values.email} error={touched.email && errors.email} />
								<View className="w-full mt-4">
									<SlideButton onPress={handleSubmit}>{isLoading ? "Requesting" : "Request Reset Code"}</SlideButton>
								</View>
							</>
						)}
					</Formik>
				</View>
			</LoginModal>

			<LoginModal visible={resetPasswordVisible} onClose={() => setResetPasswordVisible(false)} title="Reset Password" subtitle="Enter your reset code and new password" showBack={false}>
				<View className="w-full">
					<View className="bg-gray-200 mt-2 p-4 rounded-xl items-center justify-center mb-4">
						<Text>Reset Code, Valid for 1 hour</Text>
						<Text className="text-2xl font-bold tracking-widest">{resetToken}</Text>
					</View>

					{!keyboardVisible && (
						<Image source={require("../assets/sign/reset.png")} style={{ width: 260, height: 160 }} resizeMode="contain" />
					)}

					<Formik initialValues={{ resetToken: resetToken, newPassword: "" }} validationSchema={ResetPasswordSchema} onSubmit={handleResetPassword}>
						{({ handleBlur, handleSubmit, handleChange, values, errors, touched }) => (
							<>
								<Input label="Reset Code" placeholder="Enter your reset code" icon="key" onChangeText={handleChange("resetToken")} onBlur={handleBlur("resetToken")} value={values.resetToken} error={touched.resetToken && errors.resetToken} />
								<Input label="New Password" placeholder="Enter new password" icon="lock-closed" secureTextEntry onChangeText={handleChange("newPassword")} onBlur={handleBlur("newPassword")} value={values.newPassword} error={touched.newPassword && errors.newPassword} />
								<View className="w-full mt-4">
									<SlideButton onPress={handleSubmit}>{isPending ? "Resetting" : "Reset Password"}</SlideButton>
								</View>
							</>
						)}
					</Formik>
				</View>
			</LoginModal>
			</LinearGradient>
			<LoginFlow visible={loginFlowVisible} onClose={() => setLoginFlowVisible(false)} />
		</>
	);
};

export default LoginScreen;
