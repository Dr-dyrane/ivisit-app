import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Input from "../../form/Input";
import { COLORS } from "../../../constants/colors";
import { styles } from "../InsuranceFormModal.styles";

export default function UploadStep({
    formData,
    setFormData,
    validation,
    pickImage,
    isDarkMode,
    colors
}) {
    return (
        <View style={styles.stepGapLarge}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
                Upload photos of your card
            </Text>

            <View style={styles.uploadRow}>
                {/* Front Card */}
                <TouchableOpacity
                    onPress={() => pickImage('front_image_url')}
                    style={[styles.uploadCard, {
                        backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#F1F5F9",
                        borderColor: formData.front_image_url ? COLORS.brandPrimary : 'transparent',
                        borderStyle: formData.front_image_url ? 'solid' : 'dashed'
                    }]}
                >
                    {formData.front_image_url ? (
                        <Image
                            source={{ uri: formData.front_image_url }}
                            style={styles.uploadImage}
                        />
                    ) : (
                        <View style={styles.uploadPlaceholder}>
                            <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                            <Text style={[styles.uploadLabel, { color: colors.textMuted }]}>FRONT</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Back Card */}
                <TouchableOpacity
                    onPress={() => pickImage('back_image_url')}
                    style={[styles.uploadCard, {
                        backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#F1F5F9",
                        borderColor: formData.back_image_url ? COLORS.brandPrimary : 'transparent',
                        borderStyle: formData.back_image_url ? 'solid' : 'dashed'
                    }]}
                >
                    {formData.back_image_url ? (
                        <Image
                            source={{ uri: formData.back_image_url }}
                            style={styles.uploadImage}
                        />
                    ) : (
                        <View style={styles.uploadPlaceholder}>
                            <Ionicons name="images-outline" size={32} color={colors.textMuted} />
                            <Text style={[styles.uploadLabel, { color: colors.textMuted }]}>BACK</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Policy Holder Name Field */}
            <View>
                <Input
                    label="Policy Holder (Optional)"
                    placeholder="Full Name"
                    value={formData.policy_holder_name}
                    onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, policy_holder_name: text }))
                    }
                    icon="person"
                />
                {formData.policy_holder_name.trim().length > 0 && (
                    <Text style={[styles.validationText, {
                        color: validation.policy_holder_name.valid ? COLORS.success : COLORS.error,
                    }]}>
                        {validation.policy_holder_name.message}
                    </Text>
                )}
            </View>
        </View>
    );
}
