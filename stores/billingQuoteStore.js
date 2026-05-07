import { create } from "zustand";

const createInitialState = () => ({
  billingCountryCodeOverride: null,
  billingCurrencyCodeOverride: null,
  lastQuoteSnapshot: null,
  quoteRequestKey: null,
});

export const useBillingQuoteStore = create((set) => ({
  ...createInitialState(),

  setBillingOverrides: ({ billingCountryCode = null, billingCurrencyCode = null } = {}) =>
    set(() => ({
      billingCountryCodeOverride: billingCountryCode,
      billingCurrencyCodeOverride: billingCurrencyCode,
    })),

  clearBillingOverrides: () =>
    set(() => ({
      billingCountryCodeOverride: null,
      billingCurrencyCodeOverride: null,
    })),

  setLastQuoteSnapshot: (quote) =>
    set(() => ({
      lastQuoteSnapshot: quote ?? null,
    })),

  setQuoteRequestKey: (quoteRequestKey) =>
    set(() => ({
      quoteRequestKey: quoteRequestKey ?? null,
    })),

  resetBillingQuoteRuntime: () =>
    set(() => ({
      ...createInitialState(),
    })),
}));

export default useBillingQuoteStore;

