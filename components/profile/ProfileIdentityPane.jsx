import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { PROFILE_SCREEN_COPY } from "./profileScreen.content";

// PULLBACK NOTE: Identity pane replaces the old oversized hero.
// It keeps avatar edit affordance and identity-first ordering, but uses calmer utility-surface typography.

export default function ProfileIdentityPane({
  user,
  displayId,
  imageUri,
  isDarkMode,
  theme,
  metrics,
  onPickImage,
  compact = false,
  loading = false,
}) {
  if (loading) {
    return (
      <View
        style={{
          gap: compact ? metrics.spacing.md : metrics.spacing.lg,
          alignItems: compact ? "center" : "flex-start",
          width: "100%",
        }}
      >
        <View
          style={{
            width: compact ? 112 : 104,
            height: compact ? 112 : 104,
            borderRadius: compact ? 34 : 30,
            backgroundColor: theme.skeletonBase,
          }}
        />

        <View
          style={{
            gap: metrics.spacing.xs,
            alignItems: compact ? "center" : "flex-start",
            width: "100%",
          }}
        >
          <View
            style={{
              width: compact ? "68%" : "56%",
              height: compact ? 30 : 26,
              borderRadius: 999,
              backgroundColor: theme.skeletonBase,
            }}
          />
          <View
            style={{
              width: compact ? "54%" : "44%",
              height: metrics.typography.body.fontSize,
              borderRadius: 999,
              backgroundColor: theme.skeletonSoft,
            }}
          />
        </View>

        <View
          style={{
            gap: metrics.spacing.sm,
            width: "100%",
            alignItems: compact ? "center" : "flex-start",
          }}
        >
          <View
            style={{
              width: 118,
              height: 28,
              borderRadius: 14,
              backgroundColor: theme.skeletonSoft,
            }}
          />
          <View
            style={{
              width: 132,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.skeletonBase,
            }}
          />
        </View>
      </View>
    );
  }

  const name = user?.fullName || PROFILE_SCREEN_COPY.identity.nameFallback;
  const email = user?.email || PROFILE_SCREEN_COPY.identity.emailFallback;
  const textAlign = compact ? "center" : "left";

  return (
    <View
      style={{
        gap: compact ? metrics.spacing.md : metrics.spacing.lg,
        alignItems: compact ? "center" : "flex-start",
      }}
    >
      <Pressable
        onPress={onPickImage}
        style={{
          position: "relative",
        }}
      >
        <Image
          key={imageUri}
          source={
            imageUri ? { uri: imageUri } : require("../../assets/profile.jpg")
          }
          style={{
            width: compact ? 112 : 104,
            height: compact ? 112 : 104,
            borderRadius: compact ? 34 : 30,
            backgroundColor: `${COLORS.brandPrimary}15`,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -4,
            right: -4,
            backgroundColor: COLORS.brandPrimary,
            borderRadius: 14,
            width: 40,
            height: 40,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: COLORS.brandPrimary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Ionicons name="camera" size={18} color="#FFFFFF" />
        </View>
      </Pressable>

      <View
        style={{
          gap: metrics.spacing.xs,
          alignItems: compact ? "center" : "flex-start",
          width: "100%",
        }}
      >
        <Text
          style={{
            fontSize: compact ? 26 : 22,
            lineHeight: compact ? 31 : 28,
            fontWeight: "700",
            color: theme.text,
            textAlign,
            letterSpacing: -0.45,
          }}
        >
          {name}
        </Text>
        <Text
          style={{
            fontSize: metrics.typography.body.fontSize,
            lineHeight: metrics.typography.body.lineHeight,
            fontWeight: "400",
            color: theme.textMuted,
            textAlign,
          }}
        >
          {email}
        </Text>
      </View>

      <View
        style={{
          gap: metrics.spacing.sm,
          width: "100%",
          alignItems: compact ? "center" : "flex-start",
        }}
      >
        <View
          style={{
            backgroundColor: theme.cardMuted,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 14,
            borderCurve: "continuous",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              lineHeight: 14,
              fontWeight: "600",
              color: COLORS.brandPrimary,
              letterSpacing: 0.8,
            }}
          >
            {displayId || PROFILE_SCREEN_COPY.identity.displayIdFallback}
          </Text>
        </View>

        {user?.hasInsurance ? (
          <View
            style={{
              backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.06)"
                : "rgba(134,16,14,0.08)",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 16,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: isDarkMode
                ? "rgba(255,255,255,0.08)"
                : "rgba(134,16,14,0.12)",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: COLORS.brandPrimary,
              }}
            />
            <Text
              style={{
                fontSize: 12,
                lineHeight: 16,
                fontWeight: "600",
                color: isDarkMode ? "#FFFFFF" : COLORS.brandPrimary,
              }}
            >
              {PROFILE_SCREEN_COPY.identity.memberLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
