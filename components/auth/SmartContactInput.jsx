// components/auth/SmartContactInput.jsx

import React from "react";
import { View, Animated, StyleSheet } from "react-native";
import CountryPickerModal from "../register/CountryPickerModal";
import { useSmartContactInput } from "../../hooks/auth/useSmartContactInput";
import {
    LoadingState,
    ErrorState,
    InputIcon,
    ContactInputField,
    ValidationIcon,
    ContinueButton,
    FooterNote
} from "./SmartContactInputUI";
import * as Haptics from "expo-haptics";

/**
 * SmartContactInput
 * 
 * A unified input component that detects if the user is typing
 * an email or a phone number and adapts the UI/Validation accordingly.
 */
export default function SmartContactInput({
    onSubmit,
    initialValue = "",
    loading: isSubmitting = false,
}) {
    const { state, actions, refs } = useSmartContactInput({ initialValue, onSubmit });

    if (state.countryError) {
        return <ErrorState onRetry={() => actions.setCountryError(false)} />;
    }

    if (state.countryLoading || !state.country) {
        return <LoadingState />;
    }

    return (
        <View>
            <Animated.View style={{ transform: [{ translateX: refs.shakeAnim }] }}>
                <View
                    style={[
                        styles.inputContainer,
                        {
                            backgroundColor: state.colors.inputBg,
                            borderColor: state.colors.border,
                        }
                    ]}
                >
                    <InputIcon
                        contactType={state.contactType}
                        country={state.country}
                        iconOpacity={refs.iconOpacity}
                        onFlagPress={() => actions.setPickerVisible(true)}
                        colors={state.colors}
                    />

                    <ContactInputField
                        inputRef={refs.inputRef}
                        value={state.contactType === "phone" ? state.formattedNumber : state.rawText}
                        onChangeText={actions.handleTextChange}
                        onSubmitEditing={actions.handleContinue}
                        onFocus={() => actions.setIsFocused(true)}
                        onBlur={() => actions.setIsFocused(false)}
                        placeholder="Email or Phone"
                        colors={state.colors}
                    />

                    {state.rawText.length > 0 && (
                        <ValidationIcon
                            isValid={state.isValid}
                            onClear={actions.handleClear}
                            colors={state.colors}
                        />
                    )}
                </View>
            </Animated.View>

            <CountryPickerModal
                visible={state.pickerVisible}
                onClose={() => actions.setPickerVisible(false)}
                onSelect={(c) => {
                    actions.setCountry(c);
                    actions.setPickerVisible(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
            />

            <ContinueButton
                onPress={actions.handleContinue}
                isValid={state.isValid}
                isSubmitting={isSubmitting}
                buttonScale={refs.buttonScale}
                colors={state.colors}
            />

            <FooterNote
                contactType={state.contactType}
                countryName={state.country.name}
                colors={state.colors}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 24,
        height: 80,
        borderWidth: 1.5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
});
