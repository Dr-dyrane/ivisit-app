import { useMemo } from "react";
import useEmergencyContactsStore from "./emergencyContactsStore";
import { isValidPhone } from "../utils/validation";

// PULLBACK NOTE: EmergencyContacts Layer 3 selectors.
// Owns: stable read helpers for cross-surface consumers so UI does not duplicate contact filtering rules.

export const selectEmergencyContacts = (state) =>
  Array.isArray(state?.contacts) ? state.contacts : [];

export const selectEmergencyContactsCount = (state) =>
  selectEmergencyContacts(state).length;

const EMPTY_REACHABLE_CONTACTS = [];
let lastReachableContactsSource = null;
let lastReachableContactsResult = EMPTY_REACHABLE_CONTACTS;

export const selectReachableEmergencyContacts = (state) => {
  const contacts = selectEmergencyContacts(state);
  if (contacts === lastReachableContactsSource) {
    return lastReachableContactsResult;
  }

  lastReachableContactsSource = contacts;
  lastReachableContactsResult =
    contacts.length > 0
      ? contacts.filter(
          (contact) =>
            contact?.isActive !== false && isValidPhone(contact?.phone),
        )
      : EMPTY_REACHABLE_CONTACTS;

  return lastReachableContactsResult;
};

export const selectPrimaryEmergencyContact = (state) =>
  selectEmergencyContacts(state).find(
    (contact) => contact?.isPrimary === true,
  ) ||
  selectReachableEmergencyContacts(state)[0] ||
  null;

export const selectHasSkippedLegacyContacts = (state) =>
  Array.isArray(state?.skippedLegacyContacts) &&
  state.skippedLegacyContacts.length > 0;

export const selectEmergencyContactsReady = (state) =>
  state?.hydrated === true &&
  (state?.serverBacked === true ||
    state?.backendUnavailable === true ||
    !state?.ownerUserId);

export const useEmergencyContactsList = () =>
  useEmergencyContactsStore(selectEmergencyContacts);

export const useEmergencyContactsCount = () =>
  useEmergencyContactsStore(selectEmergencyContactsCount);

export const useReachableEmergencyContacts = () =>
  useEmergencyContactsStore(selectReachableEmergencyContacts);

export const usePrimaryEmergencyContact = () => {
  const store = useEmergencyContactsStore();
  return useMemo(() => selectPrimaryEmergencyContact(store), [store]);
};
