import { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";
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
import EmergencyContactDispatchComposer from "./EmergencyContactDispatchComposer";
import EmergencyContactDispatchQuickActions from "./EmergencyContactDispatchQuickActions";
import { styles } from "./emergencyContactDispatch.styles";

// PULLBACK NOTE: Contact Dispatch CD-6 - Modal orchestrator.
// Owns: MapModalShell integration, state coordination, and child component composition.
// Does NOT own: message rendering, composer logic, or quick action handlers (delegated to children).

const QUICK_ACTIONS = [
  { key: "moving", label: "Moving toward ambulance" },
  { key: "meet_halfway", label: "Meet halfway?" },
  { key: "pickup_changed", label: "Pickup changed" },
  { key: "call_me", label: "Please call me" },
  { key: "arrived", label: "We arrived" },
];

export function EmergencyContactDispatchModal({ visible, onClose }) {
  const { isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = useAtom(emergencyChatModalVisibleAtom);
  const [requestId, setRequestId] = useAtom(activeEmergencyChatRequestIdAtom);
  
  const [composerText, setComposerText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Sync modal visibility with atom
  useEffect(() => {
    setModalVisible(visible);
  }, [visible, setModalVisible]);

  // Close handler
  const handleClose = () => {
    setModalVisible(false);
    setRequestId(null);
    setComposerText("");
    onClose?.();
  };

  // Room lifecycle
  const lifecycle = useEmergencyChatRoomLifecycle();

  // Room data
  const { room, participants, isEnsuring, ensureRoom } = useEmergencyChatRoom({
    requestId,
    enabled: visible && Boolean(requestId),
  });

  // Messages
  const { messages, isLoading: isLoadingMessages } = useEmergencyChatMessages({
    roomId: room?.id,
    enabled: visible && Boolean(room?.id),
  });

  // Mutations
  const { sendMessage, markRoomRead, isSending: isMutationSending, sendError } =
    useEmergencyChatMutations({
      roomId: room?.id,
      senderId: null, // TODO: get from auth context
      senderRole: "patient", // TODO: derive from profile
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
      lifecycle.roomReady(room?.id);
    }
  }, [visible, requestId, lifecycle, room?.id]);

  useEffect(() => {
    if (lifecycle.isEnsuringRoom && !isEnsuring && room?.id) {
      lifecycle.messagesReady();
    }
  }, [lifecycle, isEnsuring, room?.id]);

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
  const handleSend = async (text) => {
    if (!text?.trim() || isSending || !lifecycle.canSend) return;
    
    setIsSending(true);
    lifecycle.sendStart();

    try {
      const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await sendMessage({
        body: text.trim(),
        kind: "text",
        clientMessageId,
        metadata: {},
      });
      lifecycle.sendSuccess();
      setComposerText("");
    } catch (error) {
      lifecycle.sendFailure(error.message);
    } finally {
      setIsSending(false);
    }
  };

  // Quick action handler
  const handleQuickAction = async (action) => {
    if (!lifecycle.canSend) return;
    
    const clientMessageId = `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      await sendMessage({
        body: action.label,
        kind: "quick_action",
        clientMessageId,
        metadata: { quickActionKey: action.key },
      });
    } catch (error) {
      console.warn("[EmergencyContactDispatchModal] Quick action failed:", error);
    }
  };

  // Mark as read on mount
  useEffect(() => {
    if (messages.length > 0 && room?.id && lifecycle.isReady) {
      markRoomRead().catch((err) => {
        console.warn("[EmergencyContactDispatchModal] Mark read failed:", err);
      });
    }
  }, [messages, room?.id, lifecycle.isReady, markRoomRead]);

  // Colors
  const colors = useMemo(
    () => ({
      text: isDarkMode ? "#F8FAFC" : "#0F172A",
      subtext: isDarkMode ? "#94A3B8" : "#64748B",
      bg: isDarkMode ? "rgba(8, 15, 27, 0.92)" : "rgba(255, 255, 255, 0.92)",
      accent: "#DC2626",
    }),
    [isDarkMode]
  );

  // Status strip
  const getStatusText = () => {
    if (lifecycle.isError) return "Connection error. Tap to retry.";
    if (lifecycle.isReconnecting) return "Reconnecting...";
    if (lifecycle.isEnsuringRoom || isEnsuring) return "Opening dispatch...";
    if (lifecycle.isLoadingMessages || isLoadingMessages) return "Loading messages...";
    if (lifecycle.isArchived) return "This conversation is archived.";
    return null;
  };

  const statusText = getStatusText();

  return (
    <MapModalShell
      visible={modalVisible}
      onClose={handleClose}
      title="Contact Dispatch"
      enableSnapDetents={false}
      matchExpandedSheetHeight={true}
      minHeightRatio={0.7}
      maxHeightRatio={0.92}
      scrollEnabled={true}
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
              Retry
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
        colors={colors}
      />

      {/* Quick Actions */}
      {!lifecycle.isArchived && lifecycle.isReady && (
        <EmergencyContactDispatchQuickActions
          actions={QUICK_ACTIONS}
          onSelect={handleQuickAction}
          colors={colors}
        />
      )}

      {/* Composer */}
      {!lifecycle.isArchived && (
        <EmergencyContactDispatchComposer
          text={composerText}
          onChangeText={setComposerText}
          onSend={() => handleSend(composerText)}
          isSending={isSending || isMutationSending}
          disabled={!lifecycle.canSend}
          error={sendError}
          colors={colors}
        />
      )}
    </MapModalShell>
  );
}

export default EmergencyContactDispatchModal;
