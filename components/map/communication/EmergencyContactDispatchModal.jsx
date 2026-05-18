import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useAtom } from "jotai";
import {
  emergencyChatModalVisibleAtom,
  activeEmergencyChatRequestIdAtom,
} from "../../../atoms/emergencyChatAtoms";
import { useEmergencyChatRoom } from "../../../hooks/emergencyChat/useEmergencyChatRoom";
import { useEmergencyChatMessages } from "../../../hooks/emergencyChat/useEmergencyChatMessages";
import { useEmergencyChatMutations } from "../../../hooks/emergencyChat/useEmergencyChatMutations";
import { useEmergencyChatRealtime } from "../../../hooks/emergencyChat/useEmergencyChatRealtime";
import { useEmergencyChatRoomLifecycle } from "../../../hooks/emergencyChat/useEmergencyChatRoomLifecycle";
import MapModalShell from "../surfaces/MapModalShell";
import EmergencyContactDispatchMessageList from "./EmergencyContactDispatchMessageList";
import { EmergencyContactDispatchComposer } from "./EmergencyContactDispatchComposer";
import EmergencyContactDispatchQuickActions from "./EmergencyContactDispatchQuickActions";
import { styles } from "./emergencyContactDispatch.styles";
import { emergencyChatContent } from "./emergencyContactDispatch.content";
import { generateClientMessageId } from "./emergencyContactDispatch.helpers";
import { emergencyChatTheme } from "./emergencyContactDispatch.theme";

// PULLBACK NOTE: Contact Dispatch CD-6 - Modal orchestrator.
// Owns: MapModalShell integration, state coordination, and child component composition.
// Does NOT own: message rendering, composer logic, or quick action handlers (delegated to children).

const resolveChatRoleFromUser = (user) => {
  const role = user?.role;
  if (role === "dispatcher") return "dispatcher";
  if (role === "org_admin") return "hospital_admin";
  if (role === "provider") return "provider";
  if (role === "admin") return "support";
  return "patient";
};

export function EmergencyContactDispatchModal({ visible, onClose }) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useAtom(emergencyChatModalVisibleAtom);
  const [requestId, setRequestId] = useAtom(activeEmergencyChatRequestIdAtom);
  
  const [composerText, setComposerText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const currentUserId = user?.id ? String(user.id) : null;
  const currentUserChatRole = useMemo(() => resolveChatRoleFromUser(user), [user]);

  // Sync modal visibility with atom
  useEffect(() => {
    setModalVisible(visible);
  }, [visible, setModalVisible]);

  // Close handler
  const handleClose = useCallback(() => {
    setModalVisible(false);
    setRequestId(null);
    setComposerText("");
    onClose?.();
  }, [onClose, setModalVisible, setRequestId]);

  // Room lifecycle
  const lifecycle = useEmergencyChatRoomLifecycle();

  // Room data
  const { room, isEnsuring, ensureRoom } = useEmergencyChatRoom({
    requestId,
    enabled: visible && Boolean(requestId),
  });

  // Messages
  const { messages, isLoading: isLoadingMessages } = useEmergencyChatMessages({
    roomId: room?.id,
    enabled: visible && Boolean(room?.id),
  });

  // Mutations
  const { sendMessage, markRoomRead, requestDemoDispatchReply, isSending: isMutationSending, sendError } =
    useEmergencyChatMutations({
      roomId: room?.id,
      requestId,
      senderId: currentUserId,
      senderRole: currentUserChatRole,
    });

  // Realtime
  useEmergencyChatRealtime({
    roomId: room?.id,
    enabled: visible && Boolean(room?.id) && lifecycle.isReady,
  });

  // Lifecycle orchestration
  useEffect(() => {
    if (visible && requestId && lifecycle.isIdle) {
      lifecycle.open();
    }
  }, [visible, requestId, lifecycle]);

  useEffect(() => {
    if (!room?.id) return;
    if (room.status === "archived") {
      lifecycle.archived(room.id);
      return;
    }
    if (lifecycle.isEnsuringRoom) {
      lifecycle.roomReady(room.id);
    }
  }, [lifecycle, room?.id, room?.status]);

  useEffect(() => {
    if (lifecycle.isLoadingMessages && !isLoadingMessages && room?.id) {
      lifecycle.messagesReady();
    }
  }, [lifecycle, isLoadingMessages, room?.id]);

  useEffect(() => {
    if (!visible && !lifecycle.isIdle) {
      lifecycle.close();
    }
  }, [visible, lifecycle]);

  // Ensure room on mount
  useEffect(() => {
    if (visible && requestId && !room?.id && !isEnsuring) {
      ensureRoom().catch((err) => {
        console.warn("[EmergencyContactDispatchModal] Room ensure failed:", err);
        lifecycle.sendFailure(err.message);
      });
    }
  }, [visible, requestId, room?.id, isEnsuring, ensureRoom, lifecycle]);

  // Send message
  const handleSend = useCallback(async (text) => {
    if (!text?.trim() || isSending || !lifecycle.canSend) return;
    
    setIsSending(true);
    lifecycle.sendStart();

    try {
      const clientMessageId = generateClientMessageId();
      const serverMessage = await sendMessage({
        body: text.trim(),
        kind: "text",
        clientMessageId,
        metadata: {},
      });
      requestDemoDispatchReply(serverMessage);
      lifecycle.sendSuccess();
      setComposerText("");
    } catch (error) {
      lifecycle.sendFailure(error.message);
    } finally {
      setIsSending(false);
    }
  }, [isSending, lifecycle, requestDemoDispatchReply, sendMessage]);

  // Quick action handler
  const handleQuickAction = useCallback(async (action) => {
    if (!lifecycle.canSend) return;
    
    const clientMessageId = generateClientMessageId("quick");
    try {
      const serverMessage = await sendMessage({
        body: action.label,
        kind: "quick_action",
        clientMessageId,
        metadata: { quickActionKey: action.key },
      });
      requestDemoDispatchReply(serverMessage);
    } catch (error) {
      console.warn("[EmergencyContactDispatchModal] Quick action failed:", error);
    }
  }, [lifecycle.canSend, requestDemoDispatchReply, sendMessage]);

  // Mark as read on mount
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : null;
  useEffect(() => {
    if (lastMessageId && room?.id && lifecycle.isReady) {
      markRoomRead(lastMessageId).catch((err) => {
        console.warn("[EmergencyContactDispatchModal] Mark read failed:", err);
      });
    }
  }, [lastMessageId, room?.id, lifecycle.isReady, markRoomRead]);

  // Colors
  const colors = useMemo(
    () => (isDarkMode ? emergencyChatTheme.dark : emergencyChatTheme.light),
    [isDarkMode]
  );

  // Status strip
  const getStatusText = () => {
    if (lifecycle.isError) return emergencyChatContent.statusError;
    if (lifecycle.isReconnecting) return emergencyChatContent.statusReconnecting;
    if (lifecycle.isEnsuringRoom || isEnsuring) return emergencyChatContent.statusConnecting;
    if (lifecycle.isLoadingMessages || isLoadingMessages) return emergencyChatContent.statusLoading;
    if (lifecycle.isArchived) return emergencyChatContent.statusArchived;
    return null;
  };

  const statusText = getStatusText();
  const composerSlot = !lifecycle.isArchived ? (
    <EmergencyContactDispatchComposer
      text={composerText}
      onChangeText={setComposerText}
      onSend={() => handleSend(composerText)}
      isSending={isSending || isMutationSending}
      disabled={!lifecycle.canSend}
      error={sendError}
      colors={colors}
    />
  ) : null;

  return (
    <MapModalShell
      visible={modalVisible}
      onClose={handleClose}
      title={emergencyChatContent.title}
      enableSnapDetents={false}
      matchExpandedSheetHeight={true}
      minHeightRatio={0.7}
      maxHeightRatio={0.92}
      scrollEnabled={true}
      footerSlot={composerSlot}
    >
      {/* Status Strip */}
      {statusText && (
        <View style={styles.statusStrip}>
          <Text style={[styles.statusText, { color: colors.subtext }]}>
            {statusText}
          </Text>
          {lifecycle.isError && (
            <Text
              style={[styles.statusRetry, { color: colors.accent }]}
              onPress={() => lifecycle.retry()}
            >
              {emergencyChatContent.statusRetry}
            </Text>
          )}
        </View>
      )}

      {/* Message List */}
      <EmergencyContactDispatchMessageList
        messages={messages}
        isLoading={lifecycle.isLoadingMessages || isLoadingMessages}
        isEmpty={messages.length === 0 && !isLoadingMessages}
        isArchived={lifecycle.isArchived}
        currentUserId={currentUserId}
        colors={colors}
      />

      {/* Quick Actions */}
      {!lifecycle.isArchived && lifecycle.isReady && (
        <EmergencyContactDispatchQuickActions
          actions={emergencyChatContent.quickActions}
          onSelect={handleQuickAction}
          colors={colors}
        />
      )}

    </MapModalShell>
  );
}

export default EmergencyContactDispatchModal;
