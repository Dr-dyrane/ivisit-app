// hooks/map/useMapFABManagement.js
//
// PULLBACK NOTE: MapScreen decomposition Pass 6 — extracted from MapScreen.jsx lines 266-289
// OLD: Two useEffects for FAB suppression and global FAB hiding lived inline in MapScreen
// NEW: Owned here — MapScreen passes hasActiveMapModal and FABContext actions, hook handles registration
//
// Owns:
//   - FAB suppression registration (when hasActiveMapModal is true)
//   - Global FAB hide registration (always on Map screen)
//
// Does NOT own:
//   - hasActiveMapModal — derived by useMapShell, passed in
//   - registerFAB/unregisterFAB — from FABContext, passed in

import { useEffect } from "react";

/**
 * useMapFABManagement
 *
 * Manages FAB registration for the Map screen.
 * - Registers a suppression FAB when map modals are active (prevents other FABs from showing)
 * - Always hides the global FAB on the Map screen (not part of intent-based flow)
 *
 * @param {Object} params
 * @param {boolean} params.hasActiveMapModal - Whether any map modal is currently visible
 * @param {Function} params.registerFAB - FABContext registration function
 * @param {Function} params.unregisterFAB - FABContext unregistration function
 */
export function useMapFABManagement({
  hasActiveMapModal,
  registerFAB,
  unregisterFAB,
}) {
  // FAB suppression: when map modals are active, suppress all other FABs
  useEffect(() => {
    const suppressionId = "map-modal-fab-suppression";
    if (hasActiveMapModal) {
      registerFAB(suppressionId, {
        visible: true,
        suppressGlobal: true,
        priority: 1000,
      });
      return () => unregisterFAB(suppressionId);
    }

    unregisterFAB(suppressionId);
    return undefined;
  }, [hasActiveMapModal, registerFAB, unregisterFAB]);

  // Global FAB hide: always hide the global FAB on the Map screen
  // The Map screen uses intent-based flows, not the global FAB
  useEffect(() => {
    const hideId = "map-hide-global-fab";
    registerFAB(hideId, {
      visible: false,
      priority: 100,
    });
    return () => unregisterFAB(hideId);
  }, [registerFAB, unregisterFAB]);
}
