import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { addDays, format, startOfToday } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { useEmergency } from "../../contexts/EmergencyContext";
import { useVisits } from "../../contexts/VisitsContext";
import {
  BOOK_VISIT_DOCTOR_NAMES,
  BOOK_VISIT_SCREEN_COPY,
} from "../../components/visits/bookVisit/bookVisit.content";
import {
  bookVisitProviderModalVisibleAtom,
  bookVisitSearchQueryAtom,
  bookVisitSelectedProviderAtom,
  bookVisitSpecialtySearchVisibleAtom,
} from "../../atoms/bookVisitAtoms";
import {
  BOOK_VISIT_STEPS,
  createEmptyBookVisitDraft,
  hydrateBookVisitStore,
  useBookVisitStore,
} from "../../stores/bookVisitStore";
import { useBookVisitQuoteQuery } from "./useBookVisitQuoteQuery";
import { useBookVisitLifecycle } from "./useBookVisitLifecycle";
import { paymentService } from "../../services/paymentService";
import { demoEcosystemService } from "../../services/demoEcosystemService";
import { VISIT_STATUS, VISIT_TYPES } from "../../constants/visits";
import {
  navigateBack,
  navigateToVisitDetails,
} from "../../utils/navigationHelpers";

const safeParseParam = (value) => {
  const source = Array.isArray(value) ? value[0] : value;
  if (!source) return null;
  if (typeof source === "object") return source;
  try {
    return JSON.parse(source);
  } catch (_error) {
    return source;
  }
};

const toTrimmedString = (value) => {
  const source = Array.isArray(value) ? value[0] : value;
  if (typeof source !== "string") return null;
  const trimmed = source.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildRouteSeedSignature = (params = {}) => {
  const payload = {
    type: toTrimmedString(params?.type),
    specialty: toTrimmedString(params?.specialty),
    hospital: safeParseParam(params?.hospital),
    doctor: safeParseParam(params?.doctor),
    date: toTrimmedString(params?.date),
    time: toTrimmedString(params?.time),
    notes: toTrimmedString(params?.notes),
    step: toTrimmedString(params?.step),
  };
  const hasMeaningfulValue = Object.values(payload).some(
    (value) => value !== null && value !== undefined,
  );
  return hasMeaningfulValue ? JSON.stringify(payload) : null;
};

const buildDraftFromParams = (params = {}) => ({
  type: toTrimmedString(params?.type),
  specialty: toTrimmedString(params?.specialty),
  hospital: safeParseParam(params?.hospital),
  doctor: safeParseParam(params?.doctor),
  date: toTrimmedString(params?.date),
  time: toTrimmedString(params?.time),
  notes: toTrimmedString(params?.notes) || "",
});

const asDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getRandomDoctorName = () =>
  BOOK_VISIT_DOCTOR_NAMES[
    Math.floor(Math.random() * BOOK_VISIT_DOCTOR_NAMES.length)
  ];

const getHospitalOrganizationId = (hospital) =>
  hospital?.organizationId || hospital?.organization_id || null;

const getNextStepLabel = (step) => {
  switch (step) {
    case BOOK_VISIT_STEPS.SERVICE:
      return "Care type";
    case BOOK_VISIT_STEPS.SPECIALTY:
      return "Specialty";
    case BOOK_VISIT_STEPS.PROVIDER:
      return "Provider";
    case BOOK_VISIT_STEPS.DATETIME:
      return "Date and time";
    case BOOK_VISIT_STEPS.SUMMARY:
      return "Review";
    default:
      return "Visit";
  }
};

export function useBookVisitScreenModel() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { allHospitals, effectiveDemoModeEnabled } = useEmergency();
  const { addVisit } = useVisits();
  const userId = user?.id ? String(user.id) : null;
  const hospitals = Array.isArray(allHospitals) ? allHospitals : [];

  const hydrated = useBookVisitStore((state) => state.hydrated);
  const ownerUserId = useBookVisitStore((state) => state.ownerUserId);
  const step = useBookVisitStore((state) => state.step);
  const draft = useBookVisitStore((state) => state.draft);
  const quote = useBookVisitStore((state) => state.quote);
  const routeSeedSignature = useBookVisitStore(
    (state) => state.routeSeedSignature,
  );
  const setStep = useBookVisitStore((state) => state.setStep);
  const updateDraftField = useBookVisitStore((state) => state.updateDraftField);
  const mergeDraft = useBookVisitStore((state) => state.mergeDraft);
  const setQuote = useBookVisitStore((state) => state.setQuote);
  const clearQuote = useBookVisitStore((state) => state.clearQuote);
  const seedFromParams = useBookVisitStore((state) => state.seedFromParams);
  const setLifecycleStatus = useBookVisitStore(
    (state) => state.setLifecycleStatus,
  );
  const markHydrated = useBookVisitStore((state) => state.markHydrated);
  const resetBookVisitState = useBookVisitStore(
    (state) => state.resetBookVisitState,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    void hydrateBookVisitStore();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!userId) {
      if (ownerUserId) {
        resetBookVisitState(null);
      }
      return;
    }

    if (ownerUserId && ownerUserId !== userId) {
      resetBookVisitState(userId);
      return;
    }

    if (!ownerUserId) {
      markHydrated(userId);
    }
  }, [hydrated, markHydrated, ownerUserId, resetBookVisitState, userId]);

  const routeSignature = useMemo(
    () => buildRouteSeedSignature(params),
    [params],
  );

  useEffect(() => {
    if (!hydrated || !routeSignature || routeSignature === routeSeedSignature) {
      return;
    }
    seedFromParams(buildDraftFromParams(params), routeSignature);
  }, [hydrated, params, routeSeedSignature, routeSignature, seedFromParams]);

  const bookingData = useMemo(
    () => ({
      ...draft,
      date: asDate(draft?.date),
    }),
    [draft],
  );

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

  const specialties = useMemo(() => {
    const all = new Set();
    hospitals.forEach((hospital) => {
      if (Array.isArray(hospital?.specialties)) {
        hospital.specialties.forEach((specialty) => all.add(specialty));
      }
    });
    return Array.from(all).sort();
  }, [hospitals]);

  const filteredSpecialties = useMemo(() => {
    if (!searchQuery) return specialties;
    return specialties.filter((specialty) =>
      specialty.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, specialties]);

  const availableProviders = useMemo(() => {
    if (!bookingData.specialty) return [];
    return hospitals.filter(
      (hospital) =>
        Array.isArray(hospital?.specialties) &&
        hospital.specialties.includes(bookingData.specialty),
    );
  }, [bookingData.specialty, hospitals]);

  const dates = useMemo(() => {
    const today = startOfToday();
    return Array.from({ length: 14 }).map((_, index) =>
      addDays(today, index + 1),
    );
  }, []);

  const shouldFetchQuote = useMemo(
    () =>
      hydrated &&
      step === BOOK_VISIT_STEPS.SUMMARY &&
      Boolean(bookingData.type) &&
      Boolean(bookingData.date) &&
      Boolean(bookingData.time),
    [bookingData.date, bookingData.time, bookingData.type, hydrated, step],
  );

  const quoteQuery = useBookVisitQuoteQuery({
    userId,
    bookingType: bookingData.type,
    hospitalId: bookingData.hospital?.id || null,
    enabled: shouldFetchQuote,
  });

  useEffect(() => {
    if (quoteQuery.data) {
      setQuote(quoteQuery.data);
    }
  }, [quoteQuery.data, setQuote]);

  const lifecycle = useBookVisitLifecycle({
    hydrated,
    shouldFetchQuote,
    quoteError: quoteQuery.error,
    isQuoteFetching: quoteQuery.isFetching,
    hasQuote: Boolean(quoteQuery.data || quote),
    isSubmitting,
    submitError,
  });

  useEffect(() => {
    setLifecycleStatus({
      lifecycleState: String(lifecycle.lifecycleState),
      lifecycleError: lifecycle.error,
    });
  }, [lifecycle.error, lifecycle.lifecycleState, setLifecycleStatus]);

  const progressValue = useMemo(
    () => Math.min(1, (step + 1) / (BOOK_VISIT_STEPS.SUMMARY + 1)),
    [step],
  );

  const nextStepLabel = useMemo(() => getNextStepLabel(step), [step]);

  const selections = useMemo(
    () => [
      {
        key: "type",
        label: BOOK_VISIT_SCREEN_COPY.island.serviceLabel,
        value:
          bookingData.type === "telehealth"
            ? "Telehealth"
            : bookingData.type === "clinic"
              ? "In-clinic"
              : BOOK_VISIT_SCREEN_COPY.compact.noSelection,
      },
      {
        key: "specialty",
        label: BOOK_VISIT_SCREEN_COPY.island.specialtyLabel,
        value:
          bookingData.specialty || BOOK_VISIT_SCREEN_COPY.compact.noSelection,
      },
      {
        key: "provider",
        label: BOOK_VISIT_SCREEN_COPY.island.providerLabel,
        value:
          bookingData.hospital?.name ||
          bookingData.doctor?.name ||
          BOOK_VISIT_SCREEN_COPY.compact.noSelection,
      },
      {
        key: "time",
        label: BOOK_VISIT_SCREEN_COPY.island.timeLabel,
        value:
          bookingData.date && bookingData.time
            ? `${format(bookingData.date, "MMM d")} • ${bookingData.time}`
            : BOOK_VISIT_SCREEN_COPY.compact.noSelection,
      },
    ],
    [
      bookingData.date,
      bookingData.doctor?.name,
      bookingData.hospital?.name,
      bookingData.specialty,
      bookingData.time,
      bookingData.type,
    ],
  );

  const quoteLabel = useMemo(() => {
    const activeQuote = quoteQuery.data || quote;
    if (quoteQuery.isFetching && !activeQuote) return "Loading estimate";
    if (activeQuote?.total_cost)
      return `$${Number(activeQuote.total_cost).toFixed(2)}`;
    return BOOK_VISIT_SCREEN_COPY.messages.noQuote;
  }, [quote, quoteQuery.data, quoteQuery.isFetching]);

  const isDemoBookingFlow = useMemo(
    () =>
      demoEcosystemService.isDemoFlowActive({
        hospital: bookingData.hospital,
        demoModeEnabled: effectiveDemoModeEnabled,
      }),
    [bookingData.hospital, effectiveDemoModeEnabled],
  );

  const transitionStep = useCallback(
    (nextStep) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(nextStep);
      setSubmitError(null);
      if (lifecycle.isError) {
        lifecycle.send({ type: "RESET_ERROR" });
      }
    },
    [lifecycle, setStep],
  );

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step === BOOK_VISIT_STEPS.SERVICE) {
      navigateBack({ router, fallbackRoute: "/(user)" });
      return;
    }

    if (step === BOOK_VISIT_STEPS.SPECIALTY) {
      transitionStep(BOOK_VISIT_STEPS.SERVICE);
      return;
    }

    if (step === BOOK_VISIT_STEPS.PROVIDER) {
      transitionStep(BOOK_VISIT_STEPS.SPECIALTY);
      return;
    }

    if (step === BOOK_VISIT_STEPS.DATETIME) {
      transitionStep(
        bookingData.type === "telehealth"
          ? BOOK_VISIT_STEPS.SERVICE
          : BOOK_VISIT_STEPS.PROVIDER,
      );
      return;
    }

    transitionStep(BOOK_VISIT_STEPS.DATETIME);
  }, [bookingData.type, router, step, transitionStep]);

  const handleSelectService = useCallback(
    (type) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      clearQuote();
      if (type === "telehealth") {
        mergeDraft({
          type,
          specialty: "General Practice",
          hospital: {
            id: "telehealth",
            name: "iVisit Telehealth",
            address: "Virtual visit",
            image: null,
          },
          doctor: {
            name: "Dr. On-Call",
            image: null,
          },
          date: null,
          time: null,
        });
        transitionStep(BOOK_VISIT_STEPS.DATETIME);
        return;
      }

      mergeDraft({
        ...createEmptyBookVisitDraft(),
        type,
      });
      transitionStep(BOOK_VISIT_STEPS.SPECIALTY);
    },
    [clearQuote, mergeDraft, transitionStep],
  );

  const handleSelectSpecialty = useCallback(
    (specialty) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSpecialtySearchVisible(false);
      setSearchQuery("");
      clearQuote();
      mergeDraft({
        specialty,
        hospital: null,
        doctor: null,
        date: null,
        time: null,
      });
      transitionStep(BOOK_VISIT_STEPS.PROVIDER);
    },
    [
      clearQuote,
      mergeDraft,
      setSearchQuery,
      setSpecialtySearchVisible,
      transitionStep,
    ],
  );

  const handleProviderSelect = useCallback(
    (hospital) => {
      const providerData = {
        ...hospital,
        doctorName: getRandomDoctorName(),
        bio: `Specialist in ${bookingData.specialty} with over 10 years of experience.`,
        rating: hospital?.rating || 4.9,
        reviews: 124,
        nextAvailable: "Next available today",
      };
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedProvider(providerData);
      setProviderModalVisible(true);
    },
    [bookingData.specialty, setProviderModalVisible, setSelectedProvider],
  );

  const confirmProviderSelection = useCallback(() => {
    if (!selectedProvider) return;
    clearQuote();
    mergeDraft({
      hospital: selectedProvider,
      doctor: {
        name: selectedProvider.doctorName,
        image: selectedProvider?.doctorImage || null,
      },
      date: null,
      time: null,
    });
    setProviderModalVisible(false);
    transitionStep(BOOK_VISIT_STEPS.DATETIME);
  }, [
    clearQuote,
    mergeDraft,
    selectedProvider,
    setProviderModalVisible,
    transitionStep,
  ]);

  const closeProviderModal = useCallback(() => {
    setProviderModalVisible(false);
  }, [setProviderModalVisible]);

  const openSpecialtySearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSpecialtySearchVisible(true);
  }, [setSpecialtySearchVisible]);

  const closeSpecialtySearch = useCallback(() => {
    setSpecialtySearchVisible(false);
    setSearchQuery("");
  }, [setSearchQuery, setSpecialtySearchVisible]);

  const handleSelectDate = useCallback(
    (date) => {
      clearQuote();
      updateDraftField("date", date);
    },
    [clearQuote, updateDraftField],
  );

  const handleSelectTime = useCallback(
    (time) => {
      clearQuote();
      updateDraftField("time", time);
    },
    [clearQuote, updateDraftField],
  );

  const handleConfirmDateTime = useCallback(() => {
    if (!bookingData.date || !bookingData.time) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(BOOK_VISIT_SCREEN_COPY.messages.dateTimeRequired, "error");
      return;
    }
    transitionStep(BOOK_VISIT_STEPS.SUMMARY);
  }, [bookingData.date, bookingData.time, showToast, transitionStep]);

  const refreshQuote = useCallback(() => {
    if (!shouldFetchQuote) return;
    void quoteQuery.refetch();
  }, [quoteQuery, shouldFetchQuote]);

  const handleBookVisit = useCallback(async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const activeQuote = quoteQuery.data || quote;
      const organizationId = getHospitalOrganizationId(bookingData.hospital);

      if (!isDemoBookingFlow && organizationId && activeQuote?.total_cost) {
        const isEligible = await paymentService.checkCashEligibility(
          organizationId,
          activeQuote.total_cost,
        );

        if (!isEligible) {
          throw new Error(BOOK_VISIT_SCREEN_COPY.messages.cashBlocked);
        }
      }

      const fallbackId = uuidv4();
      const payload = {
        id: fallbackId,
        hospital: bookingData.hospital?.name,
        hospitalName: bookingData.hospital?.name,
        hospital_id: bookingData.hospital?.id || null,
        doctor: bookingData.doctor?.name,
        doctorName: bookingData.doctor?.name,
        doctorImage: bookingData.doctor?.image || null,
        specialty: bookingData.specialty,
        date: format(bookingData.date, "yyyy-MM-dd"),
        time: bookingData.time,
        type:
          bookingData.type === "telehealth"
            ? VISIT_TYPES.TELEHEALTH
            : VISIT_TYPES.CONSULTATION,
        status: VISIT_STATUS.UPCOMING,
        image: bookingData.hospital?.image || null,
        hospital_image: bookingData.hospital?.image || null,
        address: bookingData.hospital?.address || "Virtual visit",
        phone: bookingData.hospital?.phone || "+1-555-0123",
        notes:
          bookingData.notes ||
          (bookingData.type === "telehealth"
            ? "Virtual consultation."
            : "In-clinic appointment."),
        estimatedDuration:
          bookingData.type === "telehealth" ? "20 mins" : "45 mins",
        meetingLink:
          bookingData.type === "telehealth"
            ? "https://telehealth.ivisit.com/room/demo"
            : null,
        cost: activeQuote?.total_cost
          ? `$${Number(activeQuote.total_cost).toFixed(2)}`
          : null,
      };

      const createdVisit = await addVisit(payload);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(BOOK_VISIT_SCREEN_COPY.messages.saveSuccess, "success");
      resetBookVisitState(userId);
      setSearchQuery("");
      setSelectedProvider(null);
      setProviderModalVisible(false);
      setSpecialtySearchVisible(false);
      navigateToVisitDetails({
        router,
        visitId: createdVisit?.id || payload.id,
        method: "replace",
      });
    } catch (error) {
      const nextError =
        error instanceof Error
          ? error
          : new Error(BOOK_VISIT_SCREEN_COPY.messages.saveFailed);
      setSubmitError(nextError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(nextError.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    addVisit,
    bookingData.date,
    bookingData.doctor?.image,
    bookingData.doctor?.name,
    bookingData.hospital,
    bookingData.notes,
    bookingData.specialty,
    bookingData.time,
    bookingData.type,
    isDemoBookingFlow,
    quote,
    quoteQuery.data,
    resetBookVisitState,
    router,
    setProviderModalVisible,
    setSearchQuery,
    setSelectedProvider,
    setSpecialtySearchVisible,
    showToast,
    userId,
  ]);

  const discardBooking = useCallback(() => {
    Alert.alert(
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
    refreshQuote();
  }, [refreshQuote]);

  return {
    step,
    bookingData,
    stepMeta,
    progressValue,
    nextStepLabel,
    specialties,
    filteredSpecialties,
    availableProviders,
    dates,
    specialtySearchVisible,
    providerModalVisible,
    searchQuery,
    selectedProvider,
    quote: quoteQuery.data || quote,
    quoteLabel,
    selections,
    isDataLoading: !hydrated,
    isQuoteLoading: shouldFetchQuote && quoteQuery.isFetching && !quote,
    isSubmitting,
    error:
      submitError ||
      quoteQuery.error ||
      (lifecycle.isError && lifecycle.error
        ? new Error(lifecycle.error)
        : null),
    isReady: lifecycle.isReady,
    currentStepLabel: stepMeta.title,
    handleBack,
    handleSelectService,
    handleSelectSpecialty,
    handleProviderSelect,
    confirmProviderSelection,
    closeProviderModal,
    openSpecialtySearch,
    closeSpecialtySearch,
    handleSelectDate,
    handleSelectTime,
    handleConfirmDateTime,
    handleBookVisit,
    discardBooking,
    setSearchQuery,
    refresh,
  };
}

export default useBookVisitScreenModel;
