import { useMemo } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./emergencyContactDispatch.styles";
import { emergencyChatContent } from "./emergencyContactDispatch.content";
import { formatMessageTimestamp, groupMessages } from "./emergencyContactDispatch.helpers";

// PULLBACK NOTE: Contact Dispatch CD-6 - Message list component.
// Owns: Message rendering, grouping, and skeleton loading states.
// Does NOT own: Fetch lifecycle, realtime subscription, or send logic.

const SkeletonBubble = ({ isOwn }) => (
  <View
    style={[
      styles.messageBubble,
      isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
      styles.skeletonBubble,
    ]}
  />
);

export function EmergencyContactDispatchMessageList({
  messages,
  isLoading,
  isEmpty,
  isArchived,
  currentUserId,
  colors,
}) {
  // Group messages by sender for visual grouping
  const groupedMessages = useMemo(() => {
    return groupMessages(messages, currentUserId);
  }, [currentUserId, messages]);

  // Render skeleton loading state
  if (isLoading) {
    return (
      <View style={styles.messageList}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.messageRow}>
            <SkeletonBubble isOwn={i % 2 === 0} />
          </View>
        ))}
      </View>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.subtext} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {emergencyChatContent.emptyTitle}
        </Text>
        <Text style={[styles.emptyBody, { color: colors.subtext }]}>
          {emergencyChatContent.emptyBody}
        </Text>
      </View>
    );
  }

  // Archived banner
  if (isArchived) {
    return (
      <View style={styles.messageList}>
        <View style={styles.archivedBanner}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.subtext} />
          <Text style={[styles.archivedText, { color: colors.subtext }]}>
            {emergencyChatContent.archivedReadonly}
          </Text>
        </View>
        {groupedMessages.map((group, groupIndex) => (
          <MessageGroup key={`group-${groupIndex}`} group={group} colors={colors} />
        ))}
      </View>
    );
  }

  // Normal message list
  return (
    <View style={styles.messageList}>
      {groupedMessages.map((group, groupIndex) => (
        <MessageGroup key={`group-${groupIndex}`} group={group} colors={colors} />
      ))}
    </View>
  );
}

function MessageGroup({ group, colors }) {
  const firstMessage = group.messages[0];
  const timeAgo = formatMessageTimestamp(firstMessage.createdAt);

  return (
    <View style={[styles.messageGroup, group.isOwn ? styles.messageGroupOwn : styles.messageGroupOther]}>
      {/* Sender label for non-own messages */}
      {!group.isOwn && (
        <Text style={[styles.senderLabel, { color: colors.subtext }]}>
          {group.displayName}
        </Text>
      )}

      {/* Message bubbles */}
      <View style={styles.messageBubbles}>
        {group.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isOwn={group.isOwn} colors={colors} />
        ))}
      </View>

      {/* Timestamp */}
      <Text style={[styles.timestamp, { color: colors.subtext }]}>{timeAgo}</Text>
    </View>
  );
}

function MessageBubble({ message, isOwn, colors }) {
  const isOptimistic = message.isOptimistic;

  return (
    <View
      style={[
        styles.messageBubble,
        isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
        isOptimistic && styles.messageBubbleOptimistic,
        { backgroundColor: isOwn ? `${colors.accent}15` : colors.bg },
      ]}
    >
      {/* Quick action indicator */}
      {message.kind === "quick_action" && (
        <View style={styles.quickActionIndicator}>
          <Ionicons name="flash" size={14} color={colors.accent} />
        </View>
      )}

      {/* Message body */}
      <Text style={[styles.messageText, { color: colors.text }]}>{message.body}</Text>

      {/* Optimistic spinner */}
      {isOptimistic && (
        <ActivityIndicator size="small" color={colors.subtext} style={styles.optimisticSpinner} />
      )}

    </View>
  );
}

export default EmergencyContactDispatchMessageList;
