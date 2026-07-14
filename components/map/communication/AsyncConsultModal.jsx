import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useAsyncConsultRoom } from "../../../hooks/asyncConsult/useAsyncConsultRoom";
import { useAsyncConsultMutations } from "../../../hooks/asyncConsult/useAsyncConsultMutations";
import { useCommunicationMessages } from "../../../hooks/communication/useCommunicationMessages";
import { useCommunicationRealtime } from "../../../hooks/communication/useCommunicationRealtime";
import { scheduledVisitReleaseGates } from "../../../services/scheduledVisitsService";
import { SCHEDULED_CARE_MODES } from "../../../utils/scheduledVisitProjection";
import MapModalShell from "../surfaces/MapModalShell";
import AsyncConsultComposer from "./AsyncConsultComposer";
import AsyncConsultDraftPanel from "./AsyncConsultDraftPanel";
import AsyncConsultMessageList from "./AsyncConsultMessageList";

const buildColors = (isDarkMode) => ({
  text: isDarkMode ? "#F8FAFC" : "#0F172A",
  muted: isDarkMode ? "#94A3B8" : "#64748B",
  softSurface: isDarkMode ? "rgba(148,163,184,0.12)" : "#F1F5F9",
  inputSurface: isDarkMode ? "rgba(15,23,42,0.78)" : "#FFFFFF",
  border: isDarkMode ? "rgba(148,163,184,0.24)" : "#CBD5E1",
  danger: isDarkMode ? "#FDA4AF" : "#BE123C",
});

function ConsultState({ icon, title, body, loading = false, onRetry, colors }) {
  return (
    <View style={[styles.state, { backgroundColor: colors.softSurface }]}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.muted} />
      ) : (
        <Ionicons name={icon} size={30} color={colors.muted} />
      )}
      <Text style={[styles.stateTitle, { color: colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.stateBody, { color: colors.muted }]}>{body}</Text> : null}
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={({ pressed }) => [styles.retryButton, { opacity: pressed ? 0.84 : 1 }]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function AsyncConsultModal({ visible, historyItem, onClose }) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const colors = useMemo(() => buildColors(isDarkMode), [isDarkMode]);
  const visitId = historyItem?.id ? String(historyItem.id) : null;
  const eligibleVisit =
    historyItem?.sourceKind === "scheduled_visit" &&
    historyItem?.careMode === SCHEDULED_CARE_MODES.ASYNC_CONSULT;
  const consultEnabled =
    visible &&
    eligibleVisit &&
    scheduledVisitReleaseGates.asyncConsult &&
    Boolean(visitId);
  const attemptedVisitRef = useRef(null);
  const markedReadRef = useRef(null);
  const [composerText, setComposerText] = useState("");
  const [pendingSendIntent, setPendingSendIntent] = useState(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftText, setDraftText] = useState("");

  const {
    room,
    participants,
    ensureRoom,
    isEnsuring,
    error: roomError,
    reset: resetRoom,
  } = useAsyncConsultRoom({ visitId, enabled: consultEnabled });
  const activeRoom =
    room?.id && String(room.visitId || "") === String(visitId || "")
      ? room
      : null;
  const roomId = activeRoom?.id || null;
  const messageState = useCommunicationMessages({
    roomId,
    enabled: visible && Boolean(roomId),
  });
  const {
    sendTextMessage,
    markRoomRead,
    createDraft,
    resetSend,
    resetDraft,
    isSending,
    isDrafting,
    sendError,
    draftError,
  } = useAsyncConsultMutations({ roomId });

  useCommunicationRealtime({
    roomId,
    visitId,
    enabled: visible && Boolean(roomId),
  });

  useEffect(() => {
    if (!consultEnabled) {
      attemptedVisitRef.current = null;
      return;
    }
    if (attemptedVisitRef.current === visitId) return;
    attemptedVisitRef.current = visitId;
    ensureRoom({ force: true }).catch(() => {});
  }, [consultEnabled, ensureRoom, visitId]);

  useEffect(() => {
    setComposerText("");
    setPendingSendIntent(null);
    setDraftOpen(false);
    setDraftPrompt("");
    setDraftText("");
    markedReadRef.current = null;
    resetSend();
    resetDraft();
  }, [resetDraft, resetSend, visitId, visible]);

  const latestMessageId =
    messageState.messages[messageState.messages.length - 1]?.id || null;
  useEffect(() => {
    if (!visible || !roomId || !latestMessageId) return;
    const readKey = `${roomId}:${latestMessageId}`;
    if (markedReadRef.current === readKey) return;
    markRoomRead(latestMessageId)
      .then(() => {
        markedReadRef.current = readKey;
      })
      .catch((error) => {
        console.warn("[AsyncConsultModal] Mark read failed:", error);
      });
  }, [latestMessageId, markRoomRead, roomId, visible]);

  const isArchived = Boolean(
    activeRoom &&
      (activeRoom.status !== "active" ||
        activeRoom.archivedAt ||
        historyItem?.status === "completed" ||
        historyItem?.status === "cancelled"),
  );

  const handleRetryRoom = useCallback(async () => {
    attemptedVisitRef.current = visitId;
    await resetRoom();
    try {
      await ensureRoom();
    } catch (_error) {
      // The room state renders the patient-facing retry message.
    }
  }, [ensureRoom, resetRoom, visitId]);

  const handleComposerChange = useCallback(
    (nextText) => {
      setComposerText(nextText);
      if (
        pendingSendIntent &&
        pendingSendIntent.body !== String(nextText || "").trim()
      ) {
        setPendingSendIntent(null);
      }
      if (sendError) resetSend();
    },
    [pendingSendIntent, resetSend, sendError],
  );

  const handleSend = useCallback(async () => {
    const body = composerText.trim();
    if (!body || !roomId || isArchived || isSending) return;
    const intent =
      pendingSendIntent?.body === body
        ? pendingSendIntent
        : { body, clientMessageId: uuidv4() };
    setPendingSendIntent(intent);
    try {
      await sendTextMessage({
        body: intent.body,
        clientMessageId: intent.clientMessageId,
        metadata: {},
      });
      setComposerText("");
      setPendingSendIntent(null);
      setDraftText("");
      setDraftPrompt("");
      setDraftOpen(false);
      resetSend();
    } catch (_error) {
      // Keep the text and client id so an explicit retry is idempotent.
    }
  }, [
    composerText,
    isArchived,
    isSending,
    pendingSendIntent,
    resetSend,
    roomId,
    sendTextMessage,
  ]);

  const handleGenerateDraft = useCallback(async () => {
    const prompt = draftPrompt.trim();
    if (!prompt || isDrafting || !roomId) return;
    resetDraft();
    try {
      const result = await createDraft({
        prompt,
        recentMessages: messageState.messages,
        attachments: [],
      });
      setDraftText(String(result?.draft || "").slice(0, 1000));
    } catch (_error) {
      // The panel renders a stable patient-facing failure state.
    }
  }, [
    createDraft,
    draftPrompt,
    isDrafting,
    messageState.messages,
    resetDraft,
    roomId,
  ]);

  const handleInsertDraft = useCallback(() => {
    const nextText = draftText.trim().slice(0, 1000);
    if (!nextText) return;
    setComposerText(nextText);
    setPendingSendIntent(null);
    setDraftText("");
    setDraftPrompt("");
    setDraftOpen(false);
    resetSend();
    resetDraft();
  }, [draftText, resetDraft, resetSend]);

  const handleDiscardDraft = useCallback(() => {
    setDraftText("");
    resetDraft();
  }, [resetDraft]);

  const composerSlot =
    activeRoom && !isArchived && !isEnsuring && !roomError ? (
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <AsyncConsultComposer
          text={composerText}
          onChangeText={handleComposerChange}
          onSend={handleSend}
          isSending={isSending}
          disabled={!roomId}
          error={sendError}
          colors={colors}
        />
      </View>
    ) : null;

  let content = null;
  if (!eligibleVisit) {
    content = (
      <ConsultState
        icon="calendar-outline"
        title="Consult unavailable"
        body="Messaging is not available for this visit."
        colors={colors}
      />
    );
  } else if (!scheduledVisitReleaseGates.asyncConsult) {
    content = (
      <ConsultState
        icon="chatbubbles-outline"
        title="Messaging unavailable"
        body="This consult cannot be opened right now."
        colors={colors}
      />
    );
  } else if (isEnsuring || (!activeRoom && !roomError)) {
    content = (
      <ConsultState
        loading
        icon="chatbubbles-outline"
        title="Opening consult"
        body="Loading your conversation..."
        colors={colors}
      />
    );
  } else if (roomError || !activeRoom) {
    content = (
      <ConsultState
        icon="cloud-offline-outline"
        title="Consult unavailable"
        body="We could not open this conversation."
        onRetry={handleRetryRoom}
        colors={colors}
      />
    );
  } else {
    content = (
      <View style={styles.content}>
        {scheduledVisitReleaseGates.consultAiDraft && !isArchived ? (
          <AsyncConsultDraftPanel
            open={draftOpen}
            onToggle={() => setDraftOpen((current) => !current)}
            prompt={draftPrompt}
            onPromptChange={setDraftPrompt}
            draft={draftText}
            onDraftChange={setDraftText}
            onGenerate={handleGenerateDraft}
            onInsert={handleInsertDraft}
            onDiscard={handleDiscardDraft}
            isDrafting={isDrafting}
            hasError={Boolean(draftError)}
            colors={colors}
          />
        ) : null}
        <AsyncConsultMessageList
          messages={messageState.messages}
          participants={participants}
          currentUserId={user?.id || null}
          loading={messageState.isLoading}
          error={messageState.error}
          onRetry={messageState.refetch}
          hasOlderMessages={messageState.hasOlderMessages}
          loadingOlder={messageState.isLoadingOlder}
          onLoadOlder={messageState.loadOlderMessages}
          archived={isArchived}
          colors={colors}
        />
      </View>
    );
  }

  return (
    <MapModalShell
      visible={visible}
      onClose={onClose}
      title="Async consult"
      headerLayout="leading"
      enableSnapDetents={false}
      matchExpandedSheetHeight
      minHeightRatio={0.72}
      maxHeightRatio={0.92}
      keyboardAware
      footerSlot={composerSlot}
      contentContainerStyle={styles.shellContent}
    >
      {content}
    </MapModalShell>
  );
}

const styles = StyleSheet.create({
  shellContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  content: { gap: 16 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  state: { alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 30, borderRadius: 8 },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  stateBody: { maxWidth: 320, fontSize: 13, lineHeight: 19, textAlign: "center" },
  retryButton: { minHeight: 42, justifyContent: "center", marginTop: 4, paddingHorizontal: 18, borderRadius: 8, backgroundColor: "#2563EB" },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
