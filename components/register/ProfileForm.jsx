// components/register/ProfileForm.jsx

import React from "react";
import { View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useProfileFormLogic } from "../../hooks/profile/useProfileFormLogic";
import {
    ProfileHeader,
    AvatarPicker,
    FormInput,
    SubmitButton
} from "./ProfileFormUI";

/**
 * ProfileForm - iVisit Registration
 * ----------------------------------
 * Final step of registration flow:
 *  - Collect first name, last name, and profile image
 *  - Pure UI Component (Dummy UI)
 */
export default function ProfileForm({ onSubmit, loading, initialValues }) {
    const { isDarkMode } = useTheme();
    const { state, actions, refs } = useProfileFormLogic({ 
        onSubmit, 
        loading, 
        initialValues 
    });

    return (
        <View>
            <ProfileHeader colors={state.colors} />

            <AvatarPicker 
                imageUri={state.imageUri} 
                onPickImage={actions.handlePickImage} 
                colors={state.colors} 
            />

            <FormInput
                placeholder="First Name"
                value={state.firstName}
                onChangeText={actions.setFirstName}
                onFocus={() => actions.setCurrentField("firstName")}
                icon="person-outline"
                isFocused={state.currentField === "firstName"}
                shakeAnim={refs.shakeAnim}
                colors={state.colors}
                isDarkMode={isDarkMode}
                autoFocus
            />

            <FormInput
                placeholder="Last Name"
                value={state.lastName}
                onChangeText={actions.setLastName}
                onFocus={() => actions.setCurrentField("lastName")}
                icon="person-outline"
                isFocused={state.currentField === "lastName"}
                shakeAnim={refs.shakeAnim}
                colors={state.colors}
                isDarkMode={isDarkMode}
                returnKeyType="done"
                onSubmitEditing={actions.handleSubmit}
            />

            <SubmitButton 
                isValid={state.isValid} 
                loading={loading} 
                onPress={actions.handleSubmit} 
                buttonScale={refs.buttonScale} 
                isDarkMode={isDarkMode} 
            />
        </View>
    );
}
