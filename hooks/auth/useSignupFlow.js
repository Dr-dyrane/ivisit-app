import { useRegistration } from "../../contexts/RegistrationContext";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import * as Haptics from "expo-haptics";
import { authService } from "../../services/authService";
import { useImageUpload } from "../user/useImageUpload";

/**
 * Logic hook for the Sign Up flow.
 * Follows the "Dummy UI" pattern where logic is separated from the view.
 */
export const useSignupFlow = ({ onDismiss }) => {
	const {
		registrationData,
		updateRegistrationData,
		nextStep,
		setRegistrationError,
		clearError,
		startLoading,
		stopLoading,
	} = useRegistration();

	const { login, syncUserData } = useAuth();
	const { showToast } = useToast();
    const { uploadImage } = useImageUpload();

	const handleSmartInputSubmit = async (value, detectedType) => {
		if (!value) return;

		startLoading();
		clearError();

		try {
			updateRegistrationData({
				method: detectedType,
				phone: detectedType === "phone" ? value : null,
				email: detectedType === "email" ? value : null,
			});

			// Request OTP for verification
			const otpResult = await authService.requestOtp(
				detectedType === "phone" ? { phone: value } : { email: value }
			);

			if (!otpResult.success) {
				const errorMsg = otpResult.error || "Failed to send code";
				setRegistrationError(errorMsg);
				showToast(errorMsg, "error");
				stopLoading();
				return;
			}

			nextStep();
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("Verification code sent", "success");
		} catch (err) {
			console.error("useSignupFlow handleSmartInputSubmit error:", err);
			setRegistrationError("Failed to process. Please try again.");
		} finally {
			stopLoading();
		}
	};

	const handleResendOtp = async () => {
		startLoading();
		clearError();
		try {
			const contact = registrationData.phone || registrationData.email;
			const otpResult = await authService.requestOtp(
				registrationData.method === "phone" ? { phone: contact } : { email: contact }
			);

			if (!otpResult.success) {
				showToast(otpResult.error || "Failed to resend code", "error");
			} else {
				showToast("Code resent successfully", "success");
			}
		} catch (e) {
			showToast("Failed to resend code", "error");
		} finally {
			stopLoading();
		}
	};

	const handleOTPSubmit = async (otp) => {
		if (!otp) return;

		startLoading(); // Ensure loading state
		try {
			const result = await authService.verifyOtp({
				email: registrationData.email,
				phone: registrationData.phone,
				otp,
			});

			if (result.success) {
				// Check if user already has a profile (isExistingUser)
				if (result.data?.isExistingUser) {
					// User already exists and has profile - auto-login them
					const loginSuccess = await login({ ...result.data }); // result.data contains user + token
					
					if (loginSuccess) {
						await syncUserData();
						Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
						showToast("Welcome back! Logged you in automatically.", "success");
						onDismiss();
					} else {
						showToast("Login failed after verification", "error");
					}
					return;
				}

				// User is new (no profile yet) - continue registration flow
				updateRegistrationData({ otp });
				nextStep();

				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
				showToast("OTP verified successfully", "success");
			} else {
				showToast(result.error || "OTP verification failed", "error");
			}
		} catch (error) {
			console.error("OTP Verification Error:", error);
			showToast("An error occurred during verification", "error");
		} finally {
			stopLoading();
		}
	};

    const handleProfileSubmit = async ({ firstName, lastName, imageUri }) => {
        if (!firstName?.trim() || !lastName?.trim()) return;
        
        startLoading();
        try {
            let uploadedImageUri = imageUri;
            // Only upload if it's a local file uri (starts with file://)
            // If it's already an HTTP URL (from previous upload), skip
            if (imageUri && imageUri.startsWith('file://')) {
                uploadedImageUri = await uploadImage(imageUri);
            }

            const profileData = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                fullName: `${firstName.trim()} ${lastName.trim()}`,
                imageUri: uploadedImageUri,
                profileComplete: true,
            };

            updateRegistrationData(profileData);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            nextStep();
            
        } catch (error) {
             console.error("Profile Submit Error:", error);
             showToast("Failed to save profile", "error");
        } finally {
            stopLoading();
        }
    };

	const handlePasswordSubmit = async (password) => {
		startLoading();
		try {
			updateRegistrationData({ password });

			const payload = {
				username:
					registrationData.username ||
					registrationData.email?.split("@")[0] ||
					`user${Date.now()}`,
				email: registrationData.email,
				phone: registrationData.phone,
				firstName: registrationData.firstName,
				lastName: registrationData.lastName,
				fullName: registrationData.fullName,
				imageUri: registrationData.imageUri,
				dateOfBirth: registrationData.dateOfBirth,
				password,
			};

			const result = await authService.register(payload);

			if (result.success) {
				const loginSuccess = await login({ 
                    ...result.data.user, 
                    token: result.data.token 
                });
                
				if (loginSuccess) {
                    await syncUserData();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showToast("Registration successful!", "success");
                    onDismiss();
                } else {
                     showToast("Registration successful but login failed", "warning");
                     onDismiss();
                }
			} else {
				showToast(result.error || "Registration failed", "error");
			}
		} catch (error) {
			console.error("Registration Error:", error);
			showToast("An unexpected error occurred", "error");
		} finally {
			stopLoading();
		}
	};

	const handleSkipPassword = async () => {
        startLoading();
        try {
            const payload = {
                username:
                    registrationData.username ||
                    registrationData.email?.split("@")[0] ||
                    `user${Date.now()}`,
                email: registrationData.email,
                phone: registrationData.phone,
                firstName: registrationData.firstName,
                lastName: registrationData.lastName,
                fullName: registrationData.fullName,
                imageUri: registrationData.imageUri,
                dateOfBirth: registrationData.dateOfBirth,
                // No password
            };

            const result = await authService.register(payload);

            if (result.success) {
                const loginSuccess = await login({ 
                    ...result.data.user, 
                    token: result.data.token 
                });
                
                if (loginSuccess) {
                    await syncUserData();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showToast("Registered successfully", "info");
                    onDismiss();
                } else {
                    showToast("Registration successful but login failed", "warning");
                    onDismiss();
                }
            } else {
                showToast(result.error || "Registration failed", "error");
            }
        } catch (error) {
            console.error("Registration (Skip Password) Error:", error);
            showToast("An unexpected error occurred", "error");
        } finally {
            stopLoading();
        }
	};

	return {
		handleSmartInputSubmit,
		handleResendOtp,
		handleOTPSubmit,
        handleProfileSubmit,
		handlePasswordSubmit,
		handleSkipPassword,
	};
};
