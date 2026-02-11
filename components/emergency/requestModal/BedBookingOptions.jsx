import React from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import { styles } from "./BedBookingOptions.styles";

const BED_OPTIONS = [
    {
        id: "standard",
        name: "Standard Bed",
        description: "General Ward • Professional Care • Shared Space",
        icon: "bed-patient",
        price: "$150",
    },
    {
        id: "private",
        name: "Private Room",
        description: "Premium Suite • Personal Bathroom • 24/7 Concierge",
        icon: "home",
        price: "$350",
    },
];

export default function BedBookingOptions({
    bedType,
    onBedTypeChange,
    bedCount,
    onBedCountChange,
    textColor,
    mutedColor,
}) {
    const { isDarkMode } = useTheme();

    const handleBedTypeSelect = (typeId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onBedTypeChange(typeId);
    };

    return (
        <View style={styles.container}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: mutedColor }]}>
                    CHOOSE ACCOMMODATION
                </Text>
            </View>

            <View style={styles.optionsGrid}>
                {BED_OPTIONS.map((option) => {
                    const isSelected = bedType === option.id;

                    // Dynamic Styles based on your logic
                    const activeBG = isSelected
                        ? isDarkMode
                            ? COLORS.brandPrimary + "20"
                            : COLORS.brandPrimary + "15"
                        : isDarkMode
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.03)";

                    return (
                        <Pressable
                            key={option.id}
                            onPress={() => handleBedTypeSelect(option.id)}
                            style={({ pressed }) => [
                                styles.optionCard,
                                {
                                    backgroundColor: activeBG,
                                    transform: [{ scale: pressed ? 0.98 : 1 }],
                                    shadowOpacity: isDarkMode ? 0.3 : 0.08,
                                },
                            ]}
                        >
                            {/* Top Row: Icon & Price */}
                            <View style={styles.cardHeader}>
                                <View
                                    style={[
                                        styles.iconBox,
                                        {
                                            backgroundColor: isSelected
                                                ? COLORS.brandPrimary
                                                : isDarkMode
                                                    ? "#2D3748"
                                                    : "#F1F5F9",
                                        },
                                    ]}
                                >
                                    <Fontisto
                                        name={option.icon}
                                        size={22}
                                        color={
                                            isSelected
                                                ? "#FFFFFF"
                                                : isDarkMode
                                                    ? "#94A3B8"
                                                    : "#64748B"
                                        }
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.price,
                                        { color: isSelected ? COLORS.brandPrimary : textColor },
                                    ]}
                                >
                                    {option.price}
                                    <Text style={styles.perNight}>/day</Text>
                                </Text>
                            </View>

                            {/* Content */}
                            <View style={styles.cardBody}>
                                <Text style={[styles.optionName, { color: textColor }]}>
                                    {option.name}
                                </Text>
                                <Text
                                    style={[styles.optionDesc, { color: mutedColor }]}
                                    numberOfLines={2}
                                >
                                    {option.description}
                                </Text>
                            </View>

                            {/* Bottom Right Checkmark */}
                            {isSelected && (
                                <View style={styles.checkmarkWrapper}>
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={30}
                                        color={COLORS.brandPrimary}
                                    />
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </View>

            {/* Counter Section */}
            <View
                style={[
                    styles.counterCard,
                    { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" },
                ]}
            >
                <View>
                    <Text style={[styles.countLabel, { color: textColor }]}>
                        Number of Beds
                    </Text>
                    <Text style={[styles.countSub, { color: mutedColor }]}>
                        Maximum of 5 patients
                    </Text>
                </View>

                <View style={styles.counterControls}>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onBedCountChange(Math.max(1, bedCount - 1));
                        }}
                        style={({ pressed }) => [
                            styles.counterBtn,
                            {
                                backgroundColor: isDarkMode ? "#2D3748" : "#F1F5F9",
                                opacity: pressed || bedCount <= 1 ? 0.6 : 1,
                            },
                        ]}
                        disabled={bedCount <= 1}
                    >
                        <Ionicons name="remove" size={20} color={textColor} />
                    </Pressable>

                    <Text style={[styles.countValue, { color: textColor }]}>
                        {bedCount}
                    </Text>

                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onBedCountChange(Math.min(5, bedCount + 1));
                        }}
                        style={({ pressed }) => [
                            styles.counterBtn,
                            {
                                backgroundColor: isDarkMode ? "#0F172A" : "#F1F5F9",
                                opacity: pressed ? 0.7 : 1,
                            },
                        ]}
                    >
                        <Ionicons name="add" size={20} color={textColor} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
