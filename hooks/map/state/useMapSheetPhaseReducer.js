// hooks/map/state/useMapSheetPhaseReducer.js
//
// PULLBACK NOTE: Pass 3 — valid transitions reducer for map sheet phase
// OLD: setSheetView called directly from any handler with no transition guard
// NEW: transitionTo(sheetView) wraps setSheetView with __DEV__ warn-only guard
//      goBack() uses sheetPayload.sourcePhase with safe EXPLORE_INTENT fallback
//
// Design constraints:
// - warn-only in __DEV__ — never blocking (no user-facing regressions)
// - validTransitions built from observed real call sites only (no phantom entries)
// - sourcePhase recorded in every sheetView payload by transition builders
// - does NOT replace setSheetView — composes over it

import { useCallback } from "react";
import { MAP_SHEET_PHASES } from "../../../components/map/core/MapSheetOrchestrator";
import {
  buildExploreIntentSheetView,
  buildSourceReturnSheetView,
} from "../exploreFlow/mapExploreFlow.transitions";

// ─── Valid transitions table ──────────────────────────────────────────────────
// Each key is the FROM phase. Value is the set of phases it may transition TO.
// Built strictly from observed setSheetView call sites across:
//   useMapSheetNavigation.js, useMapCommitFlow.js, useMapTracking.js,
//   useMapHistoryFlow.js, useMapServiceDetail.js
//
// Rule: a transition not in this table is suspicious but NOT blocked.
// __DEV__ warn fires; the transition proceeds.

const VALID_TRANSITIONS = Object.freeze({
  [MAP_SHEET_PHASES.EXPLORE_INTENT]: new Set([
    MAP_SHEET_PHASES.SEARCH,
    MAP_SHEET_PHASES.HOSPITAL_LIST,
    MAP_SHEET_PHASES.HOSPITAL_DETAIL,
    MAP_SHEET_PHASES.AMBULANCE_DECISION,
    MAP_SHEET_PHASES.BED_DECISION,
    MAP_SHEET_PHASES.TRACKING,
    MAP_SHEET_PHASES.VISIT_DETAIL,
    MAP_SHEET_PHASES.SERVICE_DETAIL,
    MAP_SHEET_PHASES.COMMIT_DETAILS,
    MAP_SHEET_PHASES.COMMIT_TRIAGE,
    MAP_SHEET_PHASES.COMMIT_PAYMENT,
  ]),
  [MAP_SHEET_PHASES.SEARCH]: new Set([
    MAP_SHEET_PHASES.EXPLORE_INTENT,
    MAP_SHEET_PHASES.HOSPITAL_DETAIL,
  ]),
  [MAP_SHEET_PHASES.HOSPITAL_LIST]: new Set([
    MAP_SHEET_PHASES.EXPLORE_INTENT,
    MAP_SHEET_PHASES.AMBULANCE_DECISION,
    MAP_SHEET_PHASES.BED_DECISION,
    MAP_SHEET_PHASES.HOSPITAL_DETAIL,
  ]),
  [MAP_SHEET_PHASES.HOSPITAL_DETAIL]: new Set([
    MAP_SHEET_PHASES.EXPLORE_INTENT,
    MAP_SHEET_PHASES.AMBULANCE_DECISION,
    MAP_SHEET_PHASES.BED_DECISION,
    MAP_SHEET_PHASES.SERVICE_DETAIL,
    MAP_SHEET_PHASES.COMMIT_DETAILS,
  ]),
  [MAP_SHEET_PHASES.AMBULANCE_DECISION]: new Set([
    MAP_SHEET_PHASES.EXPLORE_INTENT,
    MAP_SHEET_PHASES.HOSPITAL_LIST,
    MAP_SHEET_PHASES.COMMIT_DETAILS,
    MAP_SHEET_PHASES.TRACKING,
  ]),
  [MAP_SHEET_PHASES.BED_DECISION]: new Set([
    MAP_SHEET_PHASES.EXPLORE_INTENT,
    MAP_SHEET_PHASES.HOSPITAL_LIST,
    MAP_SHEET_PHASES.COMMIT_DETAILS,
    MAP_SHEET_PHASES.AMBULANCE_DECISION,
  ]),
  [MAP_SHEET_PHASES.COMMIT_DETAILS]: new Set([
    MAP_SHEET_PHASES.EXPLORE_INTENT,
    MAP_SHEET_PHASES.AMBULANCE_DECISION,
    MAP_SHEET_PHASES.BED_DECISION,
    MAP_SHEET_PHASES.COMMIT_TRIAGE,
    MAP_SHEET_PHASES.COMMIT_PAYMENT,
  ]),
  [MAP_SHEET_PHASES.COMMIT_TRIAGE]: new Set([
    MAP_SHEET_PHASES.EXPLORE_INTENT,
    MAP_SHEET_PHASES.COMMIT_DETAILS,
    MAP_SHEET_PHASES.COMMIT_PAYMENT,
    MAP_SHEET_PHASES.TRACKING,
  ]),
  [MAP_SHEET_PHASES.COMMIT_PAYMENT]: new Set([
    MAP_SHEET_PHASES.EXPLORE_INTENT,
    MAP_SHEET_PHASES.COMMIT_TRIAGE,
    MAP_SHEET_PHASES.COMMIT_DETAILS,
    MAP_SHEET_PHASES.TRACKING,
  ]),
  [MAP_SHEET_PHASES.TRACKING]: new Set([
    MAP_SHEET_PHASES.EXPLORE_INTENT,
    MAP_SHEET_PHASES.COMMIT_TRIAGE,
    MAP_SHEET_PHASES.VISIT_DETAIL,
  ]),
  [MAP_SHEET_PHASES.VISIT_DETAIL]: new Set([
    MAP_SHEET_PHASES.EXPLORE_INTENT,
    MAP_SHEET_PHASES.TRACKING,
  ]),
  [MAP_SHEET_PHASES.SERVICE_DETAIL]: new Set([
    MAP_SHEET_PHASES.EXPLORE_INTENT,
    MAP_SHEET_PHASES.HOSPITAL_DETAIL,
  ]),
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useMapSheetPhaseReducer
 *
 * Wraps setSheetView with:
 * - transitionTo(sheetView): warn-only guard in __DEV__, then delegates to setSheetView
 * - goBack(defaultSnapState): returns to sheetPayload.sourcePhase, falls back to EXPLORE_INTENT
 *
 * Does NOT replace setSheetView on existing call sites — composable opt-in.
 * All new sheet navigation should use transitionTo() instead of setSheetView directly.
 */
export function useMapSheetPhaseReducer({
  sheetPhase,
  sheetPayload,
  defaultExploreSnapState,
  setSheetView,
}) {
  const transitionTo = useCallback(
    (nextSheetView) => {
      if (__DEV__) {
        const fromPhase = sheetPhase;
        const toPhase = nextSheetView?.phase;
        const allowed = VALID_TRANSITIONS[fromPhase];
        if (toPhase && allowed && !allowed.has(toPhase)) {
          console.warn(
            `[useMapSheetPhaseReducer] Unexpected transition: ${fromPhase} → ${toPhase}. ` +
            `Not in validTransitions table. Check if table needs updating.`,
            { fromPhase, toPhase, payload: nextSheetView?.payload }
          );
        }
      }
      setSheetView(nextSheetView);
    },
    [sheetPhase, setSheetView],
  );

  const goBack = useCallback(() => {
    const origin = sheetPayload?.sourcePhase;
    if (origin && origin !== sheetPhase) {
      setSheetView(
        buildSourceReturnSheetView({
          payload: sheetPayload,
          fallbackPhase: origin,
          fallbackSnapState: defaultExploreSnapState,
          fallbackPayload: null,
        }),
      );
      return;
    }
    // PULLBACK NOTE: safe fallback — always lands at EXPLORE_INTENT if no sourcePhase
    setSheetView(buildExploreIntentSheetView(defaultExploreSnapState));
  }, [defaultExploreSnapState, setSheetView, sheetPayload, sheetPhase]);

  return { transitionTo, goBack, VALID_TRANSITIONS };
}
