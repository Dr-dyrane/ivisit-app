import {
  MAP_SHEET_PHASES,
  MAP_SHEET_SNAP_STATES,
} from "../../../components/map/core/MapSheetOrchestrator";

function asPayloadObject(payload) {
  return payload && typeof payload === "object" ? payload : null;
}

function findHospitalById(hospitals, hospitalId) {
  if (!hospitalId || !Array.isArray(hospitals)) return null;
  return hospitals.find((item) => item?.id === hospitalId) || null;
}

export function buildSheetView({ phase, snapState, payload = null }) {
  return {
    phase,
    snapState,
    payload,
  };
}

export function buildExploreIntentSheetView(defaultSnapState) {
  return buildSheetView({
    phase: MAP_SHEET_PHASES.EXPLORE_INTENT,
    snapState: defaultSnapState,
    payload: null,
  });
}

export function buildSearchSheetView() {
  return buildSheetView({
    phase: MAP_SHEET_PHASES.SEARCH,
    snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
    payload: null,
  });
}

export function buildHospitalListSheetView({
  sourcePhase = null,
  sourceSnapState = null,
  sourcePayload = null,
} = {}) {
  return buildSheetView({
    phase: MAP_SHEET_PHASES.HOSPITAL_LIST,
    snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
    payload: sourcePhase
      ? {
          sourcePhase,
          sourceSnapState,
          sourcePayload,
        }
      : null,
  });
}

export function buildTrackingSheetView({ hospital, usesSidebarLayout }) {
  return buildSheetView({
    phase: MAP_SHEET_PHASES.TRACKING,
    snapState: usesSidebarLayout
      ? MAP_SHEET_SNAP_STATES.EXPANDED
      : MAP_SHEET_SNAP_STATES.HALF,
    payload: {
      hospital: hospital || null,
    },
  });
}

export function buildHospitalDetailSheetView({ usesSidebarLayout }) {
  return buildSheetView({
    phase: MAP_SHEET_PHASES.HOSPITAL_DETAIL,
    snapState: usesSidebarLayout
      ? MAP_SHEET_SNAP_STATES.EXPANDED
      : MAP_SHEET_SNAP_STATES.HALF,
    payload: null,
  });
}

export function buildVisitDetailSheetView({ usesSidebarLayout, historyItem = null }) {
  return buildSheetView({
    phase: MAP_SHEET_PHASES.VISIT_DETAIL,
    snapState: usesSidebarLayout
      ? MAP_SHEET_SNAP_STATES.EXPANDED
      : MAP_SHEET_SNAP_STATES.HALF,
    payload: {
      historyItem,
    },
  });
}

export function resolveMapFlowHospital({
  preferredHospital = null,
  preferredHospitalId = null,
  hospitals = [],
  fallbacks = [],
} = {}) {
  return (
    preferredHospital ||
    findHospitalById(hospitals, preferredHospitalId) ||
    (Array.isArray(fallbacks) ? fallbacks.find(Boolean) : null) ||
    null
  );
}

export function buildAmbulanceDecisionSheetView({
  defaultSnapState,
  payload = null,
} = {}) {
  return buildSheetView({
    phase: MAP_SHEET_PHASES.AMBULANCE_DECISION,
    snapState: defaultSnapState,
    payload,
  });
}

export function buildBedDecisionSheetView({
  defaultSnapState,
  careIntent = "bed",
  payload = null,
} = {}) {
  return buildSheetView({
    phase: MAP_SHEET_PHASES.BED_DECISION,
    snapState: defaultSnapState,
    payload: {
      careIntent,
      ...(asPayloadObject(payload) || {}),
    },
  });
}

export function buildCommitDetailsTransition({
  hospital,
  transport,
  payload,
  defaultExploreSnapState,
  currentSnapState,
}) {
  const payloadObject = asPayloadObject(payload) || {};
  const resolvedSourcePhase =
    payloadObject.sourcePhase || MAP_SHEET_PHASES.AMBULANCE_DECISION;
  const resolvedSourceSnapState =
    currentSnapState || defaultExploreSnapState;
  const resolvedSourcePayload = payloadObject.sourcePayload || null;

  return {
    sheetView: buildSheetView({
      phase: MAP_SHEET_PHASES.COMMIT_DETAILS,
      snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
      payload: {
        hospital: hospital || null,
        transport: transport || null,
        sourcePhase: resolvedSourcePhase,
        sourceSnapState: resolvedSourceSnapState,
        ...payloadObject,
      },
    }),
    commitFlow: {
      phase: MAP_SHEET_PHASES.COMMIT_DETAILS,
      phaseSnapState: MAP_SHEET_SNAP_STATES.EXPANDED,
      hospital: hospital || null,
      hospitalId: hospital?.id || null,
      transport: transport || null,
      draft: payloadObject.draft || null,
      activeStep: payloadObject.activeStep || null,
      sourcePhase: resolvedSourcePhase,
      sourceSnapState: resolvedSourceSnapState,
      sourcePayload: resolvedSourcePayload,
    },
  };
}

export function buildCommitTriageTransition({
  hospital,
  transport,
  payload,
  defaultExploreSnapState,
  currentSnapState,
}) {
  const payloadObject = asPayloadObject(payload) || {};
  const resolvedSourcePhase =
    payloadObject.sourcePhase || MAP_SHEET_PHASES.COMMIT_DETAILS;
  const resolvedSourceSnapState =
    payloadObject.sourceSnapState ||
    currentSnapState ||
    defaultExploreSnapState;
  const resolvedSourcePayload = payloadObject.sourcePayload || null;

  return {
    sheetView: buildSheetView({
      phase: MAP_SHEET_PHASES.COMMIT_TRIAGE,
      snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
      payload: {
        hospital: hospital || null,
        transport: transport || null,
        sourcePhase: resolvedSourcePhase,
        sourceSnapState: resolvedSourceSnapState,
        sourcePayload: resolvedSourcePayload,
        ...payloadObject,
      },
    }),
    commitFlow: {
      phase: MAP_SHEET_PHASES.COMMIT_TRIAGE,
      phaseSnapState: MAP_SHEET_SNAP_STATES.EXPANDED,
      hospital: hospital || null,
      hospitalId: hospital?.id || null,
      transport: transport || null,
      draft: payloadObject.draft || null,
      triageDraft: payloadObject.triageDraft || null,
      triageSnapshot: payloadObject.triageSnapshot || null,
      activeStep: payloadObject.activeStep || null,
      showExtendedComplaints: Boolean(payloadObject.showExtendedComplaints),
      sourcePhase: resolvedSourcePhase,
      sourceSnapState: resolvedSourceSnapState,
      sourcePayload: resolvedSourcePayload,
      careIntent: payloadObject.careIntent || null,
      roomId: payloadObject.roomId || null,
      room: payloadObject.room || null,
    },
  };
}

export function buildCommitPaymentTransition({
  hospital,
  transport,
  payload,
  defaultExploreSnapState,
  currentSnapState,
  usesSidebarLayout,
}) {
  const payloadObject = asPayloadObject(payload) || {};
  const resolvedSourcePhase =
    payloadObject.sourcePhase || MAP_SHEET_PHASES.COMMIT_DETAILS;
  const resolvedSourceSnapState =
    payloadObject.sourceSnapState ||
    currentSnapState ||
    defaultExploreSnapState;
  const resolvedSourcePayload = payloadObject.sourcePayload || null;
  const phaseSnapState = usesSidebarLayout
    ? MAP_SHEET_SNAP_STATES.EXPANDED
    : MAP_SHEET_SNAP_STATES.HALF;

  return {
    sheetView: buildSheetView({
      phase: MAP_SHEET_PHASES.COMMIT_PAYMENT,
      snapState: phaseSnapState,
      payload: {
        ...payloadObject,
        hospital: hospital || null,
        transport: transport || null,
        sourcePhase: resolvedSourcePhase,
        sourceSnapState: resolvedSourceSnapState,
        sourcePayload: resolvedSourcePayload,
      },
    }),
    commitFlow: {
      phase: MAP_SHEET_PHASES.COMMIT_PAYMENT,
      phaseSnapState,
      hospital: hospital || null,
      hospitalId: hospital?.id || null,
      transport: transport || null,
      draft: payloadObject.draft || null,
      triageDraft: payloadObject.triageDraft || null,
      triageSnapshot: payloadObject.triageSnapshot || null,
      pricingSnapshot: payloadObject.pricingSnapshot || null,
      sourcePhase: resolvedSourcePhase,
      sourceSnapState: resolvedSourceSnapState,
      sourcePayload: resolvedSourcePayload,
    },
  };
}

export function buildCommitRestoreSheetView({
  commitFlow,
  hospital,
  defaultExploreSnapState,
}) {
  const restoredSourcePhase =
    commitFlow?.sourcePhase || MAP_SHEET_PHASES.AMBULANCE_DECISION;
  const restoredSourcePayload = commitFlow?.sourcePayload || null;
  const restoredCareIntent =
    restoredSourcePayload?.careIntent || commitFlow?.careIntent || null;
  const restoredRoom = restoredSourcePayload?.room || commitFlow?.room || null;
  const restoredRoomId =
    restoredSourcePayload?.roomId || commitFlow?.roomId || null;
  const restoredPhaseSnapState =
    commitFlow?.phaseSnapState ||
    (commitFlow?.phase === MAP_SHEET_PHASES.COMMIT_PAYMENT
      ? defaultExploreSnapState
      : MAP_SHEET_SNAP_STATES.EXPANDED);

  return buildSheetView({
    phase: commitFlow?.phase,
    snapState: restoredPhaseSnapState,
    payload: {
      hospital: hospital || null,
      transport: commitFlow?.transport || null,
      draft: commitFlow?.draft || null,
      triageDraft: commitFlow?.triageDraft || null,
      triageSnapshot: commitFlow?.triageSnapshot || null,
      pricingSnapshot: commitFlow?.pricingSnapshot || null,
      activeStep: commitFlow?.activeStep || null,
      showExtendedComplaints: Boolean(commitFlow?.showExtendedComplaints),
      careIntent: restoredCareIntent,
      room: restoredRoom,
      roomId: restoredRoomId,
      sourcePhase: restoredSourcePhase,
      sourceSnapState: commitFlow?.sourceSnapState || defaultExploreSnapState,
      sourcePayload: restoredSourcePayload,
    },
  });
}

export function buildSourceReturnSheetView({
  payload,
  fallbackPhase,
  fallbackSnapState,
  fallbackPayload = null,
}) {
  return buildSheetView({
    phase: payload?.sourcePhase || fallbackPhase,
    snapState: payload?.sourceSnapState || fallbackSnapState,
    payload:
      payload?.sourcePayload === undefined
        ? fallbackPayload
        : payload?.sourcePayload || null,
  });
}

export function buildTrackingOrExploreReturnSheetView({
  payload,
  defaultExploreSnapState,
}) {
  if (payload?.sourcePhase === MAP_SHEET_PHASES.TRACKING) {
    return buildSourceReturnSheetView({
      payload,
      fallbackPhase: MAP_SHEET_PHASES.TRACKING,
      fallbackSnapState: defaultExploreSnapState,
      fallbackPayload: null,
    });
  }
  return buildExploreIntentSheetView(defaultExploreSnapState);
}

export function buildServiceDetailSheetView({
  hospital,
  service,
  serviceType,
  serviceItems = [],
  sourcePhase = MAP_SHEET_PHASES.HOSPITAL_DETAIL,
  sourceSnapState,
  sourcePayload = null,
}) {
  return buildSheetView({
    phase: MAP_SHEET_PHASES.SERVICE_DETAIL,
    snapState: MAP_SHEET_SNAP_STATES.EXPANDED,
    payload: {
      hospital,
      service,
      serviceType,
      serviceItems: Array.isArray(serviceItems) ? serviceItems : [],
      sourcePhase,
      sourceSnapState,
      sourcePayload,
    },
  });
}
