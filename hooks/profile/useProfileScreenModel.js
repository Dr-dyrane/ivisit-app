import { useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useProfileForm } from "./useProfileForm";
import { useMedicalProfile } from "../user/useMedicalProfile";
import { useEmergencyContacts } from "../emergency/useEmergencyContacts";
import {
  navigateToEmergencyContacts,
  navigateToInsurance,
  navigateToMedicalProfile,
} from "../../utils/navigationHelpers";

// PULLBACK NOTE: Screen model owns route-local orchestration state and derived profile snapshot.
// It keeps the route thin and lets the orchestrator compose surfaces without re-deriving counts inline.

const PROFILE_FIELDS = [
  "fullName",
  "username",
  "gender",
  "email",
  "phone",
  "address",
  "dateOfBirth",
  "imageUri",
];

const MEDICAL_IGNORED_FIELDS = new Set([
  "id",
  "userId",
  "user_id",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
]);

function hasMeaningfulValue(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).length > 0;
  }
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function countCompletedFields(record, keys) {
  return keys.reduce(
    (count, key) => count + (hasMeaningfulValue(record?.[key]) ? 1 : 0),
    0,
  );
}

function countMeaningfulMedicalFields(profile) {
  if (!profile || typeof profile !== "object") return 0;

  return Object.entries(profile).reduce((count, [key, value]) => {
    if (MEDICAL_IGNORED_FIELDS.has(key)) return count;
    return count + (hasMeaningfulValue(value) ? 1 : 0);
  }, 0);
}

export function useProfileScreenModel() {
  const router = useRouter();
  const { user, syncUserData, logout } = useAuth();
  const { profile: medicalProfile, refreshProfile } = useMedicalProfile();
  const { contacts: emergencyContacts = [], refreshContacts } =
    useEmergencyContacts();
  const {
    formState,
    displayId,
    isDataLoading,
    isDeleting,
    pickImage,
    saveProfile,
    deleteAccount,
  } = useProfileForm();

  const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
    useState(false);

  const completedProfileFields = useMemo(
    () => countCompletedFields(user, PROFILE_FIELDS),
    [user],
  );
  const medicalFieldCount = useMemo(
    () => countMeaningfulMedicalFields(medicalProfile),
    [medicalProfile],
  );

  const profileCompletionLabel = useMemo(
    () => `${completedProfileFields}/${PROFILE_FIELDS.length} details saved`,
    [completedProfileFields],
  );
  const emergencyCountLabel = useMemo(() => {
    const count = Array.isArray(emergencyContacts)
      ? emergencyContacts.length
      : 0;
    return `${count} contact${count === 1 ? "" : "s"}`;
  }, [emergencyContacts]);
  const healthStatusLabel = useMemo(
    () =>
      medicalFieldCount > 0
        ? `${medicalFieldCount} health detail${medicalFieldCount === 1 ? "" : "s"} saved`
        : "Add health details",
    [medicalFieldCount],
  );
  const coverageStatusLabel = useMemo(
    () => (user?.hasInsurance ? "Coverage on file" : "No coverage added"),
    [user?.hasInsurance],
  );

  const openPersonalInfo = useCallback(() => {
    setIsPersonalInfoModalOpen(true);
  }, []);

  const closePersonalInfo = useCallback(() => {
    setIsPersonalInfoModalOpen(false);
  }, []);

  const openDeleteAccount = useCallback(() => {
    setIsDeleteAccountModalOpen(true);
  }, []);

  const closeDeleteAccount = useCallback(() => {
    setIsDeleteAccountModalOpen(false);
  }, []);

  const refresh = useCallback(() => {
    syncUserData();
    refreshProfile();
    refreshContacts();
  }, [refreshContacts, refreshProfile, syncUserData]);

  const confirmDeleteAccount = useCallback(async () => {
    const success = await deleteAccount(router);
    if (success) {
      setIsDeleteAccountModalOpen(false);
    }
  }, [deleteAccount, router]);

  const openEmergencyContacts = useCallback(() => {
    navigateToEmergencyContacts({ router });
  }, [router]);

  const openMedicalProfile = useCallback(() => {
    navigateToMedicalProfile({ router });
  }, [router]);

  const openInsurance = useCallback(() => {
    navigateToInsurance({ router });
  }, [router]);

  return {
    router,
    user,
    displayId,
    imageUri: formState.imageUri,
    emergencyContacts,
    formState,
    isDataLoading,
    isDeleting,
    pickImage,
    saveProfile,
    signOut: logout,
    refresh,
    isPersonalInfoModalOpen,
    isDeleteAccountModalOpen,
    openPersonalInfo,
    closePersonalInfo,
    openDeleteAccount,
    closeDeleteAccount,
    confirmDeleteAccount,
    profileCompletionLabel,
    emergencyCountLabel,
    healthStatusLabel,
    coverageStatusLabel,
    navigateToEmergencyContacts,
    navigateToMedicalProfile,
    navigateToInsurance,
    openEmergencyContacts,
    openMedicalProfile,
    openInsurance,
  };
}
