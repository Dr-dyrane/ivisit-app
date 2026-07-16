import { useCallback, useRef, useMemo, useEffect } from "react";
import * as Location from "expo-location";
import {
  ACTIVE_EMERGENCY_REQUEST_ERROR_CODE,
  ACTIVE_EMERGENCY_REQUEST_STATUSES,
  emergencyRequestsService,
} from "../../services/emergencyRequestsService";
import { DispatchService } from "../../services/dispatchService";
import { EmergencyRequestStatus } from "../../services/emergencyRequestsService";
import { serviceCostService } from "../../services/serviceCostService";
import { triageService } from "../../services/triageService";
import { demoEcosystemService } from "../../services/demoEcosystemService";
import {
  DEFAULT_APP_COORDINATES,
  toPointWkt,
} from "../../constants/locationDefaults";
import { useLocationStore } from "../../stores/locationStore";
import { useEmergencyContactsStore } from "../../stores/emergencyContactsStore";
import { selectReachableEmergencyContacts } from "../../stores/emergencyContactsSelectors";
import { resolveAmbulanceDispatchType } from "../../utils/ambulanceType";

// PULLBACK NOTE: Location fallback priority: stored last-known → DEFAULT_APP_COORDINATES
// OLD: GPS failure in request flow → hardcoded Lagos coords
// NEW: use persisted last-known location first; Lagos only on true cold install
const getRequestLocationFallback = () => {
  const stored = useLocationStore.getState().userLocation;
  const lat = Number(stored?.latitude);
  const lng = Number(stored?.longitude);
  if (stored && Number.isFinite(lat) && Number.isFinite(lng)) return stored;
  return { ...DEFAULT_APP_COORDINATES };
};

const toFiniteNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const getRequestUserCheckin = (request) => {
  if (!request || typeof request !== "object") return null;
  const candidate = request.triageCheckin ?? request.userCheckin ?? null;
  return candidate && typeof candidate === "object" ? candidate : null;
};

const getHospitalCoordinate = (hospital) => {
  const latitude = toFiniteNumber(
    hospital?.latitude ??
      hospital?.lat ??
      hospital?.coords?.latitude ??
      hospital?.coordinates?.latitude ??
      hospital?.location?.latitude,
  );
  const longitude = toFiniteNumber(
    hospital?.longitude ??
      hospital?.lng ??
      hospital?.lon ??
      hospital?.coords?.longitude ??
      hospital?.coordinates?.longitude ??
      hospital?.location?.longitude,
  );
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
};

const normalizeRequestCostSnapshot = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  const baseCost = toFiniteNumber(raw.base_cost ?? raw.baseCost);
  const canonicalTotal = toFiniteNumber(
    raw.total_cost ?? raw.totalCost ?? raw.total_amount,
  );

  let feeAmount = toFiniteNumber(
    raw.feeAmount ?? raw.fee_amount ?? raw.service_fee ?? raw.ivisit_fee_amount,
  );

  if (feeAmount == null && Array.isArray(raw.breakdown)) {
    const breakdownFee = raw.breakdown.reduce((sum, item) => {
      const type = String(item?.type || "").toLowerCase();
      const name = String(item?.name || "").toLowerCase();
      const looksLikeFee = type === "fee" || name.includes("fee");
      if (!looksLikeFee) return sum;
      const itemCost = Number(item?.cost);
      return Number.isFinite(itemCost) ? sum + itemCost : sum;
    }, 0);
    if (breakdownFee > 0) {
      feeAmount = Number(breakdownFee.toFixed(2));
    }
  }

  const total = (() => {
    if (canonicalTotal != null) return canonicalTotal;
    if (baseCost != null) return baseCost;
    return null;
  })();

  if (baseCost == null && total == null) return null;

  return {
    base_cost: baseCost ?? total,
    distance_surcharge: toFiniteNumber(raw.distance_surcharge),
    urgency_surcharge: toFiniteNumber(raw.urgency_surcharge),
    total_cost: total ?? baseCost,
    totalCost: total ?? baseCost,
    breakdown: Array.isArray(raw.breakdown) ? raw.breakdown : undefined,
    feeAmount,
    grossTotal: total ?? baseCost,
    source: "modal_pricing_snapshot",
  };
};

const getRequestedLocation = (request) => {
  if (!request || typeof request !== "object") return null;
  const candidate = request.patientLocation ?? request.location ?? null;
  if (!candidate) return null;

  if (
    Number.isFinite(candidate.latitude) &&
    Number.isFinite(candidate.longitude)
  ) {
    return {
      latitude: Number(candidate.latitude),
      longitude: Number(candidate.longitude),
    };
  }

  if (Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng)) {
    return {
      latitude: Number(candidate.lat),
      longitude: Number(candidate.lng),
    };
  }

  return null;
};

const hasActiveRequestRecord = (record) => {
  const requestKey = record?.requestId ?? record?.id ?? null;
  if (!requestKey) return false;
  const status = String(record?.status ?? "")
    .trim()
    .toLowerCase();
  if (!status) return true;
  return ACTIVE_EMERGENCY_REQUEST_STATUSES.includes(status);
};

const getRequestIdentityKeys = (record) => {
  if (!record || typeof record !== "object") return [];
  return [
    record.requestId,
    record.id,
    record._realId,
    record.displayId,
    record.display_id,
  ]
    .filter((value) => value != null && value !== "")
    .map((value) => String(value));
};

const hasSameRequestIdentity = (a, b) => {
  const aKeys = getRequestIdentityKeys(a);
  const bKeys = getRequestIdentityKeys(b);
  if (aKeys.length === 0 || bKeys.length === 0) return false;
  return aKeys.some((key) => bKeys.includes(key));
};

const hasActivePendingApproval = (
  pendingApproval,
  serviceType,
  candidateRequest = null,
) => {
  if (!pendingApproval || pendingApproval.serviceType !== serviceType)
    return false;
  if (
    candidateRequest &&
    hasSameRequestIdentity(pendingApproval, candidateRequest)
  )
    return false;
  return hasActiveRequestRecord(pendingApproval);
};

const isActiveRequestUniqueConstraintError = (code, raw) => {
  if (code !== "23505") return false;
  return (
    raw.includes("emergency_requests_one_active_bed_per_user_idx") ||
    raw.includes("emergency_requests_one_active_ambulance_per_user_idx") ||
    raw.includes("uniq_active_bed_per_user") ||
    raw.includes("uniq_active_ambulance_per_user")
  );
};

/**
 * 💡 STABILITY NOTE:
 * This hook uses a "Latest Props Ref" pattern (ref-guarded props) to ensure that the returned
 * action handlers (handleRequestInitiated, handleRequestComplete) are perfectly stable (referentially).
 *
 * WHY: This prevents infinite re-render loops in components like EmergencyRequestModal that
 * register effects based on these handlers. Even if the parent passes anonymous functions
 * as props, this hook won't re-create its internal stability-critical callbacks.
 */
export const useRequestFlow = (props) => {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  const inflightByTypeRef = useRef({ ambulance: false, bed: false });

  const blockResult = useCallback((reason, extra) => {
    return { ok: false, reason, ...extra };
  }, []);

  const successResult = useCallback((reason, extra) => {
    return { ok: true, reason, ...extra };
  }, []);

  const getSnapshots = useCallback(() => {
    const { preferences, medicalProfile, emergencyContacts, user } =
      propsRef.current;
    const storeBackedContacts = selectReachableEmergencyContacts(
      useEmergencyContactsStore.getState(),
    );
    const currentEmergencyContacts =
      Array.isArray(storeBackedContacts) && storeBackedContacts.length > 0
        ? storeBackedContacts
        : emergencyContacts;
    const shareMedicalProfile =
      preferences?.privacyShareMedicalProfile === true;
    const shareEmergencyContacts =
      preferences?.privacyShareEmergencyContacts === true;

    const shared = {
      medicalProfile: shareMedicalProfile ? medicalProfile : null,
      emergencyContacts: shareEmergencyContacts
        ? currentEmergencyContacts
        : null,
    };

    const patient = {
      fullName: user?.fullName ?? null,
      phone: user?.phone ?? null,
      email: user?.email ?? null,
      username: user?.username ?? null,
    };

    return { patient, shared };
  }, []);

  const canStartRequest = useCallback(
    (serviceType, candidateRequest = null) => {
      const { activeAmbulanceTrip, activeBedBooking, pendingApproval } =
        propsRef.current;
      if (
        hasActivePendingApproval(pendingApproval, serviceType, candidateRequest)
      )
        return false;
      if (serviceType === "ambulance") {
        return !hasActiveRequestRecord(activeAmbulanceTrip);
      }
      if (serviceType === "bed") {
        return !hasActiveRequestRecord(activeBedBooking);
      }
      return false;
    },
    [],
  );

  const handleRequestInitiated = useCallback(
    async (request) => {
      const {
        hospitals,
        requestHospitalId,
        selectedHospital,
        createRequest,
        selectedSpecialty,
        preferences,
        effectiveDemoModeEnabled,
      } = propsRef.current;

      if (
        request?.serviceType !== "ambulance" &&
        request?.serviceType !== "bed"
      ) {
        return blockResult("INVALID_SERVICE_TYPE", {
          serviceType: request?.serviceType ?? null,
        });
      }

      if (!canStartRequest(request.serviceType)) {
        return blockResult("ALREADY_ACTIVE", {
          serviceType: request.serviceType,
        });
      }

      if (inflightByTypeRef.current[request.serviceType] === true) {
        return blockResult("IN_FLIGHT", { serviceType: request.serviceType });
      }

      let hospitalId =
        request?.hospitalId ??
        requestHospitalId ??
        selectedHospital?.id ??
        null;

      // 🤖 AUTO-DISPATCH: Select best hospital if none provided
      if (!hospitalId && hospitals && hospitals.length > 0) {
        const requestedLocation = getRequestedLocation(request);
        if (requestedLocation) {
          const bestHospital = DispatchService.selectBestHospital(
            hospitals,
            requestedLocation,
          );
          if (bestHospital) {
            hospitalId = bestHospital.id;
            console.log(
              "[useRequestFlow] Auto-dispatch selected hospital:",
              bestHospital.name,
            );
          }
        }

        if (!hospitalId) {
          try {
            // Get user location for dispatch calculation
            const currentLocation = await Location.getCurrentPositionAsync({});
            const userLocation = {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            };

            const bestHospital = DispatchService.selectBestHospital(
              hospitals,
              userLocation,
            );
            if (bestHospital) {
              hospitalId = bestHospital.id;
              console.log(
                "[useRequestFlow] Auto-dispatch selected hospital:",
                bestHospital.name,
              );
            }
          } catch (locationError) {
            console.warn(
              "[useRequestFlow] Auto-dispatch failed, using fallback:",
              locationError,
            );
            // Fallback to first available hospital
            hospitalId = hospitals[0]?.id;
          }
        }
      }

      if (!hospitalId) {
        return blockResult("MISSING_HOSPITAL", {
          serviceType: request.serviceType,
        });
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const visitId = request?.requestId
        ? String(request.requestId)
        : `local_${Date.now()}`;
      const hospital = hospitals?.find((h) => h?.id === hospitalId) ?? null;
      const date = nowIso.slice(0, 10);
      const time = now.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      const { patient, shared } = getSnapshots();
      const userCheckin = getRequestUserCheckin(request);
      const patientSnapshot = userCheckin
        ? { ...patient, triage: userCheckin }
        : patient;

      inflightByTypeRef.current[request.serviceType] = true;
      try {
        let liveUserLocation = getRequestedLocation(request);
        let patientLocation = liveUserLocation
          ? toPointWkt(liveUserLocation)
          : null;
        if (!liveUserLocation) {
          try {
            const currentLocation = await Location.getCurrentPositionAsync({});
            liveUserLocation = {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            };
            patientLocation = `POINT(${currentLocation.coords.longitude} ${currentLocation.coords.latitude})`;
          } catch (locationError) {
            console.warn(
              "[useRequestFlow] Could not get user location:",
              locationError,
            );
            // PULLBACK NOTE: OLD: DEFAULT_APP_COORDINATES — NEW: stored last-known → DEFAULT_APP_COORDINATES
            const fallback = getRequestLocationFallback();
            liveUserLocation = fallback;
            patientLocation = toPointWkt(fallback);
          }
        }

        const hospitalCoords =
          hospital?.coordinates &&
          Number.isFinite(hospital.coordinates.latitude) &&
          Number.isFinite(hospital.coordinates.longitude)
            ? hospital.coordinates
            : Number.isFinite(hospital?.latitude) &&
                Number.isFinite(hospital?.longitude)
              ? { latitude: hospital.latitude, longitude: hospital.longitude }
              : null;

        let computedDistanceKm = 0;
        if (liveUserLocation && hospitalCoords) {
          try {
            // Ambulance origin is assumed to be the selected hospital.
            computedDistanceKm =
              DispatchService.calculateDistance(
                liveUserLocation,
                hospitalCoords,
              ) || 0;
          } catch (e) {
            console.warn("[useRequestFlow] Distance calculation failed:", e);
          }
        }

        const computedEtaSeconds =
          Number.isFinite(computedDistanceKm) && computedDistanceKm > 0
            ? Math.max(120, Math.round(computedDistanceKm * 60 * 3)) // ~3 min/km, min 2 mins
            : null;
        const computedEtaLabel =
          computedEtaSeconds == null
            ? null
            : computedEtaSeconds < 60
              ? `${computedEtaSeconds}s`
              : computedEtaSeconds % 60 === 0
                ? `${Math.floor(computedEtaSeconds / 60)} min`
                : `${Math.floor(computedEtaSeconds / 60)}m ${computedEtaSeconds % 60}s`;

        const derivedEstimatedArrival =
          request?.estimatedArrival ??
          (request?.serviceType === "ambulance"
            ? hospital?.eta || computedEtaLabel
            : hospital?.waitTime || computedEtaLabel) ??
          null;

        // Calculate cost for the emergency request.
        // Prefer the modal-calculated pricing snapshot so bed booking uses the selected room price.
        let costData = normalizeRequestCostSnapshot(request?.pricingSnapshot);
        try {
          if (!costData) {
            costData = await serviceCostService.calculateEmergencyCost(
              request.serviceType,
              {
                distance: computedDistanceKm,
                hospitalId,
                ambulanceType:
                  request.serviceType === "ambulance"
                    ? resolveAmbulanceDispatchType(request?.ambulanceType)
                    : null,
                isUrgent: request?.isUrgent || false,
                requireServerQuote: request.serviceType === "ambulance",
              },
            );
          }
        } catch (costError) {
          console.warn("[useRequestFlow] Cost calculation failed:", costError);
          // Continue without cost - payment will be handled separately
        }

        // Determine payment method for atomic RPC.
        // Demo hospitals now use the real cash-approval path so the backend still creates
        // actual emergency, payment, and visit records before dispatch is released.
        const requestedPaymentMethodId =
          request?.paymentMethod?.id ||
          (request?.paymentMethod?.is_cash ? "cash_payment" : null);
        const isDemoCashApprovalFlow =
          demoEcosystemService.shouldSimulatePayments({
            hospital,
            demoModeEnabled:
              effectiveDemoModeEnabled ??
              preferences?.demoModeEnabled !== false,
          });
        const paymentMethodId =
          requestedPaymentMethodId ||
          (isDemoCashApprovalFlow ? "cash_payment" : null);
        const isCashPayment =
          typeof paymentMethodId === "string" &&
          paymentMethodId.toLowerCase().includes("cash");
        const isWalletPayment =
          request?.paymentMethod?.is_wallet === true ||
          (typeof paymentMethodId === "string" &&
            paymentMethodId.toLowerCase().includes("wallet"));
        const isCardPayment = !isCashPayment && !isWalletPayment;
        const awaitsPaymentConfirmation = isCardPayment;

        console.log("[useRequestFlow] 📋 Creating Emergency Request:", {
          displayId: visitId,
          hospitalId,
          serviceType: request.serviceType,
          paymentMethod: paymentMethodId,
          requestedPaymentMethod: requestedPaymentMethodId,
          demoCashApprovalFlow: isDemoCashApprovalFlow,
          isCashPayment,
          isWalletPayment,
          isCardPayment,
          awaitsPaymentConfirmation,
          totalCost: costData?.total_cost || costData?.totalCost,
          baseCost: costData?.base_cost,
          feeAmount: costData?.feeAmount ?? null,
          grossTotal: costData?.grossTotal ?? null,
          costSource: costData?.source || "serviceCostService",
          hasCostData: !!costData,
        });

        const createdRequest = await createRequest({
          requestId: visitId, // Display ID (AMB-xxx)
          serviceType: request.serviceType,
          hospitalId,
          hospitalName: request?.hospitalName ?? hospital?.name ?? null,
          specialty: request?.specialty ?? selectedSpecialty ?? null,
          ambulanceType: request?.ambulanceType ?? null,
          ambulanceId: request?.ambulanceId ?? null,
          bedNumber: request?.bedNumber ?? null,
          bedType: request?.bedType ?? null,
          bedCount: request?.bedCount ?? null,
          distanceKm: request?.distanceKm ?? computedDistanceKm,
          estimatedArrival: derivedEstimatedArrival,
          status: EmergencyRequestStatus.IN_PROGRESS,
          patient: patientSnapshot,
          shared,
          patientLocation,
          // Cost and Payment information (used by atomic RPC)
          ...(costData && {
            base_cost: costData.base_cost,
            distance_surcharge: costData.distance_surcharge,
            urgency_surcharge: costData.urgency_surcharge,
            total_cost: costData.total_cost ?? costData.totalCost,
            totalCost: costData.totalCost ?? costData.total_cost,
            cost_breakdown: costData.breakdown,
            feeAmount: costData.feeAmount,
            payment_status: "pending",
          }),
          // Payment method — triggers atomic RPC path in emergencyRequestsService
          payment_method_id: paymentMethodId,
          paymentMethodId: paymentMethodId,
          deferDispatchUntilPayment: awaitsPaymentConfirmation,
        });

        // 🔑 CRITICAL: Use the REAL UUID from the DB, not the display ID
        const realId = createdRequest?.id || visitId;
        const displayId = createdRequest?.requestId || visitId;
        const backendRequiresApproval =
          createdRequest?.requiresApproval || false;
        const requiresApproval = isCashPayment && backendRequiresApproval;
        const backendAwaitsPaymentConfirmation =
          isCardPayment || createdRequest?.awaitsPaymentConfirmation === true;
        const requiresWalletSettlement =
          isWalletPayment || createdRequest?.requiresWalletSettlement === true;
        const normalizedPaymentStatus =
          createdRequest?.paymentStatus ||
          (requiresApproval ||
          backendAwaitsPaymentConfirmation ||
          requiresWalletSettlement
            ? "pending"
            : "completed");
        const demoAutoApproveEligible =
          isDemoCashApprovalFlow && isCashPayment && requiresApproval;

        console.log("[useRequestFlow] ✅ Request Created:", {
          realId,
          displayId,
          paymentStatus: normalizedPaymentStatus,
          requiresApproval,
          backendRequiresApproval,
          backendAwaitsPaymentConfirmation,
          demoAutoApproveEligible,
          isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(realId),
        });

        // 🏥 Visit is NOW created by backend trigger (sync_emergency_to_visit)
        // No frontend addVisit() needed — eliminates RLS and UUID errors.

        // 💰 CASH APPROVAL: Notify org_admin if payment needs approval
        // Non-blocking AI triage lane: collect + persist in parallel without delaying dispatch.
        const triagePersist = propsRef.current?.updateTriage;
        if (typeof triagePersist === "function") {
          void triageService
            .collectAndPersist({
              requestId: realId,
              stage: "post_request",
              request: {
                ...request,
                requestId: displayId,
                hospitalId,
                hospitalName: request?.hospitalName ?? hospital?.name ?? null,
              },
              hospitals,
              selectedHospitalId: hospitalId,
              medicalProfile: propsRef.current?.medicalProfile ?? null,
              emergencyContacts: propsRef.current?.emergencyContacts ?? [],
              userCheckin,
              currentRoute: null,
              persist: triagePersist,
            })
            .then((snapshot) => {
              const severityBand = snapshot?.severity?.band ?? "unknown";
              const careType = snapshot?.careType?.type ?? "unknown";
              console.log(
                `[useRequestFlow] triage captured (post_request): requestId=${realId} severity=${severityBand} careType=${careType}`,
              );
            })
            .catch((triageError) => {
              console.warn(
                "[useRequestFlow] triage post-request capture failed (non-blocking):",
                triageError,
              );
            });

          // Cash approvals can wait in pending_approval; refresh triage during that wait window.
          if (requiresApproval) {
            setTimeout(() => {
              void triageService
                .collectAndPersist({
                  requestId: realId,
                  stage: "waiting_approval",
                  request: {
                    ...request,
                    requestId: displayId,
                    hospitalId,
                    hospitalName:
                      request?.hospitalName ?? hospital?.name ?? null,
                  },
                  hospitals,
                  selectedHospitalId: hospitalId,
                  medicalProfile: propsRef.current?.medicalProfile ?? null,
                  emergencyContacts: propsRef.current?.emergencyContacts ?? [],
                  userCheckin,
                  currentRoute: null,
                  persist: triagePersist,
                })
                .then((snapshot) => {
                  const severityBand = snapshot?.severity?.band ?? "unknown";
                  const careType = snapshot?.careType?.type ?? "unknown";
                  console.log(
                    `[useRequestFlow] triage captured (waiting_approval): requestId=${realId} severity=${severityBand} careType=${careType}`,
                  );
                })
                .catch((triageError) => {
                  console.warn(
                    "[useRequestFlow] triage waiting-approval capture failed (non-blocking):",
                    triageError,
                  );
                });
            }, 2500);
          }
        }

        return {
          ok: true,
          requestId: realId,
          displayId,
          serviceType: request.serviceType,
          estimatedArrival: derivedEstimatedArrival,
          etaSeconds: computedEtaSeconds,
          requiresApproval,
          awaitsPaymentConfirmation: backendAwaitsPaymentConfirmation,
          requiresWalletSettlement,
          demoAutoApproveEligible,
          paymentId: createdRequest?.paymentId || null,
          paymentStatus: normalizedPaymentStatus,
          status: createdRequest?.status || null,
          canonicalTotal: createdRequest?.canonicalTotal ?? null,
          pricing: createdRequest?.pricing ?? null,
          pricingSource: createdRequest?.pricingSource ?? null,
          pricingIsFallback: createdRequest?.pricingIsFallback === true,
          currency: createdRequest?.currency || costData?.currency || "USD",
        };
      } catch (err) {
        inflightByTypeRef.current[request.serviceType] = false;
        const code = err?.code ?? null;
        const message = typeof err?.message === "string" ? err.message : "";
        const details = typeof err?.details === "string" ? err.details : "";
        const hint = typeof err?.hint === "string" ? err.hint : "";
        const raw = `${message} ${details} ${hint}`.toLowerCase();
        if (code === ACTIVE_EMERGENCY_REQUEST_ERROR_CODE) {
          return blockResult("ALREADY_ACTIVE", {
            serviceType: err?.serviceType || request.serviceType,
            activeRequest: err?.activeRequest ?? null,
          });
        }
        if (isActiveRequestUniqueConstraintError(code, raw)) {
          return blockResult("CONCURRENCY_DB", {
            serviceType: request.serviceType,
          });
        }
        throw err;
      }
    },
    [blockResult, canStartRequest, getSnapshots],
  );

  const handleRequestComplete = useCallback(
    async (request) => {
      const {
        hospitals,
        requestHospitalId,
        selectedHospital,
        startAmbulanceTrip,
        startBedBooking,
        clearSelectedHospital,
        onRequestComplete,
        selectedSpecialty,
        currentRoute,
      } = propsRef.current;

      if (
        request?.serviceType !== "ambulance" &&
        request?.serviceType !== "bed"
      ) {
        return blockResult("INVALID_SERVICE_TYPE", {
          serviceType: request?.serviceType ?? null,
        });
      }

      if (!canStartRequest(request.serviceType, request)) {
        // PULLBACK NOTE: PT-A diagnostic — ALREADY_ACTIVE in handleRequestComplete is expected when server-sync beats the auto-approval timeout (EC-3 verified clean)
        console.info(
          "[PT-A][RequestFlow] handleRequestComplete blocked: ALREADY_ACTIVE (trip may be server-synced) | serviceType=",
          request.serviceType,
        );
        return blockResult("ALREADY_ACTIVE", {
          serviceType: request.serviceType,
        });
      }

      const hospitalId =
        request?.hospitalId ??
        requestHospitalId ??
        selectedHospital?.id ??
        null;
      if (!hospitalId) {
        return blockResult("MISSING_HOSPITAL", {
          serviceType: request.serviceType,
        });
      }

      const canonicalRequestId =
        request?.id ??
        request?._realId ??
        (request?.request?.id ?? null);
      const displayRequestId =
        request?.displayId ??
        request?.display_id ??
        request?.request?.display_id ??
        null;
      const mutationRequestId = canonicalRequestId
        ? String(canonicalRequestId)
        : request?.requestId
          ? String(request.requestId)
          : `local_${Date.now()}`;
      const runtimeRequestId = mutationRequestId;
      const hospital = hospitals?.find((h) => h?.id === hospitalId) ?? null;
      const backendStatus = String(
        request?.status ?? request?.request?.status ?? "",
      ).toLowerCase();
      const runtimeStatus = backendStatus || EmergencyRequestStatus.IN_PROGRESS;

      if (request.serviceType === "ambulance") {
        const routeEtaSeconds =
          request?.etaSeconds ??
          currentRoute?.durationSec ??
          currentRoute?.duration ??
          null;
        // PULLBACK NOTE: PT-G — null guard on fallbackEtaLabel: show 'En route' instead of blank
        // when no etaSeconds or estimatedArrival is available on dispatch
        const fallbackEtaLabel =
          request?.estimatedArrival ??
          (Number.isFinite(routeEtaSeconds)
            ? routeEtaSeconds < 60
              ? `${Math.max(1, Math.round(routeEtaSeconds))}s`
              : `${Math.max(1, Math.round(routeEtaSeconds / 60))} min`
            : "En route");
        startAmbulanceTrip({
          id: canonicalRequestId ? String(canonicalRequestId) : null,
          hospitalId,
          requestId: runtimeRequestId,
          displayId: displayRequestId ? String(displayRequestId) : runtimeRequestId,
          status: runtimeStatus,
          ambulanceId: request?.ambulanceId ?? null,
          ambulanceType: request?.ambulanceType ?? null,
          assignedAmbulance: request?.assignedAmbulance ?? null,
          currentResponderLocation: request?.currentResponderLocation ?? null,
          currentResponderHeading: request?.currentResponderHeading ?? null,
          responderTelemetryAt: request?.responderLocationReceivedAt ?? null,
          responderTelemetryLeaseExpiresAt:
            request?.responderTelemetryLeaseExpiresAt ?? null,
          patientAcknowledgedArrivalAt:
            request?.patientAcknowledgedArrivalAt ?? null,
          hospitalCoordinate:
            request?.hospitalCoordinate ?? getHospitalCoordinate(hospital),
          patientLocation: request?.patientLocation ?? null,
          estimatedArrival: fallbackEtaLabel,
          etaSeconds: routeEtaSeconds,
          hospitalName: request?.hospitalName ?? hospital?.name ?? null,
          route: currentRoute?.coordinates ?? null,
        });
      }

      if (request.serviceType === "bed") {
        const routeEtaSeconds =
          request?.etaSeconds ??
          currentRoute?.durationSec ??
          currentRoute?.duration ??
          null;
        startBedBooking({
          id: canonicalRequestId ? String(canonicalRequestId) : null,
          hospitalId,
          requestId: runtimeRequestId,
          displayId: displayRequestId ? String(displayRequestId) : runtimeRequestId,
          status: runtimeStatus,
          hospitalName: request?.hospitalName ?? hospital?.name ?? null,
          specialty: request?.specialty ?? null,
          bedNumber: request?.bedNumber ?? null,
          bedType: request?.bedType ?? null,
          bedCount: request?.bedCount ?? null,
          estimatedWait: request?.estimatedArrival ?? null,
          etaSeconds: routeEtaSeconds,
        });
      }

      // Non-blocking routing-stage triage refresh (parallel to active trip/booking lifecycle).
      const triagePersist = propsRef.current?.updateTriage;
      if (typeof triagePersist === "function") {
        const userCheckin = getRequestUserCheckin(request);
        void triageService
          .collectAndPersist({
            requestId: mutationRequestId,
            stage: "routing",
            request: {
              ...request,
              requestId: runtimeRequestId,
              hospitalId,
              hospitalName: request?.hospitalName ?? hospital?.name ?? null,
            },
            hospitals,
            selectedHospitalId: hospitalId,
            medicalProfile: propsRef.current?.medicalProfile ?? null,
            emergencyContacts: propsRef.current?.emergencyContacts ?? [],
            userCheckin,
            currentRoute,
            persist: triagePersist,
          })
          .then((snapshot) => {
            const severityBand = snapshot?.severity?.band ?? "unknown";
            const careType = snapshot?.careType?.type ?? "unknown";
            console.log(
              `[useRequestFlow] triage captured (routing): requestId=${mutationRequestId} severity=${severityBand} careType=${careType}`,
            );
          })
          .catch((triageError) => {
            console.warn(
              "[useRequestFlow] triage routing capture failed (non-blocking):",
              triageError,
            );
          });
      }

      inflightByTypeRef.current[request.serviceType] = false;
      clearSelectedHospital();
      onRequestComplete?.();
      return {
        ok: true,
        requestId: mutationRequestId,
        displayId: displayRequestId ?? runtimeRequestId,
        serviceType: request.serviceType,
      };
    },
    [blockResult, canStartRequest],
  );

  // 🚨 QUICK EMERGENCY: Auto-dispatch without hospital selection

  return useMemo(
    () => ({
      handleRequestInitiated,
      handleRequestComplete,
    }),
    [handleRequestInitiated, handleRequestComplete],
  );
};
