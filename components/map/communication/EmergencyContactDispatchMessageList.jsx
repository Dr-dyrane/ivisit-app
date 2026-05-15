import { useMemo } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { styles } from "./emergencyContactDispatch.styles";

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
  colors,
}) {
  // Group messages by sender for visual grouping
  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const groups = [];
    let currentGroup = null;

    messages.forEach((msg, index) => {
      const isOwn = msg.senderRole === "patient";
      const prevMsg = messages[index - 1];

      // Start new group if:
      // - First message
      // - Different sender
      // - More than 2 minutes gap
      const shouldStartNewGroup =
        !currentGroup ||
        currentGroup.isOwn !== isOwn ||
        (prevMsg && new Date(msg.createdAt) - new Date(prevMsg.createdAt) > 120000);

      if (shouldStartNewGroup) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          isOwn,
          senderRole: msg.senderRole,
          senderId: msg.senderId,
          displayName: msg.senderRole === "patient" ? "You" : msg.senderRole,
          messages: [],
        };
      }

      currentGroup.messages.push(msg);
    });

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [messages]);

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
          Send an update
        </Text>
        <Text style={[styles.emptyBody, { color: colors.subtext }]}>
          Use this for pickup changes, arrival updates, or dispatch instructions.
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
            This conversation is archived. No new messages can be sent.
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
  const timeAgo = formatDistanceToNow(new Date(firstMessage.createdAt), {
    addSuffix: true,
  });

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
  const isFailed = !isOptimistic && message.deletedAt; // Using deleted_at as failed flag for now

  return (
    <View
      style={[
        styles.messageBubble,
        isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
        isOptimistic && styles.messageBubbleOptimistic,
        isFailed && styles.messageBubbleFailed,
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

      {/* Failed retry icon */}
      {isFailed && (
        <Ionicons name="alert-circle-outline" size={16} color={colors.accent} style={styles.failedIcon} />
      )}
    </View>
  );
}

export default EmergencyContactDispatchMessageList;
