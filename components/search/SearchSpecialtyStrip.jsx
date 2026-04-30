import React from "react";
import {
  FontAwesome5,
  Fontisto,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";

const SPECIALTY_ICONS = {
  "General Care": { icon: "stethoscope", family: "FontAwesome5" },
  Emergency: { icon: "ambulance", family: "FontAwesome5" },
  Cardiology: { icon: "heart-pulse", family: "MaterialCommunityIcons" },
  Neurology: { icon: "brain", family: "MaterialCommunityIcons" },
  Oncology: { icon: "ribbon", family: "Ionicons" },
  Pediatrics: { icon: "baby-face-outline", family: "MaterialCommunityIcons" },
  Orthopedics: { icon: "bone", family: "MaterialCommunityIcons" },
  ICU: { icon: "bed-patient", family: "Fontisto" },
  Trauma: { icon: "bandage", family: "MaterialCommunityIcons" },
  "Urgent Care": { icon: "medical-bag", family: "MaterialCommunityIcons" },
};

function SearchSpecialtyIcon({ specialty, color }) {
  const config = SPECIALTY_ICONS[specialty] || {
    icon: "medical-bag",
    family: "MaterialCommunityIcons",
  };

  switch (config.family) {
    case "Fontisto":
      return <Fontisto name={config.icon} size={16} color={color} />;
    case "Ionicons":
      return <Ionicons name={config.icon} size={16} color={color} />;
    case "FontAwesome5":
      return <FontAwesome5 name={config.icon} size={16} color={color} />;
    default:
      return (
        <MaterialCommunityIcons name={config.icon} size={16} color={color} />
      );
  }
}

export default function SearchSpecialtyStrip({
  specialties,
  selectedSpecialty = null,
  counts = {},
  onSelect,
  isDarkMode,
  showCounts = false,
}) {
  const safeSpecialties = Array.isArray(specialties) ? specialties : [];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: 12,
        paddingHorizontal: 0,
        paddingBottom: 2,
      }}
    >
      {safeSpecialties.map((specialty) => {
        const selected = specialty === selectedSpecialty;
        const mutedText = isDarkMode ? "#A7B1C2" : "#64748B";
        const labelColor = isDarkMode ? "#FFFFFF" : "#0F172A";
        const cardBackground = selected
          ? isDarkMode
            ? "rgba(134,16,14,0.24)"
            : "rgba(134,16,14,0.10)"
          : isDarkMode
            ? "rgba(255,255,255,0.06)"
            : "rgba(15,23,42,0.05)";

        return (
          <Pressable
            key={specialty}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect?.(specialty);
            }}
            style={({ pressed }) => ({
              minWidth: 148,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 20,
              borderCurve: "continuous",
              backgroundColor: cardBackground,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  borderCurve: "continuous",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected
                    ? COLORS.brandPrimary
                    : isDarkMode
                      ? "rgba(255,255,255,0.08)"
                      : "#FFFFFF",
                }}
              >
                <SearchSpecialtyIcon
                  specialty={specialty}
                  color={selected ? "#FFFFFF" : COLORS.brandPrimary}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: labelColor,
                    fontSize: 13,
                    lineHeight: 18,
                    fontWeight: "600",
                    letterSpacing: -0.2,
                  }}
                  numberOfLines={1}
                >
                  {specialty}
                </Text>
                {showCounts ? (
                  <Text
                    style={{
                      color: mutedText,
                      fontSize: 11,
                      lineHeight: 15,
                      fontWeight: "400",
                    }}
                    numberOfLines={1}
                  >
                    {(counts || {})[specialty] ?? 0} hospitals
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
