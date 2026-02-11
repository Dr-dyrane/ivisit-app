// components/register/PhoneInputField.jsx

import React from "react";
import { View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { usePhoneInputLogic } from "../../hooks/register/usePhoneInputLogic";
import CountryPickerModal from "./CountryPickerModal";
import * as Haptics from "expo-haptics";
import {
    PhoneLoadingState,
    PhoneInputContainer,
    ContinueButton,
    PhoneErrorText,
    PhoneHelperText
} from "./PhoneInputUI";

/**
 * PhoneInputField - iVisit Registration
 *
 * Modular phone input component for emergency medical services
 * Features full deletion support and clear functionality
 */
export default function PhoneInputField({
    onValidChange,
    onSubmit,
    initialValue = null,
    loading = false,
}) {
    const { isDarkMode } = useTheme();
    const { state, actions, refs } = usePhoneInputLogic({ 
        onValidChange, 
        onSubmit, 
        initialValue 
    });

    if (state.countryLoading || !state.country) {
        return <PhoneLoadingState colors={state.colors} />;
    }

    return (
        <View>
            <PhoneInputContainer
                country={state.country}
                formattedNumber={state.formattedNumber}
                rawInput={state.rawInput}
                isValid={state.isValid}
                colors={state.colors}
                shakeAnim={refs.shakeAnim}
                inputRef={refs.inputRef}
                onPickerOpen={() => actions.setPickerVisible(true)}
                onChangeText={actions.handleInputChange}
                onClear={actions.handleClearInput}
            />

            <CountryPickerModal
                visible={state.pickerVisible}
                onClose={() => actions.setPickerVisible(false)}
                onSelect={(selectedCountry) => {
                    actions.setCountry(selectedCountry);
                    actions.clear();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
            />

            <ContinueButton
                isValid={state.isValid}
                loading={loading}
                onPress={actions.handleContinue}
                buttonScale={refs.buttonScale}
                isDarkMode={isDarkMode}
            />

            <PhoneErrorText
                isValid={state.isValid}
                rawInput={state.rawInput}
                countryName={state.country.name}
            />

            <PhoneHelperText />
        </View>
    );
}
