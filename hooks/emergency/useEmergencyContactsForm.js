import { useState, useCallback, useRef } from "react";
import { Animated, LayoutAnimation, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { useEmergencyContacts } from "./useEmergencyContacts";
import { useToast } from "../../contexts/ToastContext";
import useSwipeGesture from "../../utils/useSwipeGesture";

export const useEmergencyContactsForm = () => {
    const {
        contacts,
        isLoading: isContactsLoading,
        refreshContacts,
        addContact,
        updateContact,
        removeContact,
    } = useEmergencyContacts();
    const { showToast } = useToast();

    // UI State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [step, setStep] = useState(0);
    const [editingId, setEditingId] = useState(null);
    const [selectedContacts, setSelectedContacts] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        relationship: "",
        phone: "",
        email: ""
    });
    const [phoneValid, setPhoneValid] = useState(false);

    // Animations
    const [shakeAnim] = useState(new Animated.Value(0));

    // Validation Logic
    const canSave = () => {
        if (step === 0) return formData.name.trim().length >= 2;
        if (step === 1) return phoneValid || formData.email.trim().length > 0;
        return true;
    };

    const getInputValidation = (field, value) => {
        switch (field) {
            case 'name':
                if (value.trim().length === 0) return { valid: false, message: '' };
                if (value.trim().length < 2) return { valid: false, message: 'Name too short' };
                return { valid: true, message: 'Looks good!' };
            case 'phone':
                if (!phoneValid && value.trim().length > 0) return { valid: false, message: 'Invalid phone' };
                if (phoneValid) return { valid: true, message: 'Valid phone' };
                return { valid: false, message: '' };
            case 'email':
                if (value.trim().length === 0) return { valid: false, message: '' };
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) return { valid: false, message: 'Invalid email' };
                return { valid: true, message: 'Valid email' };
            case 'relationship':
                if (value.trim().length === 0) return { valid: false, message: '' };
                return { valid: true, message: 'Nice!' };
            default:
                return { valid: false, message: '' };
        }
    };

    // Actions
    const shake = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const transitionStep = (newStep) => {
        if (newStep < 0 || newStep > 2) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStep(newStep);
    };

    const attemptNextStep = () => {
        if (canSave()) {
            transitionStep(step + 1);
        } else {
            shake();
        }
    };

    const swipeHandlers = useSwipeGesture(
        () => {
            // Swipe Left -> Next
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 2, duration: 100, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
            ]).start();

            if (canSave()) {
                transitionStep(step + 1);
            } else {
                shake();
            }
        },
        () => {
            // Swipe Right -> Back
            if (step > 0) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                transitionStep(step - 1);
            }
        }
    );

    const openCreate = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingId(null);
        setFormData({ name: "", relationship: "", phone: "", email: "" });
        setStep(0);
        setIsModalVisible(true);
    }, []);

    const openEdit = useCallback((contact) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingId(contact?.id ? String(contact.id) : null);
        setFormData({
            name: typeof contact?.name === "string" ? contact.name : "",
            relationship: typeof contact?.relationship === "string" ? contact.relationship : "",
            phone: typeof contact?.phone === "string" ? contact.phone : "",
            email: typeof contact?.email === "string" ? contact.email : ""
        });
        setStep(0);
        setIsModalVisible(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalVisible(false);
        setStep(0);
    }, []);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            if (editingId) {
                await updateContact(editingId, formData);
                showToast("Contact updated successfully", "success");
            } else {
                await addContact(formData);
                showToast("Contact added successfully", "success");
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsModalVisible(false);
        } catch (e) {
            const msg = e?.message?.split("|")?.[1] || e?.message || "Unable to save contact";
            showToast(msg, "error");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsSaving(false);
        }
    }, [editingId, formData, addContact, updateContact, showToast]);

    const handleDelete = useCallback(async (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await removeContact(id);
            showToast("Contact deleted successfully", "success");
        } catch (error) {
            showToast("Failed to delete contact", "error");
        }
    }, [removeContact, showToast]);

    const handleToggleSelect = useCallback((contactId) => {
        setSelectedContacts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(contactId)) {
                newSet.delete(contactId);
            } else {
                newSet.add(contactId);
            }
            return newSet;
        });
    }, []);

    const clearSelection = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedContacts(new Set());
    }, []);

    const handleBulkDelete = useCallback(() => {
        if (selectedContacts.size === 0) return;
        
        Alert.alert(
            `Delete ${selectedContacts.size} Contact${selectedContacts.size > 1 ? 's' : ''}`,
            `Are you sure you want to delete ${selectedContacts.size} selected contact${selectedContacts.size > 1 ? 's' : ''}? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        try {
                            const deletePromises = Array.from(selectedContacts).map(id => removeContact(id));
                            await Promise.all(deletePromises);
                            showToast(`${selectedContacts.size} contact${selectedContacts.size > 1 ? 's' : ''} deleted successfully`, "success");
                            setSelectedContacts(new Set());
                        } catch (error) {
                            showToast("Failed to delete some contacts", "error");
                        }
                    }
                }
            ]
        );
    }, [selectedContacts, removeContact, showToast]);

    return {
        // Data
        contacts,
        isContactsLoading,
        refreshContacts,

        // UI State
        isModalVisible,
        step,
        editingId,
        selectedContacts,
        isSaving,
        shakeAnim,
        swipeHandlers,

        // Form State
        formData,
        setFormData,
        setPhoneValid,

        // Methods
        openCreate,
        openEdit,
        closeModal,
        handleSave,
        handleDelete,
        handleToggleSelect,
        clearSelection,
        handleBulkDelete,
        attemptNextStep,
        transitionStep,
        canSave,
        getInputValidation
    };
};