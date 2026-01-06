"use client"

import { View, Text, Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../../contexts/ThemeContext"
import { COLORS } from "../../constants/colors"

export default function ServiceTypeSelector({ selectedType, onSelect }) {
  const { isDarkMode } = useTheme()

  const colors = {
    card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
    text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
    textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
    border: isDarkMode ? COLORS.border : COLORS.borderLight,
  }

  const serviceTypes = [
    {
      type: "Premium",
      icon: "shield-checkmark",
      description: "Priority response, specialized care",
      recommended: true,
    },
    {
      type: "Standard",
      icon: "shield-outline",
      description: "Basic emergency response",
      recommended: false,
    },
  ]

  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {serviceTypes.map((service) => {
        const isSelected = selectedType === service.type

        return (
          <Pressable
            key={service.type}
            onPress={() => onSelect(service.type)}
            style={{
              flex: 1,
              backgroundColor: isSelected ? `${COLORS.brandPrimary}15` : colors.card,
              borderWidth: 1.5,
              borderColor: isSelected ? `${COLORS.brandPrimary}40` : colors.border,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons name={service.icon} size={24} color={isSelected ? COLORS.brandPrimary : colors.textMuted} />
              {service.recommended && (
                <View
                  style={{
                    backgroundColor: `${COLORS.brandPrimary}20`,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: COLORS.brandPrimary,
                      letterSpacing: 0.5,
                    }}
                  >
                    RECOMMENDED
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 4,
              }}
            >
              {service.type}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.textMuted,
                lineHeight: 16,
              }}
            >
              {service.description}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
