import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { showAlert } from "../../utils/platformAlert";
import { useAtom } from "jotai";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { BOOK_VISIT_SCREEN_COPY } from "../../components/visits/bookVisit/bookVisit.content";
import {
  bookVisitProviderModalVisibleAtom,
  bookVisitSearchQueryAtom,
  bookVisitSelectedProviderAtom,
  bookVisitSpecialtySearchVisibleAtom,
} from "../../atoms/bookVisitAtoms";
import {
  BOOK_VISIT_STEPS,
  createEmptyBookVisitDraft,
  useBookVisitStore,
} from "../../stores/bookVisitStore";
import { useBookVisitBootstrap } from "./useBookVisitBootstrap";
import {
  useBookingFacilitiesQuery,
  useBookingSpecialtiesQuery,
} from "./useBookingFacilitiesQuery";
import { useBookVisitAvailabilityQuery } from "./useBookVisitAvailabilityQuery";
import { useScheduledVisitMutations } from "./useScheduledVisitMutations";
import { scheduledVisitReleaseGates } from "../../services/scheduledVisitsService";
import {
  buildBookingIntentFingerprint,
  formatScheduledVisitParts,
  getScheduledCareModeLabel,
  groupAvailabilitySlots,
  SCHEDULED_CARE_MODES,
  toValidIsoString,
} from "../../utils/scheduledVisitProjection";
import {
  navigateBack,
  navigateToVisitDetails,
} from "../../utils/navigationHelpers";

const getNextStepLabel = (step) => {
  switch (step) {
    case BOOK_VISIT_STEPS.SERVICE:
      return "Specialty";
    case BOOK_VISIT_STEPS.SPECIALTY:
      return "Facility";
    case BOOK_VISIT_STEPS.PROVIDER:
      return "Date and time";
    case BOOK_VISIT_STEPS.DATETIME:
      return "Review";
    default:
      return "Visit";
  }
};

const buildAvailabilityWindow = (offsetDays = 0) => {
  const from = new Date();
  from.setSeconds(0, 0);
  from.setDate(from.getDate() + offsetDays);
  const to = new Date(from);
  to.setDate(to.getDate() + 14);
  return { fromAt: from.toISOString(), toAt: to.toISOString() };
};

export function useBookVisitScreenModel() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : null;

  const hydrated = useBookVisitStore((state) => state.hydrated);
  const step = useBookVisitStore((state) => state.step);
  const draft = useBookVisitStore((state) => state.draft);
  const setStep = useBookVisitStore((state) => state.setStep);
  const updateDraftField = useBookVisitStore((state) => state.updateDraftField);
  const mergeDraft = useBookVisitStore((state) => state.mergeDraft);
  const resetBookVisitState = useBookVisitStore(
    (state) => state.resetBookVisitState,
  );
  const getOrCreateBookingIntentKey = useBookVisitStore(
    (state) => state.getOrCreateBookingIntentKey,
  );

  const [specialtySearchVisible, setSpecialtySearchVisible] = useAtom(
    bookVisitSpecialtySearchVisibleAtom,
  );
  const [searchQuery, setSearchQuery] = useAtom(bookVisitSearchQueryAtom);
  const [providerModalVisible, setProviderModalVisible] = useAtom(
    bookVisitProviderModalVisibleAtom,
  );
  const [selectedProvider, setSelectedProvider] = useAtom(
    bookVisitSelectedProviderAtom,
  );
  const [facilitySearchQuery, setFacilitySearchQuery] = useState("");
  const deferredFacilitySearch = useDeferredValue(facilitySearchQuery.trim());
  const [selectedAvailabilityDayKey, setSelectedAvailabilityDayKey] =
    useState(null);
  const [availabilityWindowOffsetDays, setAvailabilityWindowOffsetDays] =
    useState(0);
  const [availabilityRecoveryNotice, setAvailabilityRecoveryNotice] =
    useState(null);
  const [submitError, setSubmitError] = useState(null);

  const scheduledVisitsEnabled =
    scheduledVisitReleaseGates.scheduledVisits === true;
  const bookingData = draft;

  const specialtiesQuery = useBookingSpecialtiesQuery({
    enabled: hydrated && scheduledVisitsEnabled,
  });
  const specialties = Array.isArray(specialtiesQuery.data)
    ? specialtiesQuery.data
    : [];
  const filteredSpecialties = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return specialties;
    return specialties.filter((specialty) =>
      specialty.toLowerCase().includes(query),
    );
  }, [searchQuery, specialties]);

  const facilitiesQuery = useBookingFacilitiesQuery({
    specialty: bookingData.specialty,
    search: deferredFacilitySearch,
    enabled:
      hydrated &&
      scheduledVisitsEnabled &&
      Boolean(bookingData.specialty) &&
      step >= BOOK_VISIT_STEPS.PROVIDER,
  });
  const availableProviders = useMemo(
    () =>
      (facilitiesQuery.data?.pages || []).flatMap(
        (page) => page?.items || [],
      ),
    [facilitiesQuery.data?.pages],
  );
  const facilityResultCount =
    facilitiesQuery.data?.pages?.[0]?.total ?? availableProviders.length;

  const availabilityWindow = useMemo(
    () => buildAvailabilityWindow(availabilityWindowOffsetDays),
    [
      availabilityWindowOffsetDays,
      bookingData.hospital?.id,
      bookingData.specialty,
      bookingData.type,
    ],
  );
  const facilityTimezoneConfirmedAt = toValidIsoString(
    bookingData.hospital?.timezoneConfirmedAt ||
      bookingData.hospital?.timezone_confirmed_at,
  );
  const facilityTimezoneReady = Boolean(facilityTimezoneConfirmedAt);
  const availabilityQuery = useBookVisitAvailabilityQuery({
    hospitalId: bookingData.hospital?.id || null,
    specialty: bookingData.specialty,
    careMode: bookingData.type,
    fromAt: availabilityWindow.fromAt,
    toAt: availabilityWindow.toAt,
    timezoneConfirmedAt: facilityTimezoneConfirmedAt,
    enabled:
      hydrated &&
      scheduledVisitsEnabled &&
      step >= BOOK_VISIT_STEPS.DATETIME,
  });
  const availabilityDays = useMemo(
    () => groupAvailabilitySlots(availabilityQuery.data || []),
    [availabilityQuery.data],
  );
  const slotDateKey = bookingData.slot
    ? formatScheduledVisitParts({
        scheduledStartAt: bookingData.slot.scheduledStartAt,
        scheduledTimezone: bookingData.slot.scheduledTimezone,
      }).dateKey
    : null;
  const effectiveAvailabilityDayKey =
    (selectedAvailabilityDayKey &&
      availabilityDays.some((day) => day.key === selectedAvailabilityDayKey) &&
      selectedAvailabilityDayKey) ||
    slotDateKey ||
    availabilityDays[0]?.key ||
    null;

  const { bookVisit, isBooking, bookingError, resetBooking } =
    useScheduledVisitMutations({ userId });

  const { lifecycle } = useBookVisitBootstrap({
    userId,
    quoteData: null,
    shouldFetchQuote: false,
    isQuoteFetching: false,
    quoteError: null,
    hasQuote: false,
    isSubmitting: isBooking,
    submitError,
  });

  const stepMeta = useMemo(() => {
    if (step === BOOK_VISIT_STEPS.SPECIALTY) {
      return BOOK_VISIT_SCREEN_COPY.steps.specialty;
    }
    if (step === BOOK_VISIT_STEPS.PROVIDER) {
      return BOOK_VISIT_SCREEN_COPY.steps.provider;
    }
    if (step === BOOK_VISIT_STEPS.DATETIME) {
      return BOOK_VISIT_SCREEN_COPY.steps.datetime;
    }
    if (step === BOOK_VISIT_STEPS.SUMMARY) {
      return BOOK_VISIT_SCREEN_COPY.steps.summary;
    }
    return BOOK_VISIT_SCREEN_COPY.steps.service;
  }, [step]);

  const selections = useMemo(() => {
    const slotParts = bookingData.slot
      ? formatScheduledVisitParts({
          scheduledStartAt: bookingData.slot.scheduledStartAt,
          scheduledTimezone: bookingData.slot.scheduledTimezone,
        })
      : null;
    return [
      {
        key: "type",
        label: BOOK_VISIT_SCREEN_COPY.island.serviceLabel,
        value:
          getScheduledCareModeLabel(bookingData.type) ||
          BOOK_VISIT_SCREEN_COPY.compact.noSelection,
      },
      {
        key: "specialty",
        label: BOOK_VISIT_SCREEN_COPY.island.specialtyLabel,
        value:
          bookingData.specialty || BOOK_VISIT_SCREEN_COPY.compact.noSelection,
      },
      {
        key: "facility",
        label: BOOK_VISIT_SCREEN_COPY.island.providerLabel,
        value:
          bookingData.hospital?.name ||
          BOOK_VISIT_SCREEN_COPY.compact.noSelection,
      },
      {
        key: "time",
        label: BOOK_VISIT_SCREEN_COPY.island.timeLabel,
        value:
          slotParts?.dateTimeLabel ||
          BOOK_VISIT_SCREEN_COPY.compact.noSelection,
      },
    ];
  }, [bookingData]);

  const transitionStep = useCallback(
    (nextStep) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(nextStep);
      setSubmitError(null);
      resetBooking();
      if (lifecycle.isError) lifecycle.send({ type: "RESET_ERROR" });
    },
    [lifecycle, resetBooking, setStep],
  );

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === BOOK_VISIT_STEPS.SERVICE) {
      navigateBack({ router, fallbackRoute: "/(user)" });
      return;
    }
    transitionStep(Math.max(BOOK_VISIT_STEPS.SERVICE, step - 1));
  }, [router, step, transitionStep]);

  const handleSelectService = useCallback(
    (careMode) => {
      if (!scheduledVisitsEnabled) {
        showToast(BOOK_VISIT_SCREEN_COPY.messages.bookingUnavailable, "info");
        return;
      }
      mergeDraft({
        ...createEmptyBookVisitDraft(),
        type: careMode,
      });
      transitionStep(BOOK_VISIT_STEPS.SPECIALTY);
    }, [mergeDraft, scheduledVisitsEnabled, showToast, transitionStep]);

  const handleSelectSpecialty = useCallback(
    (specialty) => {
      setSpecialtySearchVisible(false);
      setSearchQuery("");
      setFacilitySearchQuery("");
      setAvailabilityWindowOffsetDays(0);
      setAvailabilityRecoveryNotice(null);
      mergeDraft({
        specialty,
        hospital: null,
        slot: null,
        date: null,
        time: null,
      });
      transitionStep(BOOK_VISIT_STEPS.PROVIDER);
    }, [
      mergeDraft,
      setSearchQuery,
      setSpecialtySearchVisible,
      transitionStep,
    ],
  );

  const handleProviderSelect = useCallback(
    (facility) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedProvider(facility);
      setProviderModalVisible(true);
    }, [setProviderModalVisible, setSelectedProvider],
  );

  const confirmProviderSelection = useCallback(() => {
    if (!selectedProvider) return;
    mergeDraft({
      hospital: selectedProvider,
      slot: null,
      date: null,
      time: null,
    });
    setSelectedAvailabilityDayKey(null);
    setAvailabilityWindowOffsetDays(0);
    setAvailabilityRecoveryNotice(null);
    setProviderModalVisible(false);
    transitionStep(BOOK_VISIT_STEPS.DATETIME);
  }, [
    mergeDraft,
    selectedProvider,
    setProviderModalVisible,
    transitionStep,
  ]);

  const handleSelectDate = useCallback(
    (dateKey) => {
      setAvailabilityRecoveryNotice(null);
      setSelectedAvailabilityDayKey(dateKey);
      updateDraftField("slot", null);
    },
    [updateDraftField],
  );

  const handleSelectTime = useCallback(
    (slot) => {
      setAvailabilityRecoveryNotice(null);
      updateDraftField("slot", slot);
    },
    [updateDraftField],
  );

  const handleNotesChange = useCallback(
    (notes) => updateDraftField("notes", notes),
    [updateDraftField],
  );

  const handleConfirmDateTime = useCallback(() => {
    if (!bookingData.slot?.scheduledStartAt) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(BOOK_VISIT_SCREEN_COPY.messages.dateTimeRequired, "error");
      return;
    }
    transitionStep(BOOK_VISIT_STEPS.SUMMARY);
  }, [bookingData.slot?.scheduledStartAt, showToast, transitionStep]);

  const handleBookVisit = useCallback(async () => {
    if (isBooking) return;
    const fingerprint = buildBookingIntentFingerprint({
      hospitalId: bookingData.hospital?.id,
      specialty: bookingData.specialty,
      careMode: bookingData.type,
      scheduledStartAt: bookingData.slot?.scheduledStartAt,
      notes: bookingData.notes,
    });
    const idempotencyKey = getOrCreateBookingIntentKey(fingerprint);
    if (!idempotencyKey) {
      showToast(BOOK_VISIT_SCREEN_COPY.messages.saveFailed, "error");
      return;
    }

    setSubmitError(null);
    try {
      const visit = await bookVisit({
        hospitalId: bookingData.hospital?.id,
        specialty: bookingData.specialty,
        careMode: bookingData.type,
        scheduledStartAt: bookingData.slot?.scheduledStartAt,
        idempotencyKey,
        notes: bookingData.notes,
        timezoneConfirmedAt: facilityTimezoneConfirmedAt,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(BOOK_VISIT_SCREEN_COPY.messages.saveSuccess, "success");
      resetBookVisitState(userId);
      setSearchQuery("");
      setFacilitySearchQuery("");
      setSelectedProvider(null);
      setProviderModalVisible(false);
      setSpecialtySearchVisible(false);
      navigateToVisitDetails({
        router,
        visitId: visit.id,
        method: "replace",
      });
    } catch (error) {
      setSubmitError(error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (["slot_unavailable", "overlap"].includes(error?.code)) {
        updateDraftField("slot", null);
        setSelectedAvailabilityDayKey(null);
        setStep(BOOK_VISIT_STEPS.DATETIME);
        setAvailabilityRecoveryNotice(
          BOOK_VISIT_SCREEN_COPY.messages.slotChanged,
        );
        showToast(BOOK_VISIT_SCREEN_COPY.messages.slotChanged, "info");
        try {
          await availabilityQuery.refetch();
        } catch (_refreshError) {
          // The availability query owns its retry state; keep the conflict visible.
        }
        return;
      }
      showToast(error?.message || BOOK_VISIT_SCREEN_COPY.messages.saveFailed, "error");
    }
  }, [
    availabilityQuery,
    bookVisit,
    bookingData,
    facilityTimezoneConfirmedAt,
    getOrCreateBookingIntentKey,
    isBooking,
    resetBookVisitState,
    router,
    setProviderModalVisible,
    setSearchQuery,
    setSelectedProvider,
    setSpecialtySearchVisible,
    setStep,
    showToast,
    updateDraftField,
    userId,
  ]);

  const handleChangeDates = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAvailabilityRecoveryNotice(null);
    setSelectedAvailabilityDayKey(null);
    updateDraftField("slot", null);
    setAvailabilityWindowOffsetDays((current) => current + 14);
  }, [updateDraftField]);

  const handleChangeFacility = useCallback(() => {
    setAvailabilityWindowOffsetDays(0);
    setAvailabilityRecoveryNotice(null);
    transitionStep(BOOK_VISIT_STEPS.PROVIDER);
  }, [transitionStep]);

  const handleChangeSpecialty = useCallback(() => {
    setAvailabilityWindowOffsetDays(0);
    setAvailabilityRecoveryNotice(null);
    transitionStep(BOOK_VISIT_STEPS.SPECIALTY);
  }, [transitionStep]);

  const discardBooking = useCallback(() => {
    showAlert(
      "Discard booking",
      "Your saved booking progress will be cleared.",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            resetBookVisitState(userId);
            setProviderModalVisible(false);
            setSelectedProvider(null);
            setSpecialtySearchVisible(false);
            setSearchQuery("");
            navigateBack({ router, fallbackRoute: "/(user)" });
          },
        },
      ],
    );
  }, [
    resetBookVisitState,
    router,
    setProviderModalVisible,
    setSearchQuery,
    setSelectedProvider,
    setSpecialtySearchVisible,
    userId,
  ]);

  const refresh = useCallback(() => {
    if (step === BOOK_VISIT_STEPS.SPECIALTY) return specialtiesQuery.refetch();
    if (step === BOOK_VISIT_STEPS.PROVIDER) return facilitiesQuery.refetch();
    if (step >= BOOK_VISIT_STEPS.DATETIME && facilityTimezoneReady) {
      return availabilityQuery.refetch();
    }
    return Promise.resolve();
  }, [
    availabilityQuery,
    facilitiesQuery,
    facilityTimezoneReady,
    specialtiesQuery,
    step,
  ]);

  return {
    step,
    bookingData,
    stepMeta,
    progressValue: Math.min(1, (step + 1) / (BOOK_VISIT_STEPS.SUMMARY + 1)),
    nextStepLabel: getNextStepLabel(step),
    specialties,
    filteredSpecialties,
    availableProviders,
    availabilityDays,
    availabilityRecoveryNotice,
    selectedAvailabilityDayKey: effectiveAvailabilityDayKey,
    specialtySearchVisible,
    providerModalVisible,
    searchQuery,
    selectedProvider,
    facilitySearchQuery,
    facilityResultCount,
    quote: null,
    quoteLabel: null,
    selections,
    scheduledVisitsEnabled,
    facilityTimezoneReady,
    isDataLoading: !hydrated,
    isSpecialtiesLoading: specialtiesQuery.isLoading,
    specialtiesError: specialtiesQuery.error || null,
    isFacilitiesLoading: facilitiesQuery.isLoading,
    isFacilitiesRefreshing: facilitiesQuery.isFetching,
    facilitiesError: facilitiesQuery.error || null,
    hasMoreFacilities: Boolean(facilitiesQuery.hasNextPage),
    isLoadingMoreFacilities: facilitiesQuery.isFetchingNextPage,
    loadMoreFacilities: facilitiesQuery.fetchNextPage,
    isAvailabilityLoading: availabilityQuery.isLoading,
    isAvailabilityRefreshing: availabilityQuery.isFetching,
    availabilityError: availabilityQuery.error || null,
    isQuoteLoading: false,
    isSubmitting: isBooking,
    error: submitError || bookingError || null,
    isReady: hydrated && scheduledVisitsEnabled,
    currentStepLabel: stepMeta.title,
    handleBack,
    handleSelectService,
    handleSelectSpecialty,
    handleProviderSelect,
    confirmProviderSelection,
    closeProviderModal: () => setProviderModalVisible(false),
    openSpecialtySearch: () => setSpecialtySearchVisible(true),
    closeSpecialtySearch: () => {
      setSpecialtySearchVisible(false);
      setSearchQuery("");
    },
    handleSelectDate,
    handleSelectTime,
    handleNotesChange,
    handleConfirmDateTime,
    handleBookVisit,
    handleChangeDates,
    handleChangeFacility,
    handleChangeSpecialty,
    discardBooking,
    setSearchQuery,
    setFacilitySearchQuery,
    retrySpecialties: specialtiesQuery.refetch,
    retryFacilities: facilitiesQuery.refetch,
    retryAvailability: availabilityQuery.refetch,
    refresh,
  };
}

export default useBookVisitScreenModel;
