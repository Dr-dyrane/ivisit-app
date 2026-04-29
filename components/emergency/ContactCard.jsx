import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";
import {
  getMiniProfileColors,
  getMiniProfileLayout,
} from "./miniProfile/miniProfile.model";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function SelectionToolbar({
  selectedCount,
  onClear,
  onDelete,
  isDarkMode,
  floating = true,
  style = null,
}) {
  return (
    <Animated.View
      style={[
        {
          backgroundColor: isDarkMode ? "#0B0F1A" : "#FFFFFF",
          borderRadius: 24,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          shadowColor: COLORS.brandPrimary,
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          elevation: 8,
          borderColor: `${COLORS.brandPrimary}40`,
          borderWidth: 1,
        },
        floating
          ? {
              position: "absolute",
              top: 72,
              left: 12,
              right: 12,
              zIndex: 1000,
            }
          : null,
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={COLORS.brandPrimary}
        />
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: isDarkMode ? "#FFFFFF" : "#0F172A",
          }}
        >
          {selectedCount} selected
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TouchableOpacity
          onPress={onClear}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 16,
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: isDarkMode ? "#FFFFFF" : "#0F172A",
            }}
          >
            Clear
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 16,
            backgroundColor: "rgba(239, 68, 68, 0.1)",
          }}
        >
          <Text
            style={{ fontSize: 14, fontWeight: "600", color: COLORS.error }}
          >
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export function ContactsLoadingState({
  isDarkMode,
  message = "Loading contacts...",
}) {
  const colors = getMiniProfileColors(isDarkMode);

  return (
    <ContactGroup isDarkMode={isDarkMode}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 16,
        }}
      >
        <ActivityIndicator color={COLORS.brandPrimary} />
        <Text
          style={{
            color: colors.muted,
            fontSize: 14,
            lineHeight: 20,
            fontWeight: "400",
          }}
        >
          {message}
        </Text>
      </View>
    </ContactGroup>
  );
}

export function ContactsEmptyState({
  isDarkMode,
  title = "No contacts yet",
  body = "Add a trusted contact with a working phone number.",
}) {
  const colors = getMiniProfileColors(isDarkMode);

  return (
    <ContactGroup isDarkMode={isDarkMode}>
      <View style={{ padding: 16, alignItems: "center" }}>
        <Text
          style={{
            color: colors.text,
            fontWeight: "600",
            fontSize: 18,
            lineHeight: 24,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontWeight: "400",
            fontSize: 15,
            lineHeight: 21,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {body}
        </Text>
      </View>
    </ContactGroup>
  );
}

export function ContactGroup({ children, isDarkMode, style }) {
  const colors = getMiniProfileColors(isDarkMode);
  const layout = getMiniProfileLayout({});

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: layout.groups.radius,
          borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const maskPhone = (phone) => {
  const digits = String(phone || "");
  return digits.length > 4 ? `**** **** ${digits.slice(-4)}` : "****";
};

const ContactCard = ({
  contact,
  isDarkMode,
  onEdit,
  onDelete,
  isSelected,
  onToggleSelect,
  isLast = false,
  collapsedHint = "Tap to reveal. Hold to select.",
}) => {
  const [unmasked, setUnmasked] = useState(false);
  const [selected, setSelected] = useState(false);
  const [holdTimer, setHoldTimer] = useState(null);
  const colors = getMiniProfileColors(isDarkMode);

  useEffect(() => {
    setSelected(Boolean(isSelected));
  }, [isSelected]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUnmasked((current) => !current);
  };

  const handlePressIn = () => {
    const timer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelected((current) => !current);
      onToggleSelect?.(String(contact?.id));
    }, 500);
    setHoldTimer(timer);
  };

  const handlePressOut = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={[
        styles.contactCard,
        {
          backgroundColor: "transparent",
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
          transform: [{ scale: selected ? 0.98 : 1 }],
        },
      ]}
    >
      {selected ? (
        <View style={styles.cornerSeal}>
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={COLORS.brandPrimary}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 2,
            }}
          />
        </View>
      ) : null}

      <View style={styles.identityWidget}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${COLORS.brandPrimary}15` },
          ]}
        >
          <Ionicons name="person" size={20} color={COLORS.brandPrimary} />
        </View>
        <View style={styles.identityInfo}>
          <Text
            style={[
              styles.contactName,
              { color: isDarkMode ? "#FFFFFF" : "#0F172A" },
            ]}
          >
            {contact?.name ?? "--"}
          </Text>
          <Text
            style={[
              styles.identityLabel,
              { color: isDarkMode ? "#94A3B8" : "#64748B" },
            ]}
          >
            {contact?.relationship || "Contact"}
          </Text>
        </View>
      </View>

      <View style={styles.dataGrid}>
        {contact?.phone ? (
          <View style={styles.dataItem}>
            <Ionicons
              name="call"
              size={14}
              color={isDarkMode ? "#94A3B8" : "#64748B"}
            />
            <Text
              style={[
                styles.dataValue,
                { color: isDarkMode ? "#FFFFFF" : "#0F172A" },
              ]}
            >
              {unmasked ? contact.phone : maskPhone(contact.phone)}
            </Text>
          </View>
        ) : null}
      </View>

      {!unmasked && !selected ? (
        <Text
          style={[
            styles.hintText,
            { color: isDarkMode ? "#94A3B8" : "#64748B" },
          ]}
        >
          {collapsedHint}
        </Text>
      ) : null}

      {unmasked ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 24,
            paddingTop: 24,
            borderTopWidth: 1,
            borderTopColor: isDarkMode
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.05)",
          }}
        >
          <TouchableOpacity
            onPress={() => onEdit?.(contact)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.05)"
                : "#F1F5F9",
            }}
          >
            <Ionicons
              name="pencil"
              size={16}
              color={isDarkMode ? "#FFFFFF" : "#0F172A"}
            />
            <Text
              style={{
                fontWeight: "600",
                color: isDarkMode ? "#FFFFFF" : "#0F172A",
                fontSize: 14,
              }}
            >
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Delete Contact",
                "Are you sure you want to delete this contact?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDelete?.(contact.id),
                  },
                ],
              );
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="remove" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contactCard: {
    borderRadius: 36,
    padding: 24,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  identityWidget: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  identityInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700",
    letterSpacing: -0.45,
  },
  identityLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  dataGrid: {
    gap: 8,
  },
  dataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dataValue: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  cornerSeal: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: COLORS.brandPrimary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  hintText: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
});

export default ContactCard;
