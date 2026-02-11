// components/register/PasswordInputField.jsx

import React from "react";
import { View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { usePasswordInputLogic } from "../../hooks/register/usePasswordInputLogic";
import {
    PasswordInputContainer,
    ContinueButton,
    ActionLinks,
    PasswordErrorText,
    PasswordHelperText
} from "./PasswordInputUI";

/**
 * PasswordInputField - iVisit
 * Reusable password input with toggle visibility
 * Used in both registration and login flows
 */
export default function PasswordInputField({
    onSubmit,
    onSkip = null,
    showSkipOption = false,
    showForgotPassword = false,
    onForgotPassword = null,
    showOtpOption = false,
    onOtpPress = null,
    loading = false,
}) {
    const { isDarkMode } = useTheme();
    const { state, actions, refs } = usePasswordInputLogic({ 
        onSubmit, 
        onSkip, 
        loading 
    });

    return (
        <View>
            <PasswordInputContainer
                password={state.password}
                showPassword={state.showPassword}
                colors={state.colors}
                shakeAnim={refs.shakeAnim}
                inputRef={refs.inputRef}
                onChangeText={actions.setPassword}
                onToggleVisibility={actions.setShowPassword}
                onSubmitEditing={actions.handleContinue}
                onFocus={() => actions.setIsFocused(true)}
                onBlur={() => actions.setIsFocused(false)}
                isDarkMode={isDarkMode}
            />

            <ContinueButton
                isValid={state.isValid}
                loading={loading}
                onPress={actions.handleContinue}
                buttonScale={refs.buttonScale}
                isDarkMode={isDarkMode}
            />

            <ActionLinks
                showForgotPassword={showForgotPassword}
                onForgotPassword={onForgotPassword}
                showOtpOption={showOtpOption}
                onOtpPress={onOtpPress}
                showSkipOption={showSkipOption}
                onSkip={onSkip}
                onSkipPress={actions.handleSkipPress}
            />

            <PasswordErrorText
                isValid={state.isValid}
                password={state.password}
            />

            <PasswordHelperText showForgotPassword={showForgotPassword} />
        </View>
    );
}
