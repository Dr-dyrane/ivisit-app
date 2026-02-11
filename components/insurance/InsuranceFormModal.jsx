import React, { useMemo } from 'react';
import { View, Animated } from 'react-native';
import InputModal from "../ui/InputModal";
import { useTheme } from "../../contexts/ThemeContext";
import { useInsuranceFormLogic } from "../../hooks/insurance/useInsuranceFormLogic";
import { styles } from "./InsuranceFormModal.styles";

// Step Components
import ProviderStep from "./steps/ProviderStep";
import PolicyStep from "./steps/PolicyStep";
import UploadStep from "./steps/UploadStep";

export default function InsuranceFormModal({
    visible,
    onClose,
    initialData,
    onSuccess
}) {
    const { isDarkMode } = useTheme();
    const {
        step,
        formData,
        setFormData,
        isScanning,
        submitting,
        shakeAnim,
        swipeHandlers,
        handleScanInsuranceCard,
        pickImage,
        attemptNextStep,
        transitionStep,
        handleSubmit,
        getInputValidation
    } = useInsuranceFormLogic({ initialData, onSuccess, onClose });

    const colors = useMemo(() => ({
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    }), [isDarkMode]);

    const validation = {
        provider_name: getInputValidation('provider_name', formData.provider_name),
        policy_number: getInputValidation('policy_number', formData.policy_number),
        group_number: getInputValidation('group_number', formData.group_number),
        policy_holder_name: getInputValidation('policy_holder_name', formData.policy_holder_name)
    };

    const primaryActionLabel = step === 2 ? (initialData ? "Save Changes" : "Link Identity") : "Next";
    const isDisabled = (step === 0 && !validation.provider_name.valid) || (step === 1 && !validation.policy_number.valid);

    const modalTitle = initialData
        ? "Update Policy"
        : step === 0
            ? "Insurance Provider"
            : step === 1
                ? "Policy Details"
                : "Upload Images";

    return (
        <InputModal
            visible={visible}
            onClose={onClose}
            title={modalTitle}
            primaryAction={step === 2 ? handleSubmit : attemptNextStep}
            primaryActionLabel={submitting ? "Saving..." : primaryActionLabel}
            disabled={isDisabled || submitting}
            secondaryAction={step > 0 ? () => transitionStep(step - 1) : onClose}
            secondaryActionLabel={step > 0 ? "Back" : "Cancel"}
        >
            {/* Progress Vital Signal */}
            <View style={styles.vitalTrack}>
                <View
                    style={[styles.vitalFill, { width: `${((step + 1) / 3) * 100}%` }]}
                />
                <View
                    style={[styles.vitalPlow, { left: `${((step + 1) / 3) * 100}%` }]}
                />
            </View>

            <Animated.View style={[styles.stepContainer, { transform: [{ translateX: shakeAnim }] }]} {...swipeHandlers}>
                {step === 0 && (
                    <ProviderStep
                        formData={formData}
                        setFormData={setFormData}
                        validation={validation}
                        attemptNextStep={attemptNextStep}
                        handleScanInsuranceCard={handleScanInsuranceCard}
                        isScanning={isScanning}
                        isDarkMode={isDarkMode}
                        colors={colors}
                    />
                )}

                {step === 1 && (
                    <PolicyStep
                        formData={formData}
                        setFormData={setFormData}
                        validation={validation}
                        attemptNextStep={attemptNextStep}
                    />
                )}

                {step === 2 && (
                    <UploadStep
                        formData={formData}
                        setFormData={setFormData}
                        validation={validation}
                        pickImage={pickImage}
                        isDarkMode={isDarkMode}
                        colors={colors}
                    />
                )}
            </Animated.View>
        </InputModal>
    );
}
