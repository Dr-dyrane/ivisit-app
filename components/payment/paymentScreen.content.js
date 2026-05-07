// PULLBACK NOTE: Centralized copy/content for PaymentScreen
// OLD: Hardcoded strings scattered throughout PaymentScreen.jsx
// NEW: Centralized content file following map sheets pattern
// REASON: Maintain consistency and ease of updates

import { formatMoney } from "../../utils/formatMoney";

export const PAYMENT_SCREEN_COPY = {
  // Management Mode
  management: {
    title: "Wallet",
    subtitle: "Financial hub",
    savedMethods: "Saved Methods",
    recentActivity: "Recent Activity",
  },

  // Checkout Mode
  checkout: {
    title: "Payment",
    subtitle: "Secure checkout",
    paymentMethod: "Payment Method",
  },

  // Link Card
  linkCard: {
    title: "Link Payment Card",
    subtitle: "For automatic billing & top-ups",
  },

  // Add Funds
  addFunds: {
    title: "Add Funds",
    placeholder: "Enter amount",
    confirm: "Add Funds",
    success: (amount, newBalance) =>
      `Added ${formatMoney(amount, { currency: "USD" })} to your wallet. Your new balance is ${formatMoney(newBalance, { currency: "USD" })}`,
    failed: "Top-up Failed",
    failedMessage: "Could not process top-up. Please check your card.",
  },

  // Payment Method Linking
  linking: {
    title: "Link Payment Method",
    message: (brand, last4, provider) =>
      `Do you want to link ${brand} •••• ${last4} to your ${provider || "insurance"} policy?`,
    cancel: "Cancel",
    confirm: "Link Card",
    success: "Success",
    successMessage: "Payment method linked to policy.",
    successLinked: "New card added and linked to policy.",
    ok: "OK",
    error: "Error",
    errorMessage: "Failed to link card to policy.",
  },

  // Payment Processing
  payment: {
    selectionRequired: "Selection Required",
    selectionRequiredMessage: "Please choose a payment method to continue.",
    success: "Payment Successful",
    successMessage:
      "Your request has been processed securely. Track your service real-time.",
    trackNow: "Track Now",
    failed: "Payment Failed",
    failedMessage: (message) =>
      message || "Something went wrong. Please try another card.",
    unableToConfirm: "Unable to confirm payment",
  },

  // Add Payment Method
  addPaymentMethod: {
    success: "Success",
    successMessage: "Payment method linked successfully.",
    systemError: "System Error",
  },

  // FAB
  fab: {
    icon: "add-circle",
    label: "Add Card",
    subText: "Link new payment method",
    style: "primary",
    haptic: "medium",
    priority: 8,
    animation: "prominent",
    allowInStack: true,
  },

  // Service Types
  service: {
    baseService: "Base Service",
  },
};
