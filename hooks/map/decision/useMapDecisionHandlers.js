// PULLBACK NOTE: MapScreen decomposition Pass 3 — decision + commit confirm handlers extracted
import { useCallback } from "react";
import {
  sanitizeCommitEmail,
  sanitizeCommitPhone,
  isCommitPhoneValid,
} from "../../../components/map/views/commitDetails/mapCommitDetails.helpers";
import { buildBedDecisionSourcePayload } from "../../../components/map/core/mapSheetFlowPayloads";
import { MAP_SHEET_PHASES, MAP_SHEET_SNAP_STATES } from "../../../components/map/MapSheetOrchestrator";
import { emergencyRequestsService } from "../../../services/emergencyRequestsService";

/**
 * useMapDecisionHandlers
 *
 * Owns all confirm/decision routing callbacks that bridge sheet phases
 * (AMBULANCE_DECISION → BED_DECISION → COMMIT_DETAILS → COMMIT_TRIAGE → COMMIT_PAYMENT)
 * and the tracking-origin variants (add bed/ambulance from tracking, triage from tracking).
 *
 * Also owns handleUseHospital — the hospital detail primary CTA.
 *
 * @param {Object} params
 * @param {Object}   params.user
 * @param {string}   params.selectedCare
 * @param {Object}   params.sheetPayload
 * @param {string}   params.sheetSnapState
 * @param {Object}   params.featuredHospital
 * @param {Object}   params.nearestHospital
 * @param {Object}   params.mapFocusedHospital
 * @param {string}   params.renderedSnapState
 * @param {Object}   params.activeMapRequest
 * @param {Object}   params.activeBedBooking
 * @param {Function} params.openAmbulanceDecision
 * @param {Function} params.openBedDecision
 * @param {Function} params.openCommitDetails
 * @param {Function} params.openCommitTriage
 * @param {Function} params.openCommitPayment
 * @param {Function} params.closeCommitTriage
 */
export function useMapDecisionHandlers({
  user,
  selectedCare,
  sheetPayload,
  sheetSnapState,
  featuredHospital,
  nearestHospital,
  mapFocusedHospital,
  renderedSnapState,
  activeMapRequest,
  activeBedBooking,
  openAmbulanceDecision,
  openBedDecision,
  openCommitDetails,
  openCommitTriage,
  openCommitPayment,
  closeCommitTriage,
}) {
  const handleUseHospital = useCallback(
    (hospital) => {
      const hospitalId =
        hospital?.id || featuredHospital?.id || nearestHospital?.id;
      if (!hospitalId) return;

      if (selectedCare === "both") {
        openAmbulanceDecision(hospital || null);
        return;
      }

      if (selectedCare === "bed") {
        openBedDecision(hospital || null, "bed");
        return;
      }

      openAmbulanceDecision(hospital || null);
    },
    [
      featuredHospital?.id,
      nearestHospital?.id,
      openAmbulanceDecision,
      openBedDecision,
      selectedCare,
    ],
  );

  const handleConfirmAmbulanceDecision = useCallback(
    (hospital, transport) => {
      const hospitalId =
        hospital?.id || featuredHospital?.id || nearestHospital?.id;
      if (!hospitalId) return;
      const isTrackingCompanionTransport =
        sheetPayload?.sourcePhase === MAP_SHEET_PHASES.TRACKING &&
        Boolean(activeBedBooking?.requestId);

      if (selectedCare === "both" && !isTrackingCompanionTransport) {
        openBedDecision(hospital || null, "both", {
          savedTransport: transport
            ? {
                id: transport.id || null,
                hospitalId,
                title: transport.title || transport.service_name || "Transport",
                priceText: transport.priceText || null,
                metaText: transport.metaText || null,
                serviceType:
                  transport.service_type || transport.serviceType || null,
                tierKey:
                  transport.tierKey || transport.visualProfile?.key || null,
              }
            : null,
        });
        return;
      }

      const resolvedEmail = sanitizeCommitEmail(user?.email);
      const resolvedPhone = sanitizeCommitPhone(user?.phone);
      if (resolvedEmail && isCommitPhoneValid(resolvedPhone)) {
        openCommitPayment(hospital || null, transport || null, {
          draft: {
            email: resolvedEmail,
            phone: resolvedPhone,
          },
          sourcePhase:
            sheetPayload?.sourcePhase || MAP_SHEET_PHASES.AMBULANCE_DECISION,
          sourceSnapState:
            sheetPayload?.sourceSnapState || sheetSnapState,
          sourcePayload: sheetPayload?.sourcePayload || null,
        });
        return;
      }

      openCommitDetails(hospital || null, transport || null);
    },
    [
      featuredHospital?.id,
      nearestHospital?.id,
      activeBedBooking?.requestId,
      openCommitDetails,
      openBedDecision,
      openCommitPayment,
      selectedCare,
      sheetPayload?.sourcePayload,
      sheetPayload?.sourcePhase,
      sheetPayload?.sourceSnapState,
      sheetSnapState,
      user?.email,
      user?.phone,
    ],
  );

  const handleConfirmCommitDetails = useCallback(
    (hospital, transport, draft) => {
      const hospitalId =
        hospital?.id || featuredHospital?.id || nearestHospital?.id;
      if (!hospitalId) return;

      openCommitPayment(hospital || null, transport || null, {
        draft: draft || null,
        careIntent: draft?.careIntent || sheetPayload?.careIntent || null,
        roomId: draft?.roomId || sheetPayload?.roomId || null,
        room: sheetPayload?.room || null,
        sourcePhase: sheetPayload?.sourcePhase || MAP_SHEET_PHASES.COMMIT_DETAILS,
        sourcePayload: sheetPayload?.sourcePayload || null,
      });
    },
    [
      featuredHospital?.id,
      nearestHospital?.id,
      openCommitPayment,
      sheetPayload?.careIntent,
      sheetPayload?.room,
      sheetPayload?.roomId,
      sheetPayload?.sourcePayload,
      sheetPayload?.sourcePhase,
    ],
  );

  const handleConfirmBedDecision = useCallback(
    (hospital, room, _transport, careIntent = "bed") => {
      const hospitalId =
        hospital?.id || featuredHospital?.id || nearestHospital?.id;
      if (!hospitalId) return;

      const resolvedTransport =
        _transport ||
        (careIntent === "both" ? sheetPayload?.savedTransport || null : null);

      const bedDecisionSourcePayload = {
        ...buildBedDecisionSourcePayload({
          careIntent,
          savedTransport:
            careIntent === "both" ? sheetPayload?.savedTransport || null : null,
          payload: sheetPayload,
        }),
      };

      const resolvedEmail = sanitizeCommitEmail(user?.email);
      const resolvedPhone = sanitizeCommitPhone(user?.phone);

      if (resolvedEmail && isCommitPhoneValid(resolvedPhone)) {
        openCommitPayment(hospital || null, resolvedTransport, {
          draft: { email: resolvedEmail, phone: resolvedPhone },
          careIntent,
          roomId: room?.id || null,
          room: room || null,
          sourcePhase: MAP_SHEET_PHASES.BED_DECISION,
          sourcePayload: bedDecisionSourcePayload,
        });
        return;
      }

      openCommitDetails(hospital || null, resolvedTransport, {
        careIntent,
        roomId: room?.id || null,
        room: room || null,
        sourcePhase: MAP_SHEET_PHASES.BED_DECISION,
        sourcePayload: bedDecisionSourcePayload,
      });
    },
    [
      featuredHospital?.id,
      nearestHospital?.id,
      openCommitDetails,
      openCommitPayment,
      sheetPayload?.savedTransport,
      user?.email,
      user?.phone,
    ],
  );

  const handleConfirmCommitTriage = useCallback(
    async (hospital, transport, triagePayload) => {
      const hospitalId =
        hospital?.id || featuredHospital?.id || nearestHospital?.id;
      if (!hospitalId) return;
      const sourcePhase =
        triagePayload?.sourcePhase || sheetPayload?.sourcePhase || null;
      if (sourcePhase === MAP_SHEET_PHASES.TRACKING) {
        const trackingRequestId =
          triagePayload?.requestId ||
          sheetPayload?.requestId ||
          activeMapRequest?.requestId ||
          null;
        if (trackingRequestId && triagePayload?.triageSnapshot) {
          await emergencyRequestsService.updateTriage(
            trackingRequestId,
            triagePayload.triageSnapshot,
            { reason: "tracking_info_update" },
          );
        }
        closeCommitTriage();
        return;
      }

      const restoredTriagePayload = {
        ...sheetPayload,
        ...(triagePayload && typeof triagePayload === "object"
          ? triagePayload
          : {}),
        hospital: hospital || sheetPayload?.hospital || null,
        transport: transport || sheetPayload?.transport || null,
      };

      openCommitPayment(hospital || null, transport || null, {
        draft: triagePayload?.draft || sheetPayload?.draft || null,
        triageDraft: triagePayload?.triageDraft || null,
        triageSnapshot: triagePayload?.triageSnapshot || null,
        careIntent: triagePayload?.careIntent || sheetPayload?.careIntent || null,
        roomId: triagePayload?.roomId || sheetPayload?.roomId || null,
        room: triagePayload?.room || sheetPayload?.room || null,
        sourcePhase: MAP_SHEET_PHASES.COMMIT_TRIAGE,
        sourceSnapState: MAP_SHEET_SNAP_STATES.EXPANDED,
        sourcePayload: restoredTriagePayload,
      });
    },
    [
      activeMapRequest?.requestId,
      closeCommitTriage,
      featuredHospital?.id,
      nearestHospital?.id,
      openCommitPayment,
      sheetPayload,
    ],
  );

  const handleOpenCommitTriageFromTracking = useCallback(
    (trackingPayload = {}) => {
      const targetHospital =
        mapFocusedHospital || featuredHospital || nearestHospital || null;
      if (!targetHospital?.id) return;
      const trackingRequestId =
        trackingPayload?.requestId ||
        activeMapRequest?.requestId ||
        null;
      openCommitTriage(targetHospital, trackingPayload?.transport || null, {
        ...trackingPayload,
        requestId: trackingRequestId,
        sourcePhase: MAP_SHEET_PHASES.TRACKING,
        sourceSnapState: renderedSnapState,
        sourcePayload: {
          hospital: targetHospital,
        },
      });
    },
    [
      activeMapRequest?.requestId,
      featuredHospital,
      mapFocusedHospital,
      nearestHospital,
      openCommitTriage,
      renderedSnapState,
    ],
  );

  const handleAddBedFromTracking = useCallback(() => {
    const targetHospital =
      mapFocusedHospital || featuredHospital || nearestHospital || null;
    if (!targetHospital?.id) return;

    openBedDecision(targetHospital, "bed", {
      sourcePhase: MAP_SHEET_PHASES.TRACKING,
      sourceSnapState: renderedSnapState,
      sourcePayload: {
        hospital: targetHospital,
      },
    });
  }, [
    featuredHospital,
    mapFocusedHospital,
    nearestHospital,
    openBedDecision,
    renderedSnapState,
  ]);

  const handleAddAmbulanceFromTracking = useCallback(() => {
    const targetHospital =
      mapFocusedHospital || featuredHospital || nearestHospital || null;
    if (!targetHospital?.id) return;

    openAmbulanceDecision(targetHospital, {
      sourcePhase: MAP_SHEET_PHASES.TRACKING,
      sourceSnapState: renderedSnapState,
      sourcePayload: {
        hospital: targetHospital,
      },
    });
  }, [
    featuredHospital,
    mapFocusedHospital,
    nearestHospital,
    openAmbulanceDecision,
    renderedSnapState,
  ]);

  return {
    handleUseHospital,
    handleConfirmAmbulanceDecision,
    handleConfirmCommitDetails,
    handleConfirmBedDecision,
    handleConfirmCommitTriage,
    handleOpenCommitTriageFromTracking,
    handleAddBedFromTracking,
    handleAddAmbulanceFromTracking,
  };
}
