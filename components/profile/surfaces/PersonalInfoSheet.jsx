import React, { useCallback, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import InputModal from "../../ui/InputModal";
import ProfileField from "../../form/ProfileField";
import { COLORS } from "../../../constants/colors";
import * as Haptics from "expo-haptics";

// PULLBACK NOTE: PersonalInfoSheet - Progressive modal for personal information editing
// Following insurance page modal pattern (InputModal)
// REASON: Succinct, progressive, keyboard-aware modal instead of bottom sheet

export default function PersonalInfoSheet({
  visible,
  onClose,
  formState,
  saveProfile,
  isDarkMode,
}) {
  const {
    fullName,
    setFullName,
    username,
    setUsername,
    gender,
    setGender,
    email,
    setEmail,
    phone,
    setPhone,
    address,
    setAddress,
    dateOfBirth,
    setDateOfBirth,
  } = formState;

  const [isSaving, setIsSaving] = useState(false);

  // Handle save with feedback
  const handleSave = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    try {
      await saveProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  }, [saveProfile, onClose]);

  return (
    <InputModal
      visible={visible}
      onClose={onClose}
      title="Personal Information"
      primaryAction={handleSave}
      primaryActionLabel="Save"
      loading={isSaving}
      secondaryAction={onClose}
      secondaryActionLabel="Cancel"
      modalPresentationMode="centered-modal"
      modalMaxWidth={520}
      allowDismissWhileLoading={false}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
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
          <ProfileField
            label="Gender"
            value={gender}
            onChange={setGender}
            iconName="transgender-outline"
          />
          <ProfileField
            label="Email Address"
            value={email}
            onChange={setEmail}
            iconName="mail-outline"
            keyboardType="email-address"
          />
          <ProfileField
            label="Phone Number"
            value={phone}
            onChange={setPhone}
            iconName="call-outline"
            keyboardType="phone-pad"
          />
          <ProfileField
            label="Address"
            value={address}
            onChange={setAddress}
            iconName="location-outline"
          />
          <ProfileField
            label="Date of Birth"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            iconName="calendar-outline"
          />
        </View>
      </ScrollView>
    </InputModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
});
