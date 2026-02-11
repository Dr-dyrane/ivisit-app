import React from "react";
import { View, Text } from "react-native";
import Input from "../../form/Input";
import { COLORS } from "../../../constants/colors";
import { styles } from "../InsuranceFormModal.styles";

export default function PolicyStep({
    formData,
    setFormData,
    validation,
    attemptNextStep
}) {
    return (
        <View style={styles.stepGap}>
            <View>
                <Input
                    label="What is your Policy Number?"
                    placeholder="e.g. ABC-123456789"
                    value={formData.policy_number}
                    onChangeText={(t) =>
                        setFormData((prev) => ({ ...prev, policy_number: t.toUpperCase() }))
                    }
                    icon="card"
                    autoFocus
                    onSubmitEditing={attemptNextStep}
                    keyboardType="default"
                    autoCapitalize="characters"
                />
                {formData.policy_number.trim().length > 0 && (
                    <Text style={[styles.validationText, {
                        color: validation.policy_number.valid ? COLORS.success : COLORS.error,
                    }]}>
                        {validation.policy_number.message}
                    </Text>
                )}
            </View>
            <View>
                <Input
                    label="Group Number (Optional)"
                    placeholder="e.g. GRP-12345"
                    value={formData.group_number}
                    onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, group_number: text.toUpperCase() }))
                    }
                    icon="people"
                    keyboardType="default"
                    autoCapitalize="characters"
                />
                {formData.group_number.trim().length > 0 && (
                    <Text style={[styles.validationText, {
                        color: validation.group_number.valid ? COLORS.success : COLORS.error,
                    }]}>
                        {validation.group_number.message}
                    </Text>
                )}
            </View>
        </View>
    );
}
