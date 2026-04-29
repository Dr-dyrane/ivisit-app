import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ContactCard, {
  ContactGroup,
  ContactsEmptyState,
  ContactsLoadingState,
} from "../ContactCard";
import { EMERGENCY_CONTACTS_COPY } from "./emergencyContacts.content";

// PULLBACK NOTE: EmergencyContacts list pane.
// Owns: list/empty/loading rendering for canonical contacts.
// Does NOT own: screen shell, wide-layout context copy, or editor modal state.

export default function EmergencyContactsListPane({
  isDarkMode,
  theme,
  metrics,
  contacts = [],
  isLoading = false,
  selectedIdSet,
  onEdit,
  onDelete,
  onToggleSelect,
  error = null,
  syncNotice = null,
}) {
  const statusMessage = syncNotice || error || null;

  if (isLoading) {
    return (
      <View style={styles.section}>
        <ContactsLoadingState
          isDarkMode={isDarkMode}
          message={EMERGENCY_CONTACTS_COPY.loading.message}
        />
      </View>
    );
  }

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return (
      <View style={styles.section}>
        <ContactsEmptyState
          isDarkMode={isDarkMode}
          title={EMERGENCY_CONTACTS_COPY.empty.title}
          body={EMERGENCY_CONTACTS_COPY.empty.body}
        />
        {statusMessage ? (
          <Text
            style={{
              color: theme.muted,
              fontSize: 13,
              lineHeight: 18,
              fontWeight: "400",
              marginTop: metrics.spacing.sm,
              textAlign: "center",
            }}
          >
            {statusMessage}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {syncNotice ? (
        <View
          style={{
            marginBottom: metrics.spacing.sm,
            padding: metrics.spacing.md,
            borderRadius: metrics.radii.lg,
            backgroundColor: theme.panel,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text
            style={{
              color: theme.muted,
              fontSize: 13,
              lineHeight: 18,
              fontWeight: "400",
            }}
          >
            {syncNotice}
          </Text>
        </View>
      ) : null}
      <ContactGroup isDarkMode={isDarkMode}>
        {contacts.map((contact, index) => (
          <ContactCard
            key={String(contact?.id)}
            contact={contact}
            isDarkMode={isDarkMode}
            onEdit={onEdit}
            onDelete={onDelete}
            isSelected={selectedIdSet?.has(String(contact?.id))}
            onToggleSelect={onToggleSelect}
            isLast={index === contacts.length - 1}
            collapsedHint={EMERGENCY_CONTACTS_COPY.list.body}
          />
        ))}
      </ContactGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 4,
  },
});
