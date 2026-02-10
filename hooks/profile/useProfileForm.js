import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../contexts/AuthContext";
import { useUpdateProfile } from "../../hooks/user/useUpdateProfile";
import { useImageUpload } from "../../hooks/user/useImageUpload";
import { useToast } from "../../contexts/ToastContext";
import { getDisplayId } from "../../services/displayIdService";

export const useProfileForm = () => {
    const { user, syncUserData, deleteAccount: authDeleteAccount } = useAuth();
    const { updateProfile } = useUpdateProfile();
    const { uploadImage } = useImageUpload();
    const { showToast } = useToast();

    // Form State
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [gender, setGender] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [imageUri, setImageUri] = useState(null);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [displayId, setDisplayId] = useState(null);

    // Sync state with user context
    useEffect(() => {
        if (user) {
            // Only overwrite if loading for first time or no changes yet
            if (isDataLoading) {
                setFullName(user.fullName || "");
                setUsername(user.username || "");
                setGender(user.gender || "");
                setEmail(user.email || "");
                setPhone(user.phone || "");
                setAddress(user.address || "");
                setDateOfBirth(user.dateOfBirth || "");

                if (!imageUri?.startsWith('file://')) {
                    setImageUri(user.imageUri || null);
                }
                setIsDataLoading(false);
            }
        }
    }, [user, isDataLoading, imageUri]);

    // Fetch Display ID
    useEffect(() => {
        const fetchId = async () => {
            if (user?.id) {
                const id = await getDisplayId(user.id);
                setDisplayId(id);
            }
        };
        fetchId();
    }, [user?.id]);

    // Check for changes
    const hasChanges = useMemo(() => {
        if (!user) return false;
        return (
            fullName !== (user.fullName || "") ||
            username !== (user.username || "") ||
            gender !== (user.gender || "") ||
            email !== (user.email || "") ||
            phone !== (user.phone || "") ||
            address !== (user.address || "") ||
            dateOfBirth !== (user.dateOfBirth || "") ||
            (imageUri !== null && imageUri !== user.imageUri)
        );
    }, [user, fullName, username, gender, email, phone, address, dateOfBirth, imageUri]);

    // Image Picker
    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setImageUri(result.assets[0].uri);
                showToast("Image selected successfully", "success");
            }
        } catch (error) {
            showToast(`Image picker error: ${error.message}`, "error");
        }
    };

    // Save Profile
    const saveProfile = useCallback(async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsLoading(true);
        try {
            let uploadedImageUri = imageUri;

            if (imageUri && imageUri.startsWith('file://')) {
                uploadedImageUri = await uploadImage(imageUri);
            }

            const updatedData = {
                fullName,
                username,
                gender,
                email,
                phone,
                address,
                dateOfBirth,
                imageUri: uploadedImageUri,
            };

            await updateProfile(updatedData);
            await syncUserData();

            if (uploadedImageUri) {
                setImageUri(uploadedImageUri);
            }

            showToast("Profile updated successfully", "success");
            return true;
        } catch (error) {
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                "Failed to update profile";
            showToast(errorMessage, "error");
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [
        imageUri,
        uploadImage,
        fullName,
        username,
        gender,
        email,
        phone,
        address,
        dateOfBirth,
        updateProfile,
        syncUserData,
        showToast
    ]);

    // Delete Account
    const deleteAccount = async (router) => {
        setIsDeleting(true);
        try {
            const result = await authDeleteAccount();
            if (result.success) {
                showToast("Account deleted successfully", "success");
                router.replace("/(auth)/login");
                return true;
            } else {
                showToast(result.message, "error");
                return false;
            }
        } catch (error) {
            showToast("Failed to delete account", "error");
            return false;
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        // State
        formState: {
            fullName, setFullName,
            username, setUsername,
            gender, setGender,
            email, setEmail,
            phone, setPhone,
            address, setAddress,
            dateOfBirth, setDateOfBirth,
            imageUri
        },
        displayId,
        isDataLoading,
        isLoading,
        isDeleting,
        hasChanges,
        
        // Actions
        pickImage,
        saveProfile,
        deleteAccount
    };
};
