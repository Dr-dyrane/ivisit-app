import { useState, useCallback, useRef, useEffect } from "react";
import { Alert, LayoutAnimation, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from 'expo-image-picker';
import { insuranceService } from "../../services/insuranceService";
import { ocrService } from "../../services/ocrService";
import { notificationDispatcher } from "../../services/notificationDispatcher";
import useSwipeGesture from "../../utils/useSwipeGesture";

export const useInsuranceFormLogic = ({ initialData, onSuccess, onClose }) => {
    // --- State ---
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    
    const [formData, setFormData] = useState({
        provider_name: "",
        policy_number: "",
        group_number: "",
        policy_holder_name: "",
        front_image_url: "",
        back_image_url: ""
    });

    // Animations
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // --- Initialization ---
    useEffect(() => {
        if (initialData) {
            setFormData({
                provider_name: initialData.provider_name,
                policy_number: initialData.policy_number,
                group_number: initialData.group_number || "",
                policy_holder_name: initialData.policy_holder_name || "",
                front_image_url: initialData.front_image_url || "",
                back_image_url: initialData.back_image_url || ""
            });
        } else {
            setFormData({
                provider_name: "",
                policy_number: "",
                group_number: "",
                policy_holder_name: "",
                front_image_url: "",
                back_image_url: ""
            });
        }
        setStep(0);
    }, [initialData]);

    // --- Validation ---
    const getInputValidation = useCallback((field, value) => {
        switch (field) {
            case 'provider_name':
                if (value.trim().length === 0) return { valid: false, message: '' };
                if (value.trim().length < 3) return { valid: false, message: 'Provider name too short' };
                return { valid: true, message: 'Got it!' };
            case 'policy_number':
                if (value.trim().length === 0) return { valid: false, message: '' };
                const policyRegex = /^[A-Z0-9\-\s]+$/i;
                if (!policyRegex.test(value)) return { valid: false, message: 'Use letters, numbers, and dashes only' };
                if (value.replace(/[^A-Z0-9]/gi, '').length < 5) return { valid: false, message: 'Policy number too short (min 5 chars)' };
                return { valid: true, message: 'Perfect!' };
            case 'group_number':
                if (value.trim().length === 0) return { valid: false, message: '' };
                const groupRegex = /^[A-Z0-9\-\s]+$/i;
                if (!groupRegex.test(value)) return { valid: false, message: 'Use letters, numbers, and dashes only' };
                return { valid: true, message: 'Optional added' };
            case 'policy_holder_name':
                if (value.trim().length === 0) return { valid: false, message: '' };
                return { valid: true, message: 'Nice!' };
            default:
                return { valid: false, message: '' };
        }
    }, []);

    const canSave = useCallback(() => {
        if (step === 0) return formData.provider_name.trim().length >= 3;
        if (step === 1) {
            const policyValidation = getInputValidation('policy_number', formData.policy_number);
            return policyValidation.valid;
        }
        if (step === 2) return true;
        return true;
    }, [step, formData, getInputValidation]);

    // --- Actions ---
    const shake = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const transitionStep = useCallback((newStep) => {
        if (newStep < 0 || newStep > 2) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStep(newStep);
    }, []);

    const attemptNextStep = useCallback(() => {
        if (canSave()) {
            transitionStep(step + 1);
        } else {
            shake();
        }
    }, [canSave, step, transitionStep, shake]);

    const swipeHandlers = useSwipeGesture(
        () => { // Swipe Left -> Next
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 2, duration: 100, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
            ]).start();
            if (canSave()) transitionStep(step + 1);
            else shake();
        },
        () => { // Swipe Right -> Back
            if (step > 0) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                transitionStep(step - 1);
            }
        }
    );

    // --- OCR & Image ---
    const handleScanInsuranceCard = useCallback(async () => {
        setIsScanning(true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Required", "Camera access is needed to scan your card.");
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 10],
                quality: 0.8,
            });

            if (!result.canceled) {
                const uri = result.assets[0].uri;
                const scanResult = await ocrService.scanCard(uri);
                if (scanResult.success) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setFormData(prev => ({
                        ...prev,
                        provider_name: prev.provider_name || scanResult.data.provider_name,
                        policy_number: prev.policy_number || scanResult.data.policy_number,
                        group_number: prev.group_number || scanResult.data.group_number,
                        policy_holder_name: prev.policy_holder_name || scanResult.data.policy_holder_name,
                        front_image_url: uri
                    }));
                    Alert.alert("Success", "Card scanned and details extracted.");
                } else {
                    setFormData(prev => ({ ...prev, front_image_url: uri }));
                    Alert.alert("Scanned", "Image captured, but could not read text. Please enter details manually.");
                }
            }
        } catch (error) {
            console.error("OCR Error:", error);
            Alert.alert("Error", "Failed to scan card.");
        } finally {
            setIsScanning(false);
        }
    }, []);

    const pickImage = useCallback(async (field) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 10],
                quality: 0.8,
            });

            if (!result.canceled) {
                setFormData(prev => ({ ...prev, [field]: result.assets[0].uri }));
            }
        } catch (error) {
            console.error("Image Picker Error:", error);
        }
    }, []);

    // --- Submission ---
    const handleSubmit = useCallback(async () => {
        setSubmitting(true);
        try {
            let finalData = { ...formData };
            // Upload images
            if (formData.front_image_url && formData.front_image_url.startsWith('file://')) {
                const publicUrl = await insuranceService.uploadImage(formData.front_image_url);
                finalData.front_image_url = publicUrl;
            }
            if (formData.back_image_url && formData.back_image_url.startsWith('file://')) {
                const publicUrl = await insuranceService.uploadImage(formData.back_image_url);
                finalData.back_image_url = publicUrl;
            }

            if (initialData?.id) {
                await insuranceService.update(initialData.id, finalData);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                const newPolicy = await insuranceService.create(finalData);
                await notificationDispatcher.dispatchInsuranceEvent("created", newPolicy);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            if (onSuccess) onSuccess();
            if (onClose) onClose();
            
            // Reset logic handled by useEffect on initialData change or unmount if needed
        } catch (error) {
            console.error(error);
            Alert.alert("Error", `Failed to ${initialData?.id ? "update" : "add"} policy. Please try again.`);
        } finally {
            setSubmitting(false);
        }
    }, [formData, initialData, onSuccess, onClose]);

    return {
        step,
        formData,
        setFormData,
        isScanning,
        submitting,
        shakeAnim,
        swipeHandlers,
        handleScanInsuranceCard,
        pickImage,
        attemptNextStep,
        transitionStep,
        handleSubmit,
        getInputValidation
    };
};
