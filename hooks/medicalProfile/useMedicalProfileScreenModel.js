import { useCallback, useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import { useToast } from "../../contexts/ToastContext";
import { useMedicalProfile } from "../user/useMedicalProfile";
import { MEDICAL_PROFILE_SCREEN_COPY } from "../../components/medicalProfile/medicalProfileScreen.content";

// PULLBACK NOTE: Medical profile screen model owns route-local edit state and summary derivations.
// It keeps the route/orchestrator free of field normalization, section construction, and save messaging.

const MEDICAL_PROFILE_FIELDS = [
  "bloodType",
  "allergies",
  "medications",
  "conditions",
  "surgeries",
  "notes",
];

const CRITICAL_FIELDS = ["bloodType", "allergies", "medications"];
const HISTORY_FIELDS = ["conditions", "surgeries"];

function createEmptyProfile() {
  return {
    bloodType: "",
    allergies: "",
    medications: "",
    conditions: "",
    surgeries: "",
    notes: "",
    updatedAt: null,
  };
}

function normalizeProfile(profile) {
  return {
    ...createEmptyProfile(),
    ...(profile && typeof profile === "object" ? profile : {}),
  };
}

function hasMeaningfulValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function countFilledFields(profile, fieldKeys) {
  return fieldKeys.reduce(
    (count, key) => count + (hasMeaningfulValue(profile?.[key]) ? 1 : 0),
    0,
  );
}

function buildSections(profile) {
  return MEDICAL_PROFILE_SCREEN_COPY.sections.map((section) => ({
    ...section,
    rows: section.rows.map((row) => {
      const rawValue = profile?.[row.key];
      const hasValue = hasMeaningfulValue(rawValue);
      const value = hasValue ? String(rawValue).trim() : null;

      return {
        ...row,
        value,
        placeholder: row.placeholder,
        isEmpty: !hasValue,
      };
    }),
  }));
}

export function useMedicalProfileScreenModel() {
  const { showToast } = useToast();
  const { profile, isLoading, isSaving, error, refreshProfile, updateProfile } =
    useMedicalProfile();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const normalizedProfile = useMemo(() => normalizeProfile(profile), [profile]);
  const [draft, setDraft] = useState(normalizedProfile);

  const sections = useMemo(
    () => buildSections(normalizedProfile),
    [normalizedProfile],
  );
  const filledFieldCount = useMemo(
    () => countFilledFields(normalizedProfile, MEDICAL_PROFILE_FIELDS),
    [normalizedProfile],
  );
  const criticalFieldCount = useMemo(
    () => countFilledFields(normalizedProfile, CRITICAL_FIELDS),
    [normalizedProfile],
  );
  const historyFieldCount = useMemo(
    () => countFilledFields(normalizedProfile, HISTORY_FIELDS),
    [normalizedProfile],
  );
  const hasNotes = hasMeaningfulValue(normalizedProfile.notes);
  const completionLabel = `${filledFieldCount}/${MEDICAL_PROFILE_FIELDS.length} details saved`;
  const criticalStatusLabel =
    criticalFieldCount > 0
      ? `${criticalFieldCount}/${CRITICAL_FIELDS.length} ready`
      : "Add key health details";
  const historyStatusLabel =
    historyFieldCount > 0
      ? `${historyFieldCount}/${HISTORY_FIELDS.length} on file`
      : "Add history";
  const notesStatusLabel = hasNotes ? "Notes saved" : "Add emergency notes";
  const lastUpdatedLabel = normalizedProfile.updatedAt
    ? new Date(normalizedProfile.updatedAt).toLocaleString()
    : "Not updated yet";
  const syncNotice = error?.includes("Database update failed")
    ? MEDICAL_PROFILE_SCREEN_COPY.messages.syncFallback
    : null;

  const openEditor = useCallback(() => {
    setDraft(normalizedProfile);
    setIsEditorOpen(true);
  }, [normalizedProfile]);

  const closeEditor = useCallback(() => {
    setDraft(normalizedProfile);
    setIsEditorOpen(false);
  }, [normalizedProfile]);

  const updateField = useCallback((key, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value,
    }));
  }, []);

  const refresh = useCallback(() => {
    refreshProfile();
  }, [refreshProfile]);

  const saveProfile = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateProfile({
        bloodType: draft.bloodType,
        allergies: draft.allergies,
        medications: draft.medications,
        conditions: draft.conditions,
        surgeries: draft.surgeries,
        notes: draft.notes,
      });
      showToast(MEDICAL_PROFILE_SCREEN_COPY.messages.saved, "success");
      setIsEditorOpen(false);
    } catch (saveError) {
      if (saveError?.localSaved) {
        showToast(MEDICAL_PROFILE_SCREEN_COPY.messages.localSaved, "info");
        setIsEditorOpen(false);
        return;
      }
      showToast(MEDICAL_PROFILE_SCREEN_COPY.messages.failed, "error");
      throw saveError;
    }
  }, [draft, showToast, updateProfile]);

  return {
    isDataLoading: isLoading,
    isSaving,
    isEditorOpen,
    draft,
    sections,
    completionLabel,
    criticalStatusLabel,
    historyStatusLabel,
    notesStatusLabel,
    lastUpdatedLabel,
    syncNotice,
    openEditor,
    closeEditor,
    updateField,
    refresh,
    saveProfile,
  };
}
