import { useState, useCallback, useRef, useEffect } from "react";
import { Alert, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { insuranceService } from "../../services/insuranceService";
import { notificationDispatcher } from "../../services/notificationDispatcher";

export const useInsuranceLogic = () => {
    // --- State ---
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Modal Visibility
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    
    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [selectedPolicyForPayment, setSelectedPolicyForPayment] = useState(null);

    // Animations (for the screen list)
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // --- Helpers ---

    const fetchPolicies = useCallback(async () => {
        try {
            const data = await insuranceService.list();
            setPolicies(data);
            
            // Animate in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]).start();

        } catch (error) {
            console.error("Failed to fetch policies:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fadeAnim, slideAnim]);

    // --- CRUD Operations ---

    const openCreate = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingId(null);
        setShowAddModal(true);
    }, []);

    const handleEdit = useCallback((policy) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingId(policy.id);
        setShowAddModal(true);
    }, []);

    const handleDelete = useCallback(async (id, isDefault) => {
        if (isDefault) {
            Alert.alert("Cannot Delete", "This is your default insurance scheme. Please set another scheme as default before removing this one.");
            return;
        }

        Alert.alert(
            "Remove Policy",
            "Are you sure you want to remove this insurance policy? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await insuranceService.delete(id);
                            await notificationDispatcher.dispatchInsuranceEvent("deleted", { id });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            await fetchPolicies();
                        } catch (error) {
                            Alert.alert("Error", error.message || "Failed to delete policy.");
                        }
                    },
                },
            ]
        );
    }, [fetchPolicies]);

    const handleSetDefault = useCallback(async (id) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await insuranceService.setDefault(id);
            await fetchPolicies();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            Alert.alert("Error", "Failed to set default policy.");
        }
    }, [fetchPolicies]);

    // Payment Handlers (Keep these as they were likely used in the screen)
    const handleLinkPayment = useCallback((policy) => {
        setSelectedPolicyForPayment(policy);
        setShowPaymentModal(true);
    }, []);

    const handlePaymentSubmit = useCallback(async (paymentData) => {
        // ... implement payment logic if needed or it might be handled in the modal
        // For now, just close modal
        setShowPaymentModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, []);

    return {
        policies,
        loading,
        refreshing,
        setRefreshing,
        fetchPolicies,
        openCreate,
        handleEdit,
        handleDelete,
        handleSetDefault,
        handleLinkPayment,
        handlePaymentSubmit,
        fadeAnim,
        slideAnim,
        showAddModal,
        setShowAddModal,
        showPaymentModal,
        setShowPaymentModal,
        editingId,
    };
};
