import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Input from "../../form/Input";
import { COLORS } from "../../../constants/colors";
import { styles } from "../InsuranceFormModal.styles";

export default function ProviderStep({
    formData,
    setFormData,
    validation,
    attemptNextStep,
    handleScanInsuranceCard,
    isScanning,
    isDarkMode,
    colors
}) {
    return (
        <View>
            <Input
                label="Who is your provider?"
                placeholder="e.g. Aetna"
                value={formData.provider_name}
                onChangeText={(t) =>
                    setFormData((prev) => ({ ...prev, provider_name: t }))
                }
                icon="business"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={attemptNextStep}
            />
            {formData.provider_name.trim().length > 0 && (
                <Text style={[styles.validationText, {
                    color: validation.provider_name.valid ? COLORS.success : COLORS.error,
                }]}>
                    {validation.provider_name.message}
                </Text>
            )}

            <View style={styles.scanContainer}>
                <TouchableOpacity
                    onPress={handleScanInsuranceCard}
                    disabled={isScanning}
                    style={[styles.scanButton, {
                        backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#F1F5F9",
                        opacity: isScanning ? 0.6 : 1
                    }]}
                >
                    {isScanning ? (
                        <ActivityIndicator color={COLORS.brandPrimary} size="small" />
                    ) : (
                        <Ionicons name="camera-outline" size={24} color={COLORS.brandPrimary} />
                    )}
                    <View style={styles.scanButtonContent}>
                        <Text style={[styles.scanButtonTitle, { color: colors.text }]}>
                            {isScanning ? 'Scanning Card...' : 'Scan Insurance Card'}
                        </Text>
                        <Text style={[styles.scanButtonSubtitle, { color: colors.textMuted }]}>
                            Take a photo to automatically fill your details
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}
