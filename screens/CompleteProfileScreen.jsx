"use client";

import { useCallback } from "react";
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS } from "../constants/colors";
import ProfileField from "../components/form/ProfileField";
import HeaderBackButton from "../components/navigation/HeaderBackButton";

import { useCompleteProfileScreenLogic } from "../hooks/user/useCompleteProfileScreenLogic";
import { styles } from "./CompleteProfileScreen.styles";

export default function CompleteProfileScreen() {
    const { state, actions } = useCompleteProfileScreenLogic();
    const {
        fullName,
        username,
        normalizedUsername,
        user,
        isSaving,
        canSave,
        fadeAnim,
        slideAnim,
        backgroundColors,
        colors,
        topPadding,
        bottomPadding,
    } = state;

    const {
        setFullName,
        setUsername,
        handleSave,
        handleSignOut,
        handleScroll,
        resetTabBar,
        resetHeader,
        setHeaderState,
    } = actions;

    const signOutButton = useCallback(
        () => (
            <Pressable
                onPress={handleSignOut}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
                <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
            </Pressable>
        ),
        [handleSignOut]
    );

    useFocusEffect(
        useCallback(() => {
            resetTabBar();
            resetHeader();
            setHeaderState({
                title: "Complete Your Profile",
                subtitle: "REQUIRED",
                icon: <Ionicons name="person" size={26} color="#FFFFFF" />,
                backgroundColor: COLORS.brandPrimary,
                leftComponent: null,
                rightComponent: signOutButton(),
            });
        }, [resetHeader, resetTabBar, setHeaderState, signOutButton])
    );

    return (
        <LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
            <Animated.ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingTop: topPadding, paddingBottom: bottomPadding },
                ]}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={handleScroll}
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                }}
            >
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Let’s set up your account
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        We need your name and a username to personalize visits, bookings, and
                        emergency flows.
                    </Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                        Verified Contact
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.text }]}>
                        {user?.emailVerified && user?.email ? user.email : user?.phone ?? user?.email ?? "--"}
                    </Text>
                    <Text style={[styles.helperText, { color: colors.textMuted }]}>
                        {user?.emailVerified || user?.phoneVerified ? "Verified" : "Not verified"}
                    </Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <ProfileField
                        label="Full Name"
                        value={fullName}
                        onChange={setFullName}
                        iconName="person-outline"
                    />
                    <ProfileField
                        label="Username"
                        value={username}
                        onChange={setUsername}
                        iconName="at-outline"
                    />

                    <View style={styles.helperRow}>
                        <Ionicons name="sparkles-outline" size={16} color={COLORS.brandPrimary} />
                        <Text style={[styles.helperText, { color: colors.textMuted }]}>
                            We’ll save as @{normalizedUsername || "username"}
                        </Text>
                    </View>

                    <Pressable
                        disabled={!canSave || isSaving}
                        onPress={handleSave}
                        style={({ pressed }) => [
                            styles.saveButton,
                            {
                                backgroundColor: COLORS.brandPrimary,
                                opacity: !canSave || isSaving ? 0.5 : pressed ? 0.92 : 1,
                            }
                        ]}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        )}
                        <Text style={styles.saveButtonText}>
                            Finish Setup
                        </Text>
                    </Pressable>
                </View>
            </Animated.ScrollView>
        </LinearGradient>
    );
}
