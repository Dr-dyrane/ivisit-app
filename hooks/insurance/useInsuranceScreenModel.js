import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAtom } from "jotai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import {
  insuranceEditingIdAtom,
  insuranceFormDataAtom,
  INSURANCE_FORM_DEFAULT,
  insuranceShowAddModalAtom,
  insuranceWizardStepAtom,
} from "../../atoms/uiEphemeral.atoms";
import { notificationDispatcher } from "../../services/notificationDispatcher";
import { insuranceService } from "../../services/insuranceService";
import { ocrService } from "../../services/ocrService";
import { INSURANCE_SCREEN_COPY } from "../../components/insurance/insuranceScreen.content";

function createEmptyDraft() {
  return { ...INSURANCE_FORM_DEFAULT };
}

function normalizePolicyToDraft(policy) {
  return {
    provider_name: policy?.provider_name || "",
    policy_number: policy?.policy_number || "",
    group_number: policy?.group_number || "",
    policy_holder_name: policy?.policy_holder_name || "",
    front_image_url: policy?.front_image_url || "",
    back_image_url: policy?.back_image_url || "",
  };
}

function getInputValidation(field, value) {
  const text = String(value || "").trim();

  switch (field) {
    case "provider_name":
      if (text.length === 0) return { valid: false, message: "" };
      if (text.length < 3) {
        return { valid: false, message: "Provider name is too short." };
      }
      return { valid: true, message: "Looks good." };
    case "policy_number": {
      if (text.length === 0) return { valid: false, message: "" };
      const policyRegex = /^[A-Z0-9\-\s]+$/i;
      if (!policyRegex.test(text)) {
        return {
          valid: false,
          message: "Use letters, numbers, and dashes only.",
        };
      }
      if (text.replace(/[^A-Z0-9]/gi, "").length < 5) {
        return { valid: false, message: "Policy number is too short." };
      }
      return { valid: true, message: "Ready to save." };
    }
    case "group_number": {
      if (text.length === 0) return { valid: false, message: "" };
      const groupRegex = /^[A-Z0-9\-\s]+$/i;
      if (!groupRegex.test(text)) {
        return {
          valid: false,
          message: "Use letters, numbers, and dashes only.",
        };
      }
      return { valid: true, message: "Saved to the draft." };
    }
    default:
      return { valid: false, message: "" };
  }
}

function formatLastUpdatedLabel(policies) {
  const latest = [...policies]
    .map((policy) => policy?.updated_at || policy?.created_at || null)
    .filter(Boolean)
    .sort((left, right) => new Date(right) - new Date(left))[0];

  return latest ? new Date(latest).toLocaleString() : "Not updated yet";
}

export function useInsuranceScreenModel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { syncUserData, user } = useAuth();
  const { showToast } = useToast();
  const insurancePoliciesQueryKey = useMemo(
    () => ["insurancePolicies", user?.id || "anonymous"],
    [user?.id],
  );

  const [showAddModal, setShowAddModal] = useAtom(insuranceShowAddModalAtom);
  const [step, setStep] = useAtom(insuranceWizardStepAtom);
  const [formData, setFormData] = useAtom(insuranceFormDataAtom);
  const [editingId, setEditingId] = useAtom(insuranceEditingIdAtom);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const policiesQuery = useQuery({
    queryKey: insurancePoliciesQueryKey,
    queryFn: () => insuranceService.list(),
    staleTime: 30 * 1000,
  });

  const policies = useMemo(
    () =>
      Array.isArray(policiesQuery.data)
        ? [...policiesQuery.data].sort((left, right) => {
            if (left?.is_default === right?.is_default) return 0;
            return left?.is_default ? -1 : 1;
          })
        : [],
    [policiesQuery.data],
  );

  const resetWizard = useCallback(() => {
    setFormData(createEmptyDraft());
    setEditingId(null);
    setStep(0);
  }, [setEditingId, setFormData, setStep]);

  const closeEditor = useCallback(() => {
    setShowAddModal(false);
    resetWizard();
  }, [resetWizard, setShowAddModal]);

  const refreshPolicies = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: insurancePoliciesQueryKey,
    });
  }, [insurancePoliciesQueryKey, queryClient]);

  const refresh = useCallback(() => {
    return policiesQuery.refetch();
  }, [policiesQuery.refetch]);

  const openCreate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetWizard();
    setShowAddModal(true);
  }, [resetWizard, setShowAddModal]);

  const editPolicy = useCallback(
    (policy) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFormData(normalizePolicyToDraft(policy));
      setEditingId(policy?.id || null);
      setStep(0);
      setShowAddModal(true);
    },
    [setEditingId, setFormData, setShowAddModal, setStep],
  );

  const updateDraftField = useCallback(
    (field, value) => {
      setFormData((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [setFormData],
  );

  const canAdvance = useMemo(() => {
    if (step === 0) {
      return getInputValidation("provider_name", formData.provider_name).valid;
    }
    if (step === 1) {
      return getInputValidation("policy_number", formData.policy_number).valid;
    }
    return true;
  }, [formData.policy_number, formData.provider_name, step]);

  const nextStep = useCallback(() => {
    if (step >= 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((current) => Math.min(current + 1, 2));
  }, [setStep, step]);

  const previousStep = useCallback(() => {
    if (step <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((current) => Math.max(current - 1, 0));
  }, [setStep, step]);

  const setDefaultPolicy = useCallback(
    async (id) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await insuranceService.setDefault(id);
        await refreshPolicies();
        showToast(INSURANCE_SCREEN_COPY.messages.defaultUpdated, "success");
      } catch (error) {
        showToast(
          error?.message || "Failed to update default coverage.",
          "error",
        );
      }
    },
    [refreshPolicies, showToast],
  );

  const linkPayment = useCallback(
    (policy) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: "/(user)/(stacks)/payment",
        params: {
          policyId: policy.id,
          isLinking: "true",
          providerName: policy.provider_name,
        },
      });
    },
    [router],
  );

  const deletePolicy = useCallback(
    (id, isDefault) => {
      if (isDefault) {
        Alert.alert(
          "Default policy",
          INSURANCE_SCREEN_COPY.messages.deleteDefaultBlocked,
        );
        return;
      }

      Alert.alert(
        INSURANCE_SCREEN_COPY.messages.deleteTitle,
        INSURANCE_SCREEN_COPY.messages.deleteBody,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await insuranceService.delete(id);
                await notificationDispatcher.dispatchInsuranceEvent("deleted", {
                  id,
                });
                await refreshPolicies();
                await syncUserData?.();
                showToast(INSURANCE_SCREEN_COPY.messages.deleted, "success");
              } catch (error) {
                showToast(
                  error?.message || INSURANCE_SCREEN_COPY.messages.deleteFailed,
                  "error",
                );
              }
            },
          },
        ],
      );
    },
    [refreshPolicies, showToast, syncUserData],
  );

  const scanInsuranceCard = useCallback(async () => {
    setIsScanning(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          INSURANCE_SCREEN_COPY.messages.cameraPermissionTitle,
          INSURANCE_SCREEN_COPY.messages.cameraPermissionBody,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open settings",
              onPress: () => ImagePicker.openSettingsAsync(),
            },
          ],
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
      });

      if (result.canceled) return;

      const uri = result.assets[0]?.uri;
      if (!uri) return;

      const scanResult = await ocrService.scanCard(uri);
      if (scanResult.success) {
        setFormData((current) => ({
          ...current,
          provider_name: current.provider_name || scanResult.data.provider_name,
          policy_number: current.policy_number || scanResult.data.policy_number,
          group_number: current.group_number || scanResult.data.group_number,
          policy_holder_name:
            current.policy_holder_name || scanResult.data.policy_holder_name,
          front_image_url: uri,
        }));
        showToast(INSURANCE_SCREEN_COPY.messages.scanSuccess, "success");
        return;
      }

      setFormData((current) => ({
        ...current,
        front_image_url: uri,
      }));
      showToast(INSURANCE_SCREEN_COPY.messages.scanPartial, "info");
    } catch (error) {
      showToast(INSURANCE_SCREEN_COPY.messages.scanFailed, "error");
    } finally {
      setIsScanning(false);
    }
  }, [setFormData, showToast]);

  const pickImage = useCallback(
    async (field) => {
      try {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            INSURANCE_SCREEN_COPY.messages.libraryPermissionTitle,
            INSURANCE_SCREEN_COPY.messages.libraryPermissionBody,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open settings",
                onPress: () => ImagePicker.openSettingsAsync(),
              },
            ],
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 10],
          quality: 0.8,
        });

        if (result.canceled) return;

        const uri = result.assets[0]?.uri;
        if (!uri) return;
        updateDraftField(field, uri);
      } catch (error) {
        showToast("Unable to pick that image right now.", "error");
      }
    },
    [showToast, updateDraftField],
  );

  const savePolicy = useCallback(async () => {
    setIsSubmitting(true);
    try {
      let finalData = { ...formData };

      if (
        formData.front_image_url &&
        formData.front_image_url.startsWith("file://")
      ) {
        finalData.front_image_url = await insuranceService.uploadImage(
          formData.front_image_url,
        );
      }

      if (
        formData.back_image_url &&
        formData.back_image_url.startsWith("file://")
      ) {
        finalData.back_image_url = await insuranceService.uploadImage(
          formData.back_image_url,
        );
      }

      if (editingId) {
        await insuranceService.update(editingId, finalData);
      } else {
        const newPolicy = await insuranceService.create(finalData);
        await notificationDispatcher.dispatchInsuranceEvent(
          "created",
          newPolicy,
        );
      }

      await refreshPolicies();
      if (!editingId) {
        await syncUserData?.();
      }
      showToast(INSURANCE_SCREEN_COPY.messages.saved, "success");
      setShowAddModal(false);
      resetWizard();
    } catch (error) {
      showToast(
        error?.message || INSURANCE_SCREEN_COPY.messages.saveFailed,
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    editingId,
    formData,
    refreshPolicies,
    resetWizard,
    setShowAddModal,
    showToast,
    syncUserData,
  ]);

  const defaultPolicy = useMemo(
    () => policies.find((policy) => policy?.is_default) || policies[0] || null,
    [policies],
  );
  const linkedPaymentCount = useMemo(
    () => policies.filter((policy) => policy?.linked_payment_method).length,
    [policies],
  );
  const imagePolicyCount = useMemo(
    () =>
      policies.filter(
        (policy) => policy?.front_image_url || policy?.back_image_url,
      ).length,
    [policies],
  );

  const coverageCountLabel = policies.length
    ? `${policies.length} ${policies.length === 1 ? "policy" : "policies"}`
    : "No policies yet";
  const defaultPolicyLabel =
    defaultPolicy?.provider_name ||
    INSURANCE_SCREEN_COPY.messages.noDefaultPolicy;
  const linkedPaymentLabel = linkedPaymentCount
    ? `${linkedPaymentCount} ${linkedPaymentCount === 1 ? "card linked" : "cards linked"}`
    : INSURANCE_SCREEN_COPY.messages.noLinkedPayment;
  const imageStatusLabel = imagePolicyCount
    ? `${imagePolicyCount} ${imagePolicyCount === 1 ? "card saved" : "cards saved"}`
    : INSURANCE_SCREEN_COPY.messages.noCardImages;
  const lastUpdatedLabel = useMemo(
    () => formatLastUpdatedLabel(policies),
    [policies],
  );
  const syncNotice = policiesQuery.error
    ? INSURANCE_SCREEN_COPY.messages.syncFallback
    : null;

  return {
    policies,
    isDataLoading: policiesQuery.isLoading && policies.length === 0,
    isRefreshing: policiesQuery.isFetching && !policiesQuery.isLoading,
    isSubmitting,
    isScanning,
    isEditorOpen: showAddModal,
    isEditing: Boolean(editingId),
    step,
    draft: formData,
    canAdvance,
    coverageCountLabel,
    defaultPolicyLabel,
    linkedPaymentLabel,
    imageStatusLabel,
    lastUpdatedLabel,
    syncNotice,
    refresh,
    openCreate,
    closeEditor,
    editPolicy,
    updateDraftField,
    getInputValidation,
    nextStep,
    previousStep,
    setDefaultPolicy,
    linkPayment,
    deletePolicy,
    scanInsuranceCard,
    pickImage,
    savePolicy,
  };
}
