// components/emergency/EmergencyContactWizard.jsx
import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import InputModal from "../ui/InputModal";
import Input from "../form/Input";
import PhoneInputField from "../register/PhoneInputField";

export default function EmergencyContactWizard({
    visible,
    onClose,
    editingId,
    step,
    formData,
    setFormData,
    setPhoneValid,
    isSaving,
    shakeAnim,
    swipeHandlers,
    getInputValidation,
    handleSave,
    attemptNextStep,
    transitionStep,
    colors,
    isDarkMode,
    phoneValid
}) {
    return (
        <InputModal
            visible={visible}
            onClose={onClose}
            title={editingId ? "Update Contact" : (step === 0 ? "Who is this?" : step === 1 ? "Contact Info" : "Verify")}
            primaryAction={step === 2 ? handleSave : attemptNextStep}
            primaryActionLabel={step === 2 ? (editingId ? "Save Changes" : "Add Contact") : "Next"}
            disabled={
                (step === 0 && formData.name.trim().length < 2) ||
                (step === 1 && (!phoneValid && !formData.email.trim()))
            }
            secondaryAction={step > 0 ? () => transitionStep(step - 1) : onClose}
            secondaryActionLabel={step > 0 ? "Back" : "Cancel"}
            loading={isSaving}
        >
            {/* Vital Signal Progress */}
            <View style={styles.vitalTrack}>
                <View style={[styles.vitalFill, { width: `${((step + 1) / 3) * 100}%` }]} />
                <View style={[styles.vitalPlow, { left: `${((step + 1) / 3) * 100}%` }]} />
            </View>

            <View style={styles.stepContainer} {...swipeHandlers}>
                <Animated.View style={{ flex: 1, justifyContent: 'center', transform: [{ translateX: shakeAnim }] }}>
                    {step === 0 && (
                        <View style={{ gap: 16 }}>
                            <View style={{ alignSelf: 'center', marginBottom: 8 }}>
                                <View style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: COLORS.brandPrimary + '15',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="person" size={40} color={COLORS.brandPrimary} />
                                </View>
                            </View>
                            <View>
                                <Input
                                    label="Full Name"
                                    placeholder="e.g. Jane Doe"
                                    value={formData.name}
                                    onChangeText={(t) => setFormData(prev => ({ ...prev, name: t }))}
                                    icon="person"
                                    autoFocus
                                    returnKeyType="next"
                                    onSubmitEditing={attemptNextStep}
                                />
                                {formData.name.trim().length > 0 && (
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: getInputValidation('name', formData.name).valid ? COLORS.success : COLORS.error,
                                        marginTop: 4,
                                        marginLeft: 16
                                    }}>
                                        {getInputValidation('name', formData.name).message}
                                    </Text>
                                )}
                            </View>
                            <View>
                                <Input
                                    label="Relationship"
                                    placeholder="e.g. Sister, Doctor"
                                    value={formData.relationship}
                                    onChangeText={(t) => setFormData(prev => ({ ...prev, relationship: t }))}
                                    icon="heart"
                                />
                                {formData.relationship.trim().length > 0 && (
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: getInputValidation('relationship', formData.relationship).valid ? COLORS.success : COLORS.error,
                                        marginTop: 4,
                                        marginLeft: 16
                                    }}>
                                        {getInputValidation('relationship', formData.relationship).message}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {step === 1 && (
                        <View style={{ gap: 16 }}>
                            <PhoneInputField
                                onValidChange={(isValid) => {
                                    setPhoneValid(!!isValid);
                                    if (isValid) {
                                        setFormData(prev => ({ ...prev, phone: isValid }));
                                    }
                                }}
                                onSubmit={attemptNextStep}
                            />
                            <View>
                                <Input
                                    label="Email Address (Optional)"
                                    placeholder="jane@example.com"
                                    value={formData.email}
                                    onChangeText={(t) => setFormData(prev => ({ ...prev, email: t }))}
                                    icon="mail"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                {formData.email.trim().length > 0 && (
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: getInputValidation('email', formData.email).valid ? COLORS.success : COLORS.error,
                                        marginTop: 4,
                                        marginLeft: 16
                                    }}>
                                        {getInputValidation('email', formData.email).message}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={{ gap: 24, alignItems: 'center' }}>
                            <View style={{
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                                padding: 24,
                                borderRadius: 36,
                                width: '100%',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
                                    CONFIRM DETAILS
                                </Text>
                                <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text, textAlign: 'center' }}>
                                    {formData.name}
                                </Text>
                                <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.brandPrimary, letterSpacing: 0.5 }}>
                                    {formData.relationship}
                                </Text>

                                <View style={{ width: '100%', height: 1, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginVertical: 16 }} />

                                <View style={{ width: '100%', gap: 12 }}>
                                    {formData.phone ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <Ionicons name="call" size={18} color={colors.textMuted} />
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{formData.phone}</Text>
                                        </View>
                                    ) : null}
                                    {formData.email ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <Ionicons name="mail" size={18} color={colors.textMuted} />
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{formData.email}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                        </View>
                    )}
                </Animated.View>
            </View>
        </InputModal>
    );
}

const styles = StyleSheet.create({
    vitalTrack: {
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 2,
        marginBottom: 24,
        position: 'relative'
    },
    vitalFill: {
        height: '100%',
        backgroundColor: COLORS.brandPrimary,
        borderRadius: 2
    },
    vitalPlow: {
        position: 'absolute',
        top: -4,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.brandPrimary,
        borderWidth: 3,
        borderColor: '#FFF',
        shadowColor: COLORS.brandPrimary,
        shadowOpacity: 0.5,
        shadowRadius: 5
    },
    stepContainer: {
        minHeight: 180,
        justifyContent: 'center'
    }
});
