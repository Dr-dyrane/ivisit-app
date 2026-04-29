import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { useToast } from "../../contexts/ToastContext";
import { isValidName, isValidPhone } from "../../utils/validation";
import { useEmergencyContacts } from "./useEmergencyContacts";
import {
  createEmergencyContactDraft,
  emergencyContactsCanSaveAtom,
  emergencyContactsDraftAtom,
  emergencyContactsEditingIdAtom,
  emergencyContactsEditorModeAtom,
  emergencyContactsEditorVisibleAtom,
  emergencyContactsSavingAtom,
  emergencyContactsSelectedIdsAtom,
  emergencyContactsSelectionCountAtom,
  emergencyContactsWizardStepAtom,
} from "../../atoms/emergencyContactsAtoms";

// PULLBACK NOTE: EmergencyContacts screen model.
// Owns: Layer 5 editor/selection state plus view-specific commands consumed by the orchestrator.
// Does NOT own: canonical contact persistence, migration storage, or lifecycle legality.

const getDraftFromContact = (contact = {}) => ({
  name: typeof contact?.name === "string" ? contact.name : "",
  relationship:
    typeof contact?.relationship === "string" ? contact.relationship : "",
  phone: typeof contact?.phone === "string" ? contact.phone : "",
});

const getErrorMessage = (error, fallback) =>
  error?.message?.split("|")?.[1] || error?.message || fallback;

export function useEmergencyContactsScreenModel() {
  const {
    contacts,
    isLoading,
    error,
    addContact,
    updateContact,
    removeContact,
    migrationStatus,
    skippedLegacyContacts,
    needsMigrationReview,
    backendUnavailable,
    syncNotice,
    removeSkippedLegacyContact,
    dismissMigrationReview,
  } = useEmergencyContacts();
  const { showToast } = useToast();

  const [editorVisible, setEditorVisible] = useAtom(
    emergencyContactsEditorVisibleAtom,
  );
  const [editorMode, setEditorMode] = useAtom(emergencyContactsEditorModeAtom);
  const [editingId, setEditingId] = useAtom(emergencyContactsEditingIdAtom);
  const [draft, setDraft] = useAtom(emergencyContactsDraftAtom);
  const [wizardStep, setWizardStep] = useAtom(emergencyContactsWizardStepAtom);
  const [selectedIds, setSelectedIds] = useAtom(
    emergencyContactsSelectedIdsAtom,
  );
  const [isSaving, setIsSaving] = useAtom(emergencyContactsSavingAtom);
  const [selectionCount] = useAtom(emergencyContactsSelectionCountAtom);
  const [canSave] = useAtom(emergencyContactsCanSaveAtom);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const reachableContacts = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          contact?.isActive !== false && isValidPhone(contact?.phone),
      ),
    [contacts],
  );
  const primaryContact = useMemo(
    () =>
      reachableContacts.find((contact) => contact?.isPrimary === true) ||
      reachableContacts[0] ||
      null,
    [reachableContacts],
  );
  const editingContact = useMemo(
    () =>
      contacts.find((contact) => String(contact?.id) === String(editingId)) ||
      null,
    [contacts, editingId],
  );
  const editingLegacyContact = useMemo(
    () =>
      skippedLegacyContacts.find(
        (contact) => String(contact?.legacyId) === String(editingId),
      ) || null,
    [editingId, skippedLegacyContacts],
  );

  useEffect(() => {
    if (!Array.isArray(contacts) || selectedIds.length === 0) return;
    const validIds = new Set(contacts.map((contact) => String(contact?.id)));
    // Prune stale selections after deletes so bulk actions never point at missing contacts.
    const nextSelectedIds = selectedIds.filter((id) =>
      validIds.has(String(id)),
    );
    if (nextSelectedIds.length !== selectedIds.length) {
      setSelectedIds(nextSelectedIds);
    }
  }, [contacts, selectedIds, setSelectedIds]);

  const resetEditor = useCallback(() => {
    setEditorVisible(false);
    setEditorMode("create");
    setEditingId(null);
    setDraft(createEmergencyContactDraft());
    setWizardStep(0);
    setIsSaving(false);
  }, [
    setDraft,
    setEditingId,
    setEditorMode,
    setEditorVisible,
    setIsSaving,
    setWizardStep,
  ]);

  const openCreate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditorVisible(true);
    setEditorMode("create");
    setEditingId(null);
    setDraft(createEmergencyContactDraft());
    setWizardStep(0);
  }, [setDraft, setEditingId, setEditorMode, setEditorVisible, setWizardStep]);

  const openEdit = useCallback(
    (contact) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEditorVisible(true);
      setEditorMode("edit");
      setEditingId(contact?.id ? String(contact.id) : null);
      setDraft(getDraftFromContact(contact));
      setWizardStep(0);
    },
    [setDraft, setEditingId, setEditorMode, setEditorVisible, setWizardStep],
  );

  const openResolveLegacy = useCallback(
    (contact) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEditorVisible(true);
      setEditorMode("resolve");
      setEditingId(contact?.legacyId ? String(contact.legacyId) : null);
      setDraft(getDraftFromContact(contact));
      setWizardStep(0);
    },
    [setDraft, setEditingId, setEditorMode, setEditorVisible, setWizardStep],
  );

  const setDraftField = useCallback(
    (field, value) => {
      setDraft((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [setDraft],
  );

  const setPhoneDraft = useCallback(
    (phone) => {
      setDraft((current) => ({
        ...current,
        phone: phone || "",
      }));
    },
    [setDraft],
  );

  const isCurrentStepValid = useMemo(() => {
    if (wizardStep === 0) return isValidName(draft?.name);
    if (wizardStep === 1) return isValidPhone(draft?.phone);
    return canSave;
  }, [canSave, draft?.name, draft?.phone, wizardStep]);

  const attemptNextStep = useCallback(() => {
    if (isCurrentStepValid) {
      setWizardStep((current) => Math.min(2, current + 1));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [isCurrentStepValid, setWizardStep]);

  const transitionStep = useCallback(
    (nextStep) => {
      setWizardStep(Math.max(0, Math.min(2, nextStep)));
    },
    [setWizardStep],
  );

  const saveContact = useCallback(async () => {
    if (!canSave) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSaving(true);
    try {
      if (editorMode === "edit" && editingContact?.id) {
        await updateContact(editingContact.id, draft);
        showToast("Contact updated successfully", "success");
      } else {
        await addContact(draft);
        if (editorMode === "resolve" && editingLegacyContact?.legacyId) {
          await removeSkippedLegacyContact(editingLegacyContact.legacyId);
          showToast("Legacy contact migrated successfully", "success");
        } else {
          showToast("Contact added successfully", "success");
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetEditor();
    } catch (saveError) {
      showToast(getErrorMessage(saveError, "Unable to save contact"), "error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  }, [
    addContact,
    canSave,
    draft,
    editingContact?.id,
    editingLegacyContact?.legacyId,
    editorMode,
    removeSkippedLegacyContact,
    resetEditor,
    setIsSaving,
    showToast,
    updateContact,
  ]);

  const deleteContact = useCallback(
    async (contactId) => {
      try {
        await removeContact(contactId);
        showToast("Contact deleted successfully", "success");
      } catch (deleteError) {
        showToast(
          getErrorMessage(deleteError, "Failed to delete contact"),
          "error",
        );
      }
    },
    [removeContact, showToast],
  );

  const toggleSelect = useCallback(
    (contactId) => {
      setSelectedIds((current) => {
        if (current.includes(contactId)) {
          return current.filter((id) => String(id) !== String(contactId));
        }
        return [...current, String(contactId)];
      });
    },
    [setSelectedIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, [setSelectedIds]);

  const bulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      `Delete ${selectedIds.length} contact${selectedIds.length > 1 ? "s" : ""}`,
      "These contacts will be removed from your emergency profile.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all(selectedIds.map((id) => removeContact(id)));
              showToast("Selected contacts deleted", "success");
              setSelectedIds([]);
            } catch (deleteError) {
              showToast(
                getErrorMessage(
                  deleteError,
                  "Failed to delete selected contacts",
                ),
                "error",
              );
            }
          },
        },
      ],
    );
  }, [removeContact, selectedIds, setSelectedIds, showToast]);

  const discardLegacyContact = useCallback(
    async (legacyId) => {
      try {
        await removeSkippedLegacyContact(legacyId);
        showToast("Legacy contact removed", "success");
      } catch (discardError) {
        showToast(
          getErrorMessage(discardError, "Failed to remove legacy contact"),
          "error",
        );
      }
    },
    [removeSkippedLegacyContact, showToast],
  );

  const getInputValidation = useCallback((field, value) => {
    switch (field) {
      case "name":
        if (!value) return { valid: false, message: "" };
        return isValidName(value)
          ? { valid: true, message: "Looks good" }
          : { valid: false, message: "Name must be at least 2 characters" };
      case "relationship":
        if (!value) return { valid: false, message: "" };
        return { valid: true, message: "Optional" };
      case "phone":
        if (!value) return { valid: false, message: "" };
        return isValidPhone(value)
          ? { valid: true, message: "Phone number ready" }
          : { valid: false, message: "A valid phone number is required" };
      default:
        return { valid: false, message: "" };
    }
  }, []);

  return {
    contacts,
    isLoading,
    error,
    migrationStatus,
    needsMigrationReview,
    backendUnavailable,
    syncNotice,
    skippedLegacyContacts,
    contactCount: contacts.length,
    reachableCount: reachableContacts.length,
    reviewCount: skippedLegacyContacts.length,
    primaryContact,
    editorVisible,
    editorMode,
    editingId,
    wizardStep,
    draft,
    isSaving,
    selectionCount,
    selectedIdSet,
    canSave,
    isCurrentStepValid,
    openCreate,
    openEdit,
    openResolveLegacy,
    resetEditor,
    setDraftField,
    setPhoneDraft,
    attemptNextStep,
    transitionStep,
    saveContact,
    deleteContact,
    toggleSelect,
    clearSelection,
    bulkDelete,
    discardLegacyContact,
    dismissMigrationReview,
    getInputValidation,
  };
}

export default useEmergencyContactsScreenModel;
