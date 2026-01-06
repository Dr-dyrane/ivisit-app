"use client"

import { View, Text, Pressable, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../../contexts/ThemeContext"
import { COLORS } from "../../constants/colors"
import * as Haptics from "expo-haptics"

export default function HospitalCard({ hospital, isSelected, onSelect, onCall }) {
  const { isDarkMode } = useTheme()

  const colors = {
    card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
    text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
    textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
    border: isDarkMode ? COLORS.border : COLORS.borderLight,
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onSelect(hospital.id)
  }

  const handleCallPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onCall(hospital.id)
  }

  return (
    <Pressable
      onPress={handlePress}
      style={{
        backgroundColor: isSelected ? `${COLORS.brandPrimary}10` : colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? COLORS.brandPrimary : colors.border,
        shadowColor: isSelected ? COLORS.brandPrimary : "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isSelected ? 0.15 : 0.05,
        shadowRadius: 8,
        elevation: isSelected ? 4 : 2,
      }}
    >
      <Image
        source={{ uri: hospital.image }}
        style={{
          width: "100%",
          height: 160,
          borderRadius: 12,
          marginBottom: 12,
          backgroundColor: colors.border,
        }}
        resizeMode="cover"
      />

      <View
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 6,
              letterSpacing: -0.3,
            }}
          >
            {hospital.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="star" size={16} color="#FFC107" />
            <Text style={{ fontSize: 14, color: colors.textMuted, marginLeft: 4 }}>{hospital.rating}</Text>
          </View>
        </View>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: COLORS.brandPrimary,
          }}
        >
          {hospital.price}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Ionicons name="location" size={16} color={COLORS.brandPrimary} />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 6 }}>{hospital.distance}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Ionicons name="time" size={16} color={COLORS.brandPrimary} />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 6 }}>ETA: {hospital.eta}</Text>
        </View>
      </View>

      {isSelected && (
        <Pressable
          onPress={handleCallPress}
          style={{
            backgroundColor: COLORS.brandPrimary,
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="car" size={20} color="#FFFFFF" />
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: "700",
                marginLeft: 10,
                letterSpacing: 0.3,
              }}
            >
              Request Now
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>
      )}
    </Pressable>
  )
}
