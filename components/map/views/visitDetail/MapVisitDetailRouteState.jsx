import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VISIT_DETAIL_ROUTE_STATUS } from "../../../../hooks/visits/visitDetailRouteState";

const ICONS = {
  [VISIT_DETAIL_ROUTE_STATUS.DENIED]: "lock-closed-outline",
  [VISIT_DETAIL_ROUTE_STATUS.NOT_FOUND]: "document-text-outline",
  [VISIT_DETAIL_ROUTE_STATUS.ERROR]: "cloud-offline-outline",
};

export default function MapVisitDetailRouteState({
  state,
  isDarkMode,
  titleColor,
  mutedColor,
  onClose,
}) {
  const canRetry = state?.status === VISIT_DETAIL_ROUTE_STATUS.ERROR
    && typeof state?.onRetry === "function";
  const primarySurface = isDarkMode ? "#F8FAFC" : "#111827";
  const primaryText = isDarkMode ? "#111827" : "#FFFFFF";
  const softSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  return (
    <View style={styles.container}>
      <View style={[styles.iconSurface, { backgroundColor: softSurface }]}>
        <Ionicons
          name={ICONS[state?.status] || "information-circle-outline"}
          size={26}
          color={titleColor}
        />
      </View>
      <Text style={[styles.title, { color: titleColor }]}>{state?.title || "Visit unavailable"}</Text>
      <Text style={[styles.message, { color: mutedColor }]}>{state?.message || "Close this view and try again."}</Text>
      <View style={styles.actions}>
        {canRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try loading visit again"
            onPress={state.onRetry}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: primarySurface, opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <Ionicons name="refresh" size={18} color={primaryText} />
            <Text style={[styles.buttonText, { color: primaryText }]}>Try again</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close visit details"
          onPress={onClose}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: softSurface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.buttonText, { color: titleColor }]}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 34,
  },
  iconSurface: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    maxWidth: 340,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    maxWidth: 320,
    gap: 10,
    marginTop: 24,
  },
  button: {
    minHeight: 48,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
