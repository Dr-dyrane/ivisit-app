// components/map/MapModalOrchestrator.jsx
//
// PULLBACK NOTE: MapScreen decomposition Pass 8 — extracted from MapScreen.jsx lines 558-633
// OLD: All modal renderers lived inline in MapScreen JSX (~75 lines)
// NEW: Owned here — MapScreen passes all modal props, component renders modals
//
// Owns:
//   - All modal rendering for MapScreen (MiniProfileModal, MapGuestProfileModal,
//     MapChooseCareModal, MapHistoryModal, MapHistoryPaymentModal, ServiceRatingModal)
//
// Does NOT own:
//   - Modal visibility state — from useMapExploreFlow/useMapShell, passed in
//   - Modal handlers — from useMapRouteHandlers/useMapHistoryFlow/useTrackingRatingFlow, passed in
//   - Modal data — from useMapHistoryFlow/useTrackingRatingFlow, passed in

import MiniProfileModal from "../emergency/MiniProfileModal";
import { ServiceRatingModal } from "../emergency/ServiceRatingModal";
import MapGuestProfileModal from "./MapGuestProfileModal";
import MapChooseCareModal from "./MapChooseCareModal";
import MapHistoryModal from "./history/MapHistoryModal";
import MapHistoryPaymentModal from "./history/MapHistoryPaymentModal";
import { EmergencyContactDispatchModal } from "./communication/EmergencyContactDispatchModal";
import AsyncConsultModal from "./communication/AsyncConsultModal";
import ScheduledVisitCancelConfirmation from "./visits/ScheduledVisitCancelConfirmation";
import ScheduledVisitRescheduleModal from "./visits/ScheduledVisitRescheduleModal";
import { useAtom } from "jotai";
import { useRef } from "react";
import {
  emergencyChatModalVisibleAtom,
  activeEmergencyChatRequestIdAtom,
} from "../../atoms/emergencyChatAtoms";

/**
 * MapModalOrchestrator
 *
 * Renders all modal overlays for the Map screen.
 * - Profile modals (signed-in and guest)
 * - Choose Care modal
 * - History modal (recent visits)
 * - History payment modal
 * - Service rating modal (tracking takes priority over recovered rating)
 * - Contact Dispatch modal
 *
 * @param {Object} props
 * @param {boolean} props.profileModalVisible - MiniProfileModal visibility
 * @param {boolean} props.guestProfileVisible - MapGuestProfileModal visibility
 * @param {boolean} props.careHistoryVisible - MapChooseCareModal visibility
 * @param {boolean} props.recentVisitsModalVisible - MapHistoryModal visibility
 * @param {boolean} props.usesSidebarLayout - Whether sidebar layout is active
 * @param {Function} props.setProfileModalVisible - Set profile modal visibility
 * @param {Function} props.setGuestProfileVisible - Set guest profile visibility
 * @param {Function} props.setCareHistoryVisible - Set care history visibility
 * @param {Function} props.setRecentVisitsVisible - Set recent visits visibility
 * @param {Function} props.handleProfileSignOut - Profile sign-out handler
 * @param {Function} props.onOpenLocationIntent - Opens LocationSheet from mini profile (UX-E)
 * @param {Function} props.handleChooseCare - Choose care handler
 * @param {Function} props.handleExploreCare - EXP-5: Explore nearby care category handler
 * @param {Function} props.handleBookVisitFromCare - Book visit from care handler
 * @param {Function} props.handleSelectHistoryItem - Select history item handler
 * @param {Function} props.handleBookVisitFromHistory - Book visit from history handler
 * @param {Function} props.handleOpenChooseCareFromHistory - Open choose care from history handler
 * @param {Function} props.handleCloseRecentVisits - Close recent visits handler
 * @param {Function} props.handleRouteManagedHistoryFilterChange - Route-managed history filter change handler
 * @param {boolean} props.isSignedIn - Whether user is signed in
 * @param {boolean} props.isRouteManagedRecentVisits - Whether recent visits are route-managed
 * @param {string|null} props.routeHistoryFilter - Route-managed history filter
 * @param {Object} props.historyPaymentState - History payment state
 * @param {Function} props.closeHistoryPaymentDetails - Close history payment details handler
 * @param {Object} props.recoveredRatingState - Recovered rating state
 * @param {Function} props.closeRecoveredRating - Close recovered rating handler
 * @param {Function} props.handleSkipRecoveredRating - Skip recovered rating handler
 * @param {Function} props.handleSubmitRecoveredRating - Submit recovered rating handler
 * @param {Object} props.trackingRatingState - Tracking rating state
 * @param {Function} props.closeTrackingRating - Close tracking rating handler
 * @param {Function} props.skipTrackingRating - Skip tracking rating handler
 * @param {Function} props.submitTrackingRating - Submit tracking rating handler
 */
export default function MapModalOrchestrator({
  // Visibility
  profileModalVisible,
  guestProfileVisible,
  careHistoryVisible,
  recentVisitsModalVisible,
  usesSidebarLayout,

  // Setters
  setProfileModalVisible,
  setGuestProfileVisible,
  setCareHistoryVisible,
  setRecentVisitsVisible,

  // Handlers
  handleProfileSignOut,
  handleChooseCare,
  handleExploreCare,
  handleBookVisitFromCare,
  handleSelectHistoryItem,
  handleBookVisitFromHistory,
  handleOpenChooseCareFromHistory,
  handleCloseRecentVisits,
  handleRouteManagedHistoryFilterChange,

  // Flags
  isSignedIn,
  isRouteManagedRecentVisits,
  routeHistoryFilter,

  // History payment
  historyPaymentState,
  closeHistoryPaymentDetails,

  // Scheduled visits
  asyncConsultVisit,
  closeAsyncConsult,
  rescheduleVisit,
  closeRescheduleVisit,
  handleRescheduleSuccess,
  cancelConfirmationVisit,
  closeCancelConfirmation,
  confirmCancelHistoryVisit,
  userId,

  // Recovered rating
  recoveredRatingState,
  closeRecoveredRating,
  handleSkipRecoveredRating,
  handleSubmitRecoveredRating,

  // Tracking rating
  trackingRatingState,
  closeTrackingRating,
  skipTrackingRating,
  submitTrackingRating,

  // UX-E: Location sheet entry point from mini profile
  // PULLBACK NOTE: UX-E Issue 11 — passed through from MapScreen to MiniProfileModal
  onOpenLocationIntent,
}) {
  // PULLBACK NOTE: Contact Dispatch CD-7 — emergency chat modal state
  const [emergencyChatModalVisible] = useAtom(emergencyChatModalVisibleAtom);
  const [activeEmergencyChatRequestId] = useAtom(activeEmergencyChatRequestIdAtom);
  const ratingState = trackingRatingState?.visible
    ? trackingRatingState
    : recoveredRatingState?.visible
      ? recoveredRatingState
      : null;
  const lastVisibleRatingStateRef = useRef(null);
  if (ratingState?.visible) {
    lastVisibleRatingStateRef.current = ratingState;
  }
  // MapModalShell keeps its content mounted during the close animation. Preserve
  // the resolved service copy for that final frame so a completed transport
  // cannot visually fall back to the generic "Rate your visit" presentation.
  const presentedRatingState = ratingState ?? lastVisibleRatingStateRef.current;
  const ratingHandlers = trackingRatingState?.visible
    ? {
        onClose: closeTrackingRating,
        onSkip: skipTrackingRating,
        onSubmit: submitTrackingRating,
      }
    : {
        onClose: closeRecoveredRating,
        onSkip: handleSkipRecoveredRating,
        onSubmit: handleSubmitRecoveredRating,
      };
  return (
    <>
      <MiniProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        onSignOut={handleProfileSignOut}
        onOpenRecentVisits={() => setRecentVisitsVisible(true)}
        onOpenLocationIntent={onOpenLocationIntent}
        showMapShortcut={false}
        preferDrawerPresentation={usesSidebarLayout}
      />

      <MapGuestProfileModal
        visible={guestProfileVisible}
        onClose={() => setGuestProfileVisible(false)}
        onAuthSuccess={() => setGuestProfileVisible(false)}
        preferDrawerPresentation={usesSidebarLayout}
      />

      <MapChooseCareModal
        visible={careHistoryVisible}
        onClose={() => setCareHistoryVisible(false)}
        onChooseCare={(mode) => {
          setCareHistoryVisible(false);
          handleChooseCare(mode);
        }}
        onBookVisit={isSignedIn ? handleBookVisitFromCare : undefined}
        onExploreCare={typeof handleExploreCare === "function" ? (providerType) => {
          setCareHistoryVisible(false);
          handleExploreCare(providerType);
        } : undefined}
      />

      <MapHistoryModal
        visible={recentVisitsModalVisible}
        onClose={handleCloseRecentVisits}
        // PULLBACK NOTE: PASS 19H — pass sourceSurface="recents" when opening from history modal
        onSelectVisit={(historyItem) => handleSelectHistoryItem(historyItem, "recents")}
        onBookVisit={isSignedIn ? handleBookVisitFromHistory : undefined}
        onChooseCare={handleOpenChooseCareFromHistory}
        routeManagedFilterKey={
          isRouteManagedRecentVisits ? routeHistoryFilter : null
        }
        onRouteManagedFilterChange={
          isRouteManagedRecentVisits
            ? handleRouteManagedHistoryFilterChange
            : undefined
        }
      />

      <MapHistoryPaymentModal
        visible={historyPaymentState.visible}
        loading={historyPaymentState.loading}
        paymentRecord={historyPaymentState.paymentRecord}
        onClose={closeHistoryPaymentDetails}
      />

      <AsyncConsultModal
        visible={Boolean(asyncConsultVisit)}
        historyItem={asyncConsultVisit}
        onClose={closeAsyncConsult}
      />

      <ScheduledVisitRescheduleModal
        visible={Boolean(rescheduleVisit)}
        historyItem={rescheduleVisit}
        onClose={closeRescheduleVisit}
        onSuccess={handleRescheduleSuccess}
        userId={userId}
      />

      <ScheduledVisitCancelConfirmation
        visible={Boolean(cancelConfirmationVisit)}
        onCancel={closeCancelConfirmation}
        onConfirm={confirmCancelHistoryVisit}
      />

      <ServiceRatingModal
        visible={Boolean(ratingState?.visible)}
        serviceType={presentedRatingState?.serviceType || "visit"}
        title={presentedRatingState?.title || "Rate your visit"}
        subtitle={presentedRatingState?.subtitle || null}
        serviceDetails={presentedRatingState?.serviceDetails || null}
        onClose={ratingHandlers.onClose}
        onSkip={ratingHandlers.onSkip}
        onSubmit={ratingHandlers.onSubmit}
        surfaceVariant="map"
        preferDrawerPresentation={usesSidebarLayout}
      />

      {/* PULLBACK NOTE: Contact Dispatch CD-7 — emergency chat modal */}
      <EmergencyContactDispatchModal
        visible={emergencyChatModalVisible}
        onClose={() => {
          // Modal handles its own atom cleanup
        }}
      />
    </>
  );
}
