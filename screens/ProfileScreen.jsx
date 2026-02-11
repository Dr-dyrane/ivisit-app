"use client";

import React from "react";
import { View, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { COLORS } from "../constants/colors";
import { useProfileScreenLogic } from "../hooks/profile/useProfileScreenLogic";

// Components
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileFormSection from "../components/profile/ProfileFormSection";
import EmergencyContactsCard from "../components/profile/EmergencyContactsCard";
import MedicalHistoryCard from "../components/profile/MedicalHistoryCard";
import SecuritySection from "../components/profile/SecuritySection";
import DeleteAccountCard from "../components/profile/DeleteAccountCard";

/**
 * ProfileScreen - Orchestrator Component
 * 
 * Uses useProfileScreenLogic to handle all state, effects, and logic.
 * Renders a clean View using dedicated sub-components.
 */
const ProfileScreen = () => {
    const {
        // Data
        user, fullName, email, displayId, imageUri, medicalProfile, emergencyContacts, formState,
        
        // UI State
        isDataLoading, isDeleting, isDarkMode, insets,
        
        // Animations
        fadeAnim, slideAnim, imageScale,
        
        // Actions
        pickImage, formHandlers, handleDeleteAccountPress, handleScroll, handlePasswordNavigation, syncUserData,
        
        // Setup
        registerSaveFab, setupHeader,
        
        // Navigation Helpers
        navigateToEmergencyContacts, navigateToMedicalProfile
    } = useProfileScreenLogic();

    // Lifecycle Effects
    useFocusEffect(React.useCallback(() => {
        syncUserData();
        setupHeader();
        return registerSaveFab();
    }, [syncUserData, setupHeader, registerSaveFab]));

    if (isDataLoading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: isDarkMode ? "#0F172A" : "#F8FAFC" }}>
                <ActivityIndicator size="large" color={COLORS.brandPrimary} />
            </View>
        );
    }

    return (
        <LinearGradient
            colors={isDarkMode ? [COLORS.brandPrimary + "20", "#0F172A"] : [COLORS.brandPrimary + "15", "#F8FAFC"]}
            style={{ flex: 1 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    <ProfileHeader
                        user={user}
                        fullName={fullName}
                        email={email}
                        displayId={displayId}
                        imageUri={imageUri}
                        onPickImage={pickImage}
                        fadeAnim={fadeAnim}
                        slideAnim={slideAnim}
                        imageScale={imageScale}
                    />

                    <ProfileFormSection
                        formState={formState}
                        handlers={formHandlers}
                        fadeAnim={fadeAnim}
                        slideAnim={slideAnim}
                    />

                    <EmergencyContactsCard
                        contacts={emergencyContacts}
                        onPress={navigateToEmergencyContacts}
                        fadeAnim={fadeAnim}
                        slideAnim={slideAnim}
                    />

                    <MedicalHistoryCard
                        medicalProfile={medicalProfile}
                        onPress={navigateToMedicalProfile}
                        fadeAnim={fadeAnim}
                        slideAnim={slideAnim}
                    />

                    <SecuritySection
                        hasPassword={user?.hasPassword}
                        onPress={handlePasswordNavigation}
                        fadeAnim={fadeAnim}
                    />

                    <DeleteAccountCard
                        onDelete={handleDeleteAccountPress}
                        isDeleting={isDeleting}
                        fadeAnim={fadeAnim}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

export default ProfileScreen;
