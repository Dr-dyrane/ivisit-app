import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { asyncConsultService } from "../../services/asyncConsultService";
import { consultAssistService } from "../../services/consultAssistService";
import { communicationQueryKeys } from "../communication/communication.queryKeys";

export function useAsyncConsultMutations({ roomId }) {
  const queryClient = useQueryClient();
  const messagesKey = useMemo(
    () => communicationQueryKeys.messages(roomId),
    [roomId],
  );

  const sendMutation = useMutation({
    mutationFn: (input) => asyncConsultService.sendTextMessage(roomId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messagesKey }),
  });
  const readMutation = useMutation({
    mutationFn: (messageId) =>
      asyncConsultService.markRoomRead(roomId, messageId),
  });
  const draftMutation = useMutation({
    mutationFn: (input) =>
      consultAssistService.createDraft({ roomId, ...input }),
  });

  const resetSend = useCallback(() => sendMutation.reset(), [sendMutation.reset]);

  return useMemo(
    () => ({
      sendTextMessage: sendMutation.mutateAsync,
      markRoomRead: readMutation.mutateAsync,
      createDraft: draftMutation.mutateAsync,
      resetSend,
      resetDraft: draftMutation.reset,
      isSending: sendMutation.isPending,
      isMarkingRead: readMutation.isPending,
      isDrafting: draftMutation.isPending,
      sendError: sendMutation.error || null,
      readError: readMutation.error || null,
      draftError: draftMutation.error || null,
    }),
    [
      draftMutation.error,
      draftMutation.isPending,
      draftMutation.mutateAsync,
      draftMutation.reset,
      readMutation.error,
      readMutation.isPending,
      readMutation.mutateAsync,
      resetSend,
      sendMutation.error,
      sendMutation.isPending,
      sendMutation.mutateAsync,
    ],
  );
}

export default useAsyncConsultMutations;
