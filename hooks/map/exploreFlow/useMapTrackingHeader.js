// hooks/map/exploreFlow/useMapTrackingHeader.js
// PULLBACK NOTE: Extracted from useMapExploreFlow.js
// Owns: tracking header visibility, session, layout insets, left/right components,
//       header state effect, 1-second timer, header action request machinery

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { buildMapActiveSessionHeaderSession } from "../../../components/map/core/mapActiveSessionPresentation";
import { buildMapOverlayHeaderLayoutInsets } from "../../../components/map/core/mapOverlayHeaderLayout";
import { MAP_SHEET_PHASES, MAP_SHEET_SNAP_STATES } from "../../../components/map/core/MapSheetOrchestrator";
import { HEADER_MODES } from "../../../constants/header";
import { COLORS } from "../../../constants/colors";
import {
  MAP_EXPLORE_RUNTIME_SCOPES,
  MAP_EXPLORE_TRACKING_RUNTIME_KEYS,
} from "../state/mapExploreFlow.runtime";
import MapHeaderIconButton from "../../../components/map/views/shared/MapHeaderIconButton";

const TRACKING_HEADER_COLLAPSED_HEIGHT = 124;

function TrackHeaderIcon({
  onPress,
  backgroundColor = "rgba(255,255,255,0.82)",
  color = "#0F172A",
  pulseColor = COLORS.brandPrimary,
}) {
  const pulseProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseProgress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseProgress, {
          toValue: 0,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseProgress]);

  const pulseScale = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.42],
  });
  const pulseOpacity = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 0.34],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Return to tracking"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
        shadowColor: "#000000",
        shadowOpacity: 0.14,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 7 },
        elevation: 8,
        ...Platform.select({
          web: {
            boxShadow: "0px 10px 18px rgba(15,23,42,0.18)",
          },
          default: {},
        }),
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name="route" size={21} color={color} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 3,
          right: 3,
          width: 8,
          height: 8,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: pulseColor,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          }}
        />
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: pulseColor,
          }}
        />
      </View>
    </Pressable>
  );
}

/**
 * useMapTrackingHeader
 *
 * Manages the floating tracking header that appears when an active ambulance
 * or bed booking is in progress. Owns:
 * - 1-second timer for live ETA refresh
 * - Header session model derivation
 * - Layout inset computation
 * - Left (triage) and right (reopen / close) action components
 * - Header state effect (lock/unlock, setHeaderState)
 * - Tracking action request dispatch
 */
export function useMapTrackingHeader({
  trackingRequestKey,
  trackingVisible,
  sheetPhase,
  sheetSnapState,
  usesSidebarLayout,
  sidebarWidth,
  surfaceConfig,
  width,
  activeMapRequest,
  ambulanceTelemetryHealth,
  pendingApproval,
  hasActiveMapModal,
  isDarkMode,
  openTracking,
  closeTracking,
  lockHeaderHidden,
  unlockHeaderHidden,
  forceHeaderVisible,
  setHeaderState,
  setRuntimeSlice,
}) {
  const [trackingHeaderNowMs, setTrackingHeaderNowMs] = useState(Date.now());

  useEffect(() => {
    if (!trackingVisible || !trackingRequestKey) {
      return undefined;
    }
    setTrackingHeaderNowMs(Date.now());
    const intervalId = setInterval(() => {
      setTrackingHeaderNowMs(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, [trackingRequestKey, trackingVisible]);

  const trackingHeaderOwnsCurrentPhase =
    sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT ||
    sheetPhase === MAP_SHEET_PHASES.TRACKING;

  const trackingHeaderVisible =
    Boolean(trackingRequestKey) &&
    trackingHeaderOwnsCurrentPhase &&
    (usesSidebarLayout || sheetSnapState !== MAP_SHEET_SNAP_STATES.EXPANDED) &&
    !hasActiveMapModal;

  const trackingHeaderCanReopen =
    trackingHeaderVisible && sheetPhase === MAP_SHEET_PHASES.EXPLORE_INTENT;

  const trackingHeaderActionSurface = isDarkMode
    ? "rgba(255,255,255,0.08)"
    : "rgba(255,255,255,0.76)";
  const trackingHeaderActionColor = isDarkMode ? "#F8FAFC" : "#0F172A";
  const trackingHeaderRouteSurface = isDarkMode
    ? "rgba(134,16,14,0.24)"
    : "rgba(134,16,14,0.12)";

  const trackingHeaderLayoutInsets = useMemo(
    () =>
      buildMapOverlayHeaderLayoutInsets({
        screenWidth: width,
        surfaceConfig,
        usesSidebarLayout,
        sidebarWidth,
      }),
    [sidebarWidth, surfaceConfig, usesSidebarLayout, width],
  );

  const trackingHeaderSession = useMemo(() => {
    if (!trackingHeaderVisible) return null;
    return buildMapActiveSessionHeaderSession({
      activeMapRequest,
      ambulanceTelemetryHealth,
      pendingApproval,
    });
  }, [activeMapRequest, ambulanceTelemetryHealth, pendingApproval, trackingHeaderVisible]);

  const handleTrackingHeaderOpen = useCallback(() => {
    openTracking();
  }, [openTracking]);

  const requestTrackingHeaderAction = useCallback(
    (type) => {
      if (!type) return;
      setRuntimeSlice(
        MAP_EXPLORE_RUNTIME_SCOPES.TRACKING,
        MAP_EXPLORE_TRACKING_RUNTIME_KEYS.HEADER_ACTION_REQUEST,
        { type, requestedAt: Date.now() },
      );
      openTracking();
    },
    [openTracking, setRuntimeSlice],
  );

  const clearTrackingHeaderActionRequest = useCallback(() => {
    setRuntimeSlice(
      MAP_EXPLORE_RUNTIME_SCOPES.TRACKING,
      MAP_EXPLORE_TRACKING_RUNTIME_KEYS.HEADER_ACTION_REQUEST,
      null,
    );
  }, [setRuntimeSlice]);

  const trackingHeaderLeftComponent = useMemo(() => {
    if (!trackingHeaderVisible) return null;
    return (
      <MapHeaderIconButton
        accessibilityLabel="Update your information"
        backgroundColor={trackingHeaderActionSurface}
        borderRadius={999}
        color={trackingHeaderActionColor}
        iconName="medkit"
        onPress={() => requestTrackingHeaderAction("triage")}
        pressableStyle={{ marginRight: 6 }}
        style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}
      />
    );
  }, [
    requestTrackingHeaderAction,
    trackingHeaderActionColor,
    trackingHeaderActionSurface,
    trackingHeaderVisible,
  ]);

  const trackingHeaderRightComponent = useMemo(() => {
    if (!trackingHeaderVisible) return null;
    if (trackingHeaderCanReopen) {
      return (
        <TrackHeaderIcon
          backgroundColor={trackingHeaderRouteSurface}
          color={COLORS.brandPrimary}
          pulseColor={COLORS.brandPrimary}
          onPress={handleTrackingHeaderOpen}
        />
      );
    }
    return (
      <MapHeaderIconButton
        accessibilityLabel="Return to map"
        backgroundColor={trackingHeaderActionSurface}
        borderRadius={999}
        color={trackingHeaderActionColor}
        iconName="map-outline"
        onPress={closeTracking}
        style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}
      />
    );
  }, [
    closeTracking,
    handleTrackingHeaderOpen,
    trackingHeaderActionColor,
    trackingHeaderActionSurface,
    trackingHeaderCanReopen,
    trackingHeaderRouteSurface,
    trackingHeaderVisible,
  ]);

  const trackingHeaderOcclusionHeight = trackingHeaderVisible
    ? TRACKING_HEADER_COLLAPSED_HEIGHT
    : 0;

  useEffect(() => {
    if (!trackingHeaderVisible || !trackingHeaderSession) {
      lockHeaderHidden();
      setHeaderState({
        mode: HEADER_MODES.HIDDEN,
        hidden: true,
        scrollAware: false,
        layoutInsets: null,
      });
      return;
    }
    unlockHeaderHidden();
    forceHeaderVisible();
    setHeaderState({
      mode: HEADER_MODES.ACTIVE_SESSION,
      hidden: false,
      scrollAware: false,
      backgroundColor: COLORS.brandPrimary,
      leftComponent: trackingHeaderLeftComponent,
      rightComponent: trackingHeaderRightComponent,
      session: trackingHeaderSession,
      layoutInsets: trackingHeaderLayoutInsets,
    });
  }, [
    forceHeaderVisible,
    lockHeaderHidden,
    setHeaderState,
    trackingHeaderLayoutInsets,
    trackingHeaderLeftComponent,
    trackingHeaderRightComponent,
    trackingHeaderSession,
    trackingHeaderVisible,
    unlockHeaderHidden,
  ]);

  return {
    trackingHeaderNowMs,
    trackingHeaderVisible,
    trackingHeaderOcclusionHeight,
    clearTrackingHeaderActionRequest,
    requestTrackingHeaderAction,
  };
}
