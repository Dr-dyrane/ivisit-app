// app/runtime/OTAModalLayer.jsx
// PULLBACK NOTE: Pass 5 - Extracted from RootNavigator
// OLD: OTA modals rendered directly in RootNavigator
// NEW: Dedicated OTA modal layer for separation of concerns

import React from "react";
import { useOTAUpdates } from "../../hooks/useOTAUpdates";
import UpdateAvailableModal from "../../components/ui/UpdateAvailableModal";

/**
 * OTAModalLayer - Over-the-Air update modal presentation layer
 *
 * Responsibilities:
 * - Render OTA update available modal
 * - Render OTA update success modal
 *
 * NOTE: This component is rendered at root level (inside RootNavigator)
 * to ensure modals appear above all navigation content.
 */
// Required by Expo Router (all files in app/ must have a default export)
export default null;

export function OTAModalLayer() {
	const { showModal, showSuccessModal, handleRestart, handleLater, handleDismissSuccess } = useOTAUpdates();

	return (
		<>
			{/* [OTA-UPDATE-REDESIGN] Custom premium bottom sheet for app updates */}
			<UpdateAvailableModal
				visible={showModal}
				variant="available"
				onRestart={handleRestart}
				onLater={handleLater}
			/>

			{/* [OTA-UPDATE-SUCCESS] Success modal after update is applied */}
			<UpdateAvailableModal
				visible={showSuccessModal}
				variant="completed"
				onDismiss={handleDismissSuccess}
			/>
		</>
	);
}
