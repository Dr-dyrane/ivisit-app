export const SCHEDULED_VISIT_CANCELLATION_COPY = Object.freeze({
  title: "Cancel visit?",
  message:
    "Your scheduled time will be released. You can book another visit when you are ready.",
  confirmText: "Cancel visit",
  cancelText: "Keep visit",
});

export const shouldUseAppOwnedCancellationConfirmation = (platform) =>
  platform === "web";
