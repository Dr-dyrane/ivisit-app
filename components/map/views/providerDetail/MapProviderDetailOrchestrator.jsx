// components/map/views/providerDetail/MapProviderDetailOrchestrator.jsx
//
// Thin routing wrapper — matches MapHospitalDetailOrchestrator pattern.
// MapSheetOrchestrator routes MAP_SHEET_PHASES.PROVIDER_DETAIL here.

import React from "react";
import MapProviderDetailStageBase from "./MapProviderDetailStageBase";

export default function MapProviderDetailOrchestrator({
  sheetHeight,
  snapState,
  sheetPayload,
  onClose,
  onSnapStateChange,
}) {
  const provider      = sheetPayload?.provider ?? null;
  const userLocation  = sheetPayload?.userLocation ?? null;

  return (
    <MapProviderDetailStageBase
      sheetHeight={sheetHeight}
      snapState={snapState}
      provider={provider}
      userLocation={userLocation}
      onClose={onClose}
      onSnapStateChange={onSnapStateChange}
    />
  );
}
