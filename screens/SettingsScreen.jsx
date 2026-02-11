"use client";

import { ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSettingsLogic } from "../hooks/settings/useSettingsLogic";
import SettingsSection from "../components/settings/SettingsSection";
import SettingsItem from "../components/settings/SettingsItem";

export default function SettingsScreen() {
    const { state, actions } = useSettingsLogic();
    const {
        isDarkMode,
        preferences,
        user,
        fadeAnim,
        slideAnim,
        backgroundColors,
        colors,
        layout,
        passwordRoute,
    } = state;

    const { handleScroll, togglePreference, router } = actions;

    return (
        <LinearGradient colors={backgroundColors} style={styles.container}>
            <ScrollView
                contentContainerStyle={{
                    paddingTop: layout.topPadding,
                    paddingBottom: layout.bottomPadding,
                }}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={handleScroll}
            >
                {/* NOTIFICATIONS Section */}
                <SettingsSection
                    title="NOTIFICATIONS"
                    fadeAnim={fadeAnim}
                    slideAnim={slideAnim}
                    colors={colors}
                >
                    <SettingsItem
                        icon="notifications"
                        title="All Notifications"
                        subtitle="Receive all app alerts"
                        type="switch"
                        value={preferences?.notificationsEnabled}
                        onPress={() => togglePreference("notificationsEnabled")}
                        disabled={!preferences}
                        isDarkMode={isDarkMode}
                        colors={colors}
                    />
                    <SettingsItem
                        icon="calendar"
                        title="Appointment Reminders"
                        subtitle="Before scheduled visits"
                        type="switch"
                        value={preferences?.appointmentReminders}
                        onPress={() => togglePreference("appointmentReminders")}
                        disabled={!preferences || !preferences.notificationsEnabled}
                        isDarkMode={isDarkMode}
                        colors={colors}
                    />
                    <SettingsItem
                        icon="medical"
                        title="Emergency Updates"
                        subtitle="Critical SOS notifications"
                        type="switch"
                        value={preferences?.emergencyUpdates}
                        onPress={() => togglePreference("emergencyUpdates")}
                        disabled={!preferences || !preferences.notificationsEnabled}
                        isDarkMode={isDarkMode}
                        colors={colors}
                    />
                    <SettingsItem
                        icon="volume-high"
                        title="Notification Sounds"
                        subtitle="Play sound for alerts"
                        type="switch"
                        value={preferences?.notificationSoundsEnabled}
                        onPress={() => togglePreference("notificationSoundsEnabled")}
                        // Sound can be toggled independently of global notifications usually, or depends on them? Original code had !preferences.notificationsEnabled check for others but sound had only !preferences check? Let's check original.
                        // Original for sound: disabled={!preferences} (line 394). Wait, opacity line 406 says: opacity: !preferences || !preferences.notificationsEnabled ? 0.5 : 1
                        // So it seems it WAS disabled visually if notifications were off. Let's replicate that behavior.
                        disabled={!preferences || !preferences.notificationsEnabled} 
                        isDarkMode={isDarkMode}
                        colors={colors}
                    />
                </SettingsSection>

                {/* PRIVACY Section */}
                <SettingsSection
                    title="PRIVACY"
                    fadeAnim={fadeAnim}
                    slideAnim={slideAnim}
                    colors={colors}
                >
                    <SettingsItem
                        icon="document-text"
                        title="Share Medical Profile"
                        subtitle="In SOS requests only"
                        type="switch"
                        value={preferences?.privacyShareMedicalProfile}
                        onPress={() => togglePreference("privacyShareMedicalProfile")}
                        disabled={!preferences}
                        isDarkMode={isDarkMode}
                        colors={colors}
                    />
                    <SettingsItem
                        icon="people"
                        title="Share Emergency Contacts"
                        subtitle="In SOS requests only"
                        type="switch"
                        value={preferences?.privacyShareEmergencyContacts}
                        onPress={() => togglePreference("privacyShareEmergencyContacts")}
                        disabled={!preferences}
                        isDarkMode={isDarkMode}
                        colors={colors}
                    />
                </SettingsSection>

                {/* ACCOUNT SECURITY Section */}
                <SettingsSection
                    title="ACCOUNT SECURITY"
                    fadeAnim={fadeAnim}
                    slideAnim={slideAnim}
                    colors={colors}
                >
                    <SettingsItem
                        icon="lock-closed"
                        title={user?.hasPassword ? "Change Password" : "Create Password"}
                        subtitle={user?.hasPassword ? "Update your password" : "Secure your account"}
                        type="link"
                        onPress={() => router.push(passwordRoute)}
                        isDarkMode={isDarkMode}
                        colors={colors}
                    />
                </SettingsSection>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
});
