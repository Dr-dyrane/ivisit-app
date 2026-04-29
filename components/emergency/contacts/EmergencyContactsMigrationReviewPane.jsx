import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { ContactGroup } from "../ContactCard";
import { EMERGENCY_CONTACTS_COPY } from "./emergencyContacts.content";

// PULLBACK NOTE: EmergencyContacts migration-review pane.
// Owns: presenting skipped legacy rows and their resolve/remove actions.
// Does NOT own: deciding whether review is required; lifecycle + screen model do that upstream.

export default function EmergencyContactsMigrationReviewPane({
  isDarkMode,
  theme,
  metrics,
  skippedLegacyContacts = [],
  onResolve,
  onDiscard,
  onDismiss,
  embedded = false,
}) {
  if (
    !Array.isArray(skippedLegacyContacts) ||
    skippedLegacyContacts.length === 0
  ) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: embedded ? "transparent" : theme.panel,
          borderColor: theme.border,
          borderWidth: embedded ? 0 : 1,
          padding: embedded ? 0 : metrics.spacing.lg,
          borderRadius: metrics.radii.xl,
          gap: metrics.spacing.md,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1, gap: metrics.spacing.xs }}>
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
                fontSize: Math.max(metrics.typography.heading.fontSize + 2, 18),
                lineHeight: Math.max(
                  metrics.typography.heading.lineHeight + 2,
                  24,
                ),
                fontWeight: "700",
              },
            ]}
          >
            {EMERGENCY_CONTACTS_COPY.migration.title}
          </Text>
          <Text
            style={[
              styles.body,
              {
                color: theme.muted,
                fontSize: Math.max(metrics.typography.body.fontSize, 14),
                lineHeight: Math.max(metrics.typography.body.lineHeight, 20),
                fontWeight: "400",
              },
            ]}
          >
            {EMERGENCY_CONTACTS_COPY.migration.body}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Ionicons name="checkmark" size={18} color={COLORS.brandPrimary} />
        </TouchableOpacity>
      </View>

      <ContactGroup isDarkMode={isDarkMode}>
        {skippedLegacyContacts.map((contact, index) => (
          <View
            key={String(contact?.legacyId || index)}
            style={[
              styles.legacyRow,
              {
                borderBottomWidth:
                  index === skippedLegacyContacts.length - 1
                    ? 0
                    : StyleSheet.hairlineWidth,
                borderBottomColor: theme.border,
                padding: metrics.spacing.lg,
                gap: metrics.spacing.sm,
              },
            ]}
          >
            <Text
              style={[
                styles.contactName,
                {
                  color: theme.text,
                  fontSize: Math.max(metrics.typography.body.fontSize + 2, 16),
                  lineHeight: Math.max(
                    metrics.typography.body.lineHeight + 1,
                    21,
                  ),
                  fontWeight: "600",
                },
              ]}
            >
              {contact?.name || "Unnamed contact"}
            </Text>
            <Text
              style={[
                styles.meta,
                {
                  color: theme.muted,
                  fontSize: Math.max(
                    metrics.typography.caption.fontSize + 1,
                    13,
                  ),
                  lineHeight: Math.max(
                    metrics.typography.caption.lineHeight + 2,
                    18,
                  ),
                  fontWeight: "400",
                },
              ]}
            >
              {contact?.relationship || "Legacy contact"}
            </Text>
            {contact?.email ? (
              <Text
                style={[
                  styles.meta,
                  {
                    color: theme.muted,
                    fontSize: Math.max(
                      metrics.typography.caption.fontSize + 1,
                      13,
                    ),
                    lineHeight: Math.max(
                      metrics.typography.caption.lineHeight + 2,
                      18,
                    ),
                    fontWeight: "400",
                  },
                ]}
              >
                Email: {contact.email}
              </Text>
            ) : null}
            <Text
              style={[
                styles.meta,
                {
                  color: theme.muted,
                  fontSize: Math.max(
                    metrics.typography.caption.fontSize + 1,
                    13,
                  ),
                  lineHeight: Math.max(
                    metrics.typography.caption.lineHeight + 2,
                    18,
                  ),
                  fontWeight: "400",
                },
              ]}
            >
              {contact?.phone || "Phone needed"}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => onResolve(contact)}
                style={[
                  styles.primaryAction,
                  { backgroundColor: COLORS.brandPrimary },
                ]}
              >
                <Text style={styles.primaryActionText}>Add Phone</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDiscard(contact?.legacyId)}
                style={styles.secondaryAction}
              >
                <Text
                  style={[styles.secondaryActionText, { color: COLORS.error }]}
                >
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ContactGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {},
  body: {},
  dismissButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(134,16,14,0.08)",
  },
  legacyRow: {},
  contactName: {},
  meta: {},
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  primaryAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  secondaryAction: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryActionText: {
    fontWeight: "600",
  },
});
