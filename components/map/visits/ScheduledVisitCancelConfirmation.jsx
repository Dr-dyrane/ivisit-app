import React from "react";
import GlassConfirmDialog from "../../ui/GlassConfirmDialog";
import { SCHEDULED_VISIT_CANCELLATION_COPY } from "../../../utils/scheduledVisitCancellation";

export default function ScheduledVisitCancelConfirmation({
  visible,
  onConfirm,
  onCancel,
}) {
  return (
    <GlassConfirmDialog
      visible={visible}
      title={SCHEDULED_VISIT_CANCELLATION_COPY.title}
      message={SCHEDULED_VISIT_CANCELLATION_COPY.message}
      confirmText={SCHEDULED_VISIT_CANCELLATION_COPY.confirmText}
      cancelText={SCHEDULED_VISIT_CANCELLATION_COPY.cancelText}
      isDestructive
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
