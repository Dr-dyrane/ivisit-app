import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";

const formatTimestamp = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch (_error) {
    return date.toLocaleString();
  }
};

export default function AsyncConsultMessageList({
  messages = [],
  participants = [],
  currentUserId,
  loading = false,
  error = null,
  onRetry,
  hasOlderMessages = false,
  loadingOlder = false,
  onLoadOlder,
  archived = false,
  colors,
}) {
  const participantByUserId = useMemo(
    () => new Map(participants.filter((item) => item?.userId).map((item) => [item.userId, item])),
    [participants],
  );

  if (loading) {
    return (
      <View style={styles.list} accessibilityLabel="Loading consult messages">
        {[0, 1, 2].map((key) => (
          <View
            key={key}
            style={[
              styles.skeleton,
              key % 2 ? styles.ownSkeleton : null,
              { backgroundColor: colors.softSurface },
            ]}
          />
        ))}
      </View>
    );
  }

  if (error && messages.length === 0) {
    return (
      <View style={[styles.state, { backgroundColor: colors.softSurface }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Messages are unavailable</Text>
        <Text style={[styles.stateBody, { color: colors.muted }]}>Your messages are still here. Try loading them again.</Text>
        <Pressable onPress={onRetry} style={styles.retryButton} accessibilityRole="button">
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {archived ? (
        <View style={[styles.archiveBanner, { backgroundColor: colors.softSurface }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
          <Text style={[styles.archiveText, { color: colors.muted }]}>This consult is closed and remains available to read.</Text>
        </View>
      ) : null}

      {hasOlderMessages ? (
        <Pressable
          onPress={onLoadOlder}
          disabled={loadingOlder}
          accessibilityRole="button"
          style={[styles.loadOlder, { backgroundColor: colors.softSurface }]}
        >
          {loadingOlder ? <ActivityIndicator size="small" color={COLORS.brandPrimary} /> : null}
          <Text style={[styles.loadOlderText, { color: colors.text }]}>{loadingOlder ? "Loading..." : "Load earlier messages"}</Text>
        </Pressable>
      ) : null}

      {messages.length === 0 ? (
        <View style={styles.state}>
          <Ionicons name="chatbubbles-outline" size={34} color={colors.muted} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>No messages yet</Text>
          <Text style={[styles.stateBody, { color: colors.muted }]}>
            Use this room for non-emergency questions about your scheduled care.
          </Text>
        </View>
      ) : null}

      {messages.map((message) => {
        const own = String(message.senderId || "") === String(currentUserId || "");
        const participant = participantByUserId.get(message.senderId);
        const senderLabel = participant?.displayNameSnapshot ||
          (message.senderRole === "provider" ? "Care team" : "Participant");
        return (
          <View key={message.id} style={[styles.messageGroup, own ? styles.ownGroup : null]}>
            {!own ? <Text style={[styles.sender, { color: colors.muted }]}>{senderLabel}</Text> : null}
            <View
              style={[
                styles.bubble,
                own ? styles.ownBubble : styles.otherBubble,
                { backgroundColor: own ? `${COLORS.brandPrimary}18` : colors.softSurface },
              ]}
            >
              <Text style={[styles.messageText, { color: colors.text }]}>{message.body || "Attachment message"}</Text>
              {message.attachmentStoragePath ? (
                <Text style={[styles.attachmentNotice, { color: colors.muted }]}>An attachment was shared with this message.</Text>
              ) : null}
            </View>
            <Text style={[styles.timestamp, { color: colors.muted }]}>{formatTimestamp(message.createdAt)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14, paddingBottom: 12 },
  skeleton: { width: "72%", height: 58, borderRadius: 18 },
  ownSkeleton: { alignSelf: "flex-end", width: "62%" },
  state: { alignItems: "center", gap: 7, padding: 24, borderRadius: 22 },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  stateBody: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  retryButton: { minHeight: 42, justifyContent: "center", paddingHorizontal: 18, marginTop: 4, borderRadius: 16, backgroundColor: COLORS.brandPrimary },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  archiveBanner: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12, borderRadius: 16 },
  archiveText: { flex: 1, fontSize: 12, lineHeight: 17 },
  loadOlder: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 7, minHeight: 40, paddingHorizontal: 14, borderRadius: 15 },
  loadOlderText: { fontSize: 12, fontWeight: "600" },
  messageGroup: { alignItems: "flex-start", maxWidth: "88%", gap: 4 },
  ownGroup: { alignSelf: "flex-end", alignItems: "flex-end" },
  sender: { fontSize: 11, fontWeight: "600", paddingHorizontal: 4 },
  bubble: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 },
  ownBubble: { borderBottomRightRadius: 6 },
  otherBubble: { borderBottomLeftRadius: 6 },
  messageText: { fontSize: 15, lineHeight: 21 },
  attachmentNotice: { marginTop: 7, fontSize: 11, lineHeight: 16 },
  timestamp: { fontSize: 10, lineHeight: 14, paddingHorizontal: 4 },
});
