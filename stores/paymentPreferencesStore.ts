/**
 * Payment Preferences Store
 *
 * Zustand store for persistent payment preferences.
 * Saved to AsyncStorage for cross-session persistence.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PaymentPreferencesState {
  // Default payment method ID
  defaultPaymentMethodId: string | null;

  // Actions
  setDefaultPaymentMethod: (methodId: string | null) => void;
  clearDefaultPaymentMethod: () => void;
}

export const usePaymentPreferencesStore = create<PaymentPreferencesState>()(
  persist(
    (set) => ({
      defaultPaymentMethodId: null,

      setDefaultPaymentMethod: (methodId) =>
        set({ defaultPaymentMethodId: methodId }),

      clearDefaultPaymentMethod: () =>
        set({ defaultPaymentMethodId: null }),
    }),
    {
      name: "payment-preferences-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
