import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";

export default function AsyncConsultDraftPanel({
  open,
  onToggle,
  prompt,
  onPromptChange,
  draft,
  onDraftChange,
  onGenerate,
  onInsert,
  onDiscard,
  isDrafting = false,
  hasError = false,
  colors,
}) {
  if (!open) {
    return (
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel="Open AI draft"
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: colors.softSurface, opacity: pressed ? 0.82 : 1 },
        ]}
      >
        <Ionicons name="sparkles-outline" size={18} color={COLORS.brandPrimary} />
        <Text style={[styles.triggerText, { color: colors.text }]}>AI draft</Text>
        <Ionicons name="chevron-down" size={17} color={colors.muted} />
      </Pressable>
    );
  }

  const canGenerate = Boolean(prompt.trim()) && !isDrafting;
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors.softSurface },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles-outline" size={18} color={COLORS.brandPrimary} />
          <Text style={[styles.title, { color: colors.text }]}>AI draft</Text>
        </View>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel="Close AI draft"
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <TextInput
        value={prompt}
        onChangeText={onPromptChange}
        editable={!isDrafting}
        maxLength={2000}
        multiline
        placeholder="What would you like help saying?"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Draft request"
        style={[
          styles.promptInput,
          {
            color: colors.text,
            backgroundColor: colors.inputSurface,
          },
        ]}
      />

      {hasError ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>A draft could not be created. Try again.</Text>
      ) : null}

      {!draft ? (
        <Pressable
          onPress={onGenerate}
          disabled={!canGenerate}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canGenerate, busy: isDrafting }}
          style={({ pressed }) => [
            styles.generateButton,
            { opacity: canGenerate ? (pressed ? 0.84 : 1) : 0.45 },
          ]}
        >
          {isDrafting ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <Text style={styles.generateText}>{isDrafting ? "Drafting..." : "Create draft"}</Text>
        </Pressable>
      ) : (
        <>
          <Text style={[styles.reviewLabel, { color: colors.muted }]}>Review and edit before inserting</Text>
          <TextInput
            value={draft}
            onChangeText={onDraftChange}
            maxLength={1000}
            multiline
            accessibilityLabel="Suggested message draft"
            style={[
              styles.draftInput,
              {
                color: colors.text,
                backgroundColor: colors.inputSurface,
              },
            ]}
          />
          <View style={styles.actions}>
            <Pressable
              onPress={onDiscard}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: colors.inputSurface,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.secondaryText, { color: colors.text }]}>Discard</Text>
            </Pressable>
            <Pressable
              onPress={onInsert}
              disabled={!draft.trim()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.insertButton,
                { opacity: draft.trim() ? (pressed ? 0.84 : 1) : 0.45 },
              ]}
            >
              <Text style={styles.insertText}>Insert</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  triggerText: { flex: 1, fontSize: 13, fontWeight: "700" },
  panel: { gap: 10, padding: 12, borderRadius: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 14, fontWeight: "700" },
  promptInput: {
    minHeight: 70,
    maxHeight: 120,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 19,
    textAlignVertical: "top",
  },
  errorText: { fontSize: 12, lineHeight: 17 },
  generateButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: COLORS.brandPrimary,
  },
  generateText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  reviewLabel: { fontSize: 11, fontWeight: "600" },
  draftInput: {
    minHeight: 90,
    maxHeight: 160,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  secondaryButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  secondaryText: { fontSize: 13, fontWeight: "700" },
  insertButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: COLORS.brandPrimary,
  },
  insertText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
