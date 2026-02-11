// components/register/EmailInputField.jsx

import React from "react";
import { View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useEmailInputLogic } from "../../hooks/register/useEmailInputLogic";
import {
    EmailInputContainer,
    ContinueButton,
    EmailErrorText,
    EmailHelperText
} from "./EmailInputUI";

/**
 * EmailInputField - iVisit Registration
 *
 * Modular email input with clear functionality
 * Matches phone input UX patterns
 */
export default function EmailInputField({
    onValidChange,
    onSubmit,
    initialValue = "",
}) {
    const { isDarkMode } = useTheme();
    const { state, actions, refs } = useEmailInputLogic({ 
        onValidChange, 
        onSubmit, 
        initialValue 
    });

    return (
        <View>
            <EmailInputContainer
                email={state.email}
                isValid={state.isValid}
                colors={state.colors}
                shakeAnim={refs.shakeAnim}
                inputRef={refs.inputRef}
                onChangeText={actions.handleEmailChange}
                onClear={actions.handleClearInput}
                onSubmitEditing={actions.handleContinue}
            />

            <ContinueButton
                isValid={state.isValid}
                onPress={actions.handleContinue}
                buttonScale={refs.buttonScale}
                isDarkMode={isDarkMode}
            />

            <EmailErrorText
                isValid={state.isValid}
                email={state.email}
            />

            <EmailHelperText />
        </View>
    );
}
