export const NOTIFICATION_DETAILS_COPY = {
  screen: {
    title: "Notification",
  },
  center: {
    title: "Alert detail",
    missingTitle: "Notification unavailable",
    missingBody:
      "This alert is no longer in your inbox or has not synced to this device yet.",
    missingPrimary: "Open inbox",
    linkedVisitLabel: "Linked visit",
    cashApprovalLabel: "Cash payment approval",
    recordLabel: "Recorded",
    typeLabel: "Type",
    statusLabel: "Status",
    priorityLabel: "Priority",
  },
  context: {
    title: "Alert record",
    body: "Review the update and open the next useful surface when needed.",
    inboxLabel: "Inbox",
    visitLabel: "Visit",
    statusLabel: "Status",
  },
  island: {
    title: "Alert actions",
    inboxLabel: "Notifications",
    visitLabel: "Visit detail",
    fallbackLabel: "Keep reviewing your recent updates from the inbox.",
  },
  rows: {
    openInbox: "Open inbox",
    openVisit: "Open visit",
    approveCash: "Approve payment",
    decliningCash: "Declining...",
    approvingCash: "Approving...",
    declineCash: "Decline payment",
  },
  messages: {
    unread: "Unread alert",
    read: "Read alert",
    loading: "Loading alert",
    cashApproved: "Cash payment approved. Dispatch can proceed.",
    cashDeclined: "Cash payment declined. The patient has been notified.",
    cashApproveFailed: "Could not approve the payment. Nothing was charged.",
    cashDeclineFailed: "Could not decline the payment. Nothing changed.",
    cashApprovedOutcome: "You approved this payment.",
    cashDeclinedOutcome: "You declined this payment.",
    cashReadOnly: "Only an organization admin can approve this payment.",
  },
};

export default NOTIFICATION_DETAILS_COPY;
