import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import EntryActionButton from "../../../entry/EntryActionButton";
import { getAmbulanceVisualProfile } from "../../../emergency/requestModal/ambulanceTierVisuals";
import { COLORS } from "../../../../constants/colors";
import { getHospitalDetailServiceImageSource } from "../../surfaces/hospitals/mapHospitalDetail.content";
import MapStageGlassPanel from "../shared/MapStageGlassPanel";
import { MapTrackingTopSlot } from "../tracking/parts/MapTrackingParts";
import { MAP_BED_DECISION_COPY } from "./mapBedDecision.content";
import styles from "./mapBedDecision.styles";
import FadeEndText from "../../../ui/FadeEndText";

function toAccentRgba(color, alpha) {
  if (typeof color !== "string" || !color.startsWith("#")) {
    return `rgba(134,16,14,${alpha})`;
  }

  const hex = color.slice(1);
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  if (![red, green, blue].every(Number.isFinite)) {
    return `rgba(134,16,14,${alpha})`;
  }

  return `rgba(${red},${green},${blue},${alpha})`;
}

function getRoomDecisionVisual(item) {
  const raw = String(item?.title || item?.room_type || "").toLowerCase();
  if (/high-support|icu/.test(raw)) {
    return {
      accent: "#B91C1C",
      activeIconName: "pulse",
      inactiveIconName: "pulse-outline",
      iconLibrary: "Ionicons",
    };
  }
  if (/private/.test(raw)) {
    return {
      accent: "#0F766E",
      activeIconName: "shield-checkmark",
      inactiveIconName: "shield-checkmark-outline",
      iconLibrary: "Ionicons",
    };
  }
  if (/maternity/.test(raw)) {
    return {
      accent: "#BE185D",
      activeIconName: "heart",
      inactiveIconName: "heart-outline",
      iconLibrary: "Ionicons",
    };
  }
  if (/children|pediatric/.test(raw)) {
    return {
      accent: "#2563EB",
      activeIconName: "happy",
      inactiveIconName: "happy-outline",
      iconLibrary: "Ionicons",
    };
  }
  // PULLBACK NOTE: default room icon
  // OLD: Ionicons "bed" / "bed-outline" — generic sleeping/home bed
  // NEW: MaterialCommunityIcons "bed" — matches hero pill + explore intent orb
  return {
    accent: "#64748B",
    activeIconName: "bed",
    inactiveIconName: "bed",
    iconLibrary: "MaterialCommunityIcons",
  };
}

function getRoomIconName(roomVisual, isActive = false) {
  return isActive ? roomVisual.activeIconName : roomVisual.inactiveIconName;
}

function RoomIcon({ roomVisual, isActive = false, size, color }) {
  const name = getRoomIconName(roomVisual, isActive);
  if (roomVisual.iconLibrary === "MaterialCommunityIcons") {
    return <MaterialCommunityIcons name={name} size={size} color={color} />;
  }
  return <Ionicons name={name} size={size} color={color} />;
}

function formatRoomMeta(option, fallbackPrice) {
  return [option?.metaText, option?.priceText || fallbackPrice]
    .filter(Boolean)
    .join(", ");
}

function formatTimeAwayLabel(value) {
  const etaLabel = typeof value === "string" ? value.trim() : "";
  if (!etaLabel) return null;
  if (/route updating/i.test(etaLabel) || /arriving soon/i.test(etaLabel)) {
    return etaLabel;
  }
  return /\baway\b/i.test(etaLabel) ? etaLabel : `${etaLabel} away`;
}

function MetaSkeleton({ style }) {
  return <View style={[styles.metaSkeleton, style]} />;
}

function RouteMetaLine({ text, color, fadeColor }) {
  return (
    <FadeEndText
      text={text}
      fadeColor={fadeColor}
      fadeWidth={30}
      fadeRadius={12}
      containerStyle={styles.routeStopMetaWrap}
      textStyle={[styles.routeStopMeta, { color }]}
    />
  );
}

export function MapBedDecisionTopSlot({
  modalContainedStyle,
  contentInsetStyle,
  stageMetrics,
  titleColor,
  subtitleColor,
  closeSurfaceColor,
  onClose,
  showToggle = true,
  onToggle,
  toggleAccessibilityLabel = "Toggle sheet size",
  title,
  hospitalSubtext,
  toggleIconName = "chevron-up",
}) {
  return (
    <View
      style={[
        styles.topSlot,
        stageMetrics?.topSlot?.containerStyle,
        contentInsetStyle,
        modalContainedStyle,
      ]}
    >
      <MapTrackingTopSlot
        title={title || MAP_BED_DECISION_COPY.TITLE}
        subtitle={hospitalSubtext}
        titleColor={titleColor}
        mutedColor={subtitleColor}
        actionSurfaceColor={closeSurfaceColor}
        onToggle={onToggle}
        showToggle={showToggle}
        toggleIconName={toggleIconName}
        toggleAccessibilityLabel={toggleAccessibilityLabel}
        showClose
        onClose={onClose}
        closeAccessibilityLabel="Close bed decision"
      />
    </View>
  );
}

export function MapBedDecisionHero({
  decision,
  glassTokens,
  isDarkMode,
  stageMetrics,
  titleColor,
  surfaceColor,
  onOpenRoomDetails,
}) {
  const imageSource = decision?.recommendedRoom
    ? getHospitalDetailServiceImageSource(decision.recommendedRoom, "room")
    : null;
  const heroPillSurfaceColor = isDarkMode
    ? "rgba(8,15,27,0.58)"
    : "rgba(255,255,255,0.86)";
  const timeAwayLabel = formatTimeAwayLabel(decision.etaLabel);

  return (
    <View style={styles.heroPressable}>
      <MapStageGlassPanel
        style={[styles.heroCard, stageMetrics?.hero?.cardStyle]}
        backgroundColor={surfaceColor}
        glassTokens={glassTokens}
        isDarkMode={isDarkMode}
      >
        <View
          style={[styles.heroArtworkLayer, stageMetrics?.hero?.artworkStyle]}
        >
          {imageSource ? (
            <Image
              source={imageSource}
              resizeMode="contain"
              fadeDuration={0}
              style={styles.heroImage}
            />
          ) : null}
        </View>
        <View style={styles.heroHeader}>
          {typeof onOpenRoomDetails === "function" ? (
            <Pressable
              onPress={onOpenRoomDetails}
              style={[
                styles.heroDetailChip,
                stageMetrics?.hero?.detailChipStyle,
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={26}
                color={COLORS.brandPrimary}
              />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <FadeEndText
              text={decision.roomTitle}
              fadeColor={surfaceColor}
              fadeWidth={34}
              fadeRadius={14}
              containerStyle={styles.heroTitleFade}
              textStyle={[
                styles.heroTitle,
                stageMetrics?.hero?.titleStyle,
                { color: titleColor },
              ]}
              textProps={{ maxFontSizeMultiplier: 1.25 }}
            />
            <View
              style={[styles.heroMetaRow, stageMetrics?.hero?.metaRowStyle]}
            >
              {timeAwayLabel ? (
                <View
                  style={[
                    styles.metaPill,
                    stageMetrics?.hero?.metaPillStyle,
                    { backgroundColor: heroPillSurfaceColor },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={COLORS.brandPrimary}
                  />
                  <Text
                    style={[
                      styles.metaLabel,
                      stageMetrics?.hero?.metaLabelStyle,
                      { color: titleColor },
                    ]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.25}
                  >
                    {timeAwayLabel}
                  </Text>
                </View>
              ) : null}
              {decision.availabilityShowsSkeleton || decision.availabilityLabel ? (
              <View
                style={[
                  styles.metaPill,
                  stageMetrics?.hero?.metaPillStyle,
                  { backgroundColor: heroPillSurfaceColor },
                ]}
              >
                {/* PULLBACK NOTE: availability pill icon */}
                {/* OLD: Ionicons bed-outline → MaterialCommunityIcons hospital-bed */}
                {/* NEW: MaterialCommunityIcons bed — matches IntentOrb/IntentCard bed icon in explore intent */}
                <MaterialCommunityIcons
                  name="bed"
                  size={14}
                  color={COLORS.brandPrimary}
                />
                {decision.availabilityShowsSkeleton ? (
                  <MetaSkeleton style={styles.metaSkeletonShort} />
                ) : (
                  <Text
                    style={[
                      styles.metaLabel,
                      stageMetrics?.hero?.metaLabelStyle,
                      { color: titleColor },
                    ]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.25}
                  >
                    {decision.availabilityLabel}
                  </Text>
                )}
              </View>
              ) : null}
              <View
                style={[
                  styles.metaPill,
                  stageMetrics?.hero?.metaPillStyle,
                  { backgroundColor: heroPillSurfaceColor },
                ]}
              >
                <Ionicons
                  name="cash-outline"
                  size={14}
                  color={COLORS.brandPrimary}
                />
                {decision.priceShowsSkeleton ? (
                  <MetaSkeleton style={styles.metaSkeletonMedium} />
                ) : decision.priceLabel ? (
                  <Text
                    style={[
                      styles.metaLabel,
                      stageMetrics?.hero?.metaLabelStyle,
                      { color: titleColor },
                    ]}
                    numberOfLines={1}
                  >
                    {decision.priceLabel}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </MapStageGlassPanel>
    </View>
  );
}

export function MapBedDecisionRoomSwitchRow({
  roomOptions = [],
  selectedRoomServiceId = null,
  stageMetrics,
  isDarkMode = false,
  onSelectRoom,
  onAdvanceSelectedRoom,
}) {
  if (!Array.isArray(roomOptions) || roomOptions.length < 2) {
    return null;
  }
  const { width } = useWindowDimensions();
  const switchPillWidth =
    stageMetrics?.switch?.bedPillWidth ||
    Math.min(114, Math.max(82, Math.floor((width - 46) / 3.38)));
  const disabledColor = "rgba(148,163,184,0.92)";
  const disabledSurfaceColor = isDarkMode
    ? "rgba(148,163,184,0.12)"
    : "rgba(148,163,184,0.14)";

  return (
    <View style={styles.switchRail}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        style={styles.switchScroller}
        contentContainerStyle={[
          styles.switchRailContent,
          stageMetrics?.switch?.railContentStyle,
        ]}
      >
        {roomOptions.map((option) => {
          const isActive = option?.id === selectedRoomServiceId;
          const isEnabled = option?.enabled !== false;
          const roomVisual = getRoomDecisionVisual(option);
          const inactiveSurfaceColor = toAccentRgba(
            roomVisual.accent,
            isDarkMode ? 0.18 : 0.12,
          );

          return (
            <Pressable
              key={option?.id || option?.title}
              onPress={
                isEnabled
                  ? () =>
                      isActive
                        ? onAdvanceSelectedRoom?.(option)
                        : onSelectRoom?.(option)
                  : undefined
              }
              disabled={!isEnabled}
              style={({ pressed }) => [
                styles.switchPill,
                stageMetrics?.switch?.pillStyle,
                {
                  width: switchPillWidth,
                  backgroundColor: isActive
                    ? COLORS.brandPrimary
                    : isEnabled
                      ? inactiveSurfaceColor
                      : disabledSurfaceColor,
                  opacity: isEnabled ? (pressed ? 0.92 : 1) : 0.48,
                },
              ]}
            >
              <RoomIcon
                roomVisual={roomVisual}
                isActive={isActive}
                size={14}
                color={
                  isActive
                    ? "#FFFFFF"
                    : isEnabled
                      ? roomVisual.accent
                      : disabledColor
                }
              />
              <FadeEndText
                text={option?.title || "Room"}
                fadeColor={
                  isActive
                    ? COLORS.brandPrimary
                    : isEnabled
                      ? inactiveSurfaceColor
                      : disabledSurfaceColor
                }
                fadeWidth={20}
                fadeRadius={10}
                numberOfLines={1}
                containerStyle={styles.switchPillLabelFade}
                textStyle={[
                  styles.switchPillLabel,
                  stageMetrics?.switch?.labelStyle,
                  {
                    color: isActive
                      ? "#FFFFFF"
                      : isEnabled
                        ? roomVisual.accent
                        : disabledColor,
                  },
                ]}
                textProps={{ maxFontSizeMultiplier: 1.15 }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function MapBedDecisionRouteCard({
  decision,
  glassTokens,
  isDarkMode,
  stageMetrics,
  titleColor,
  mutedColor,
  surfaceColor,
  pillSurfaceColor,
  onChangePickup,
}) {
  const routePanel = decision?.routePanel;
  const connectorColor = isDarkMode
    ? "rgba(255,255,255,0.14)"
    : "rgba(15,23,42,0.12)";
  const routeFadeColor =
    surfaceColor ||
    (isDarkMode ? "rgba(18,24,38,0.60)" : "rgba(255,255,255,0.44)");

  return (
    <MapStageGlassPanel
      style={[styles.routeCard, stageMetrics?.route?.cardStyle]}
      backgroundColor={surfaceColor}
      glassTokens={glassTokens}
      isDarkMode={isDarkMode}
    >
      <View style={styles.routeRow}>
        <View style={styles.routeTrack}>
          <View
            style={[styles.routeNode, { backgroundColor: pillSurfaceColor }]}
          >
            <MaterialCommunityIcons
              name="hospital-building"
              size={18}
              color={COLORS.brandPrimary}
            />
          </View>
          <View
            style={[
              styles.routeConnector,
              stageMetrics?.route?.connectorStyle,
              { backgroundColor: connectorColor },
            ]}
          />
          <View
            style={[styles.routeNode, { backgroundColor: pillSurfaceColor }]}
          >
            <Ionicons name="navigate" size={16} color={COLORS.brandPrimary} />
          </View>
        </View>
        <View style={styles.routeStops}>
          <View style={styles.routeStop}>
            <Text
              style={[
                styles.routeStopTitle,
                stageMetrics?.route?.titleStyle,
                { color: titleColor },
              ]}
              numberOfLines={1}
            >
              {routePanel?.originTitle || "Hospital"}
            </Text>
            <RouteMetaLine
              text={routePanel?.originSubtitle || "Receiving hospital"}
              color={mutedColor}
              fadeColor={routeFadeColor}
            />
          </View>
          <View
            style={[styles.routeStopGap, stageMetrics?.route?.stopGapStyle]}
          />
          <View style={styles.routeStop}>
            <Text
              style={[
                styles.routeStopTitle,
                stageMetrics?.route?.titleStyle,
                { color: titleColor },
              ]}
              numberOfLines={1}
            >
              {routePanel?.destinationTitle || "My location"}
            </Text>
            <RouteMetaLine
              text={routePanel?.destinationSubtitle || "Current pickup point"}
              color={mutedColor}
              fadeColor={routeFadeColor}
            />
          </View>
        </View>
        <View style={styles.routeMetrics}>
          <Text
            style={[
              styles.routeMetricPrimary,
              stageMetrics?.route?.metricPrimaryStyle,
              { color: titleColor },
            ]}
            numberOfLines={1}
          >
            {routePanel?.primaryMetric || decision.etaLabel}
          </Text>
          {routePanel?.secondaryMetric ? (
            <Text
              style={[
                styles.routeMetricSecondary,
                stageMetrics?.route?.metricSecondaryStyle,
                { color: mutedColor },
              ]}
              numberOfLines={1}
            >
              {routePanel.secondaryMetric}
            </Text>
          ) : null}
          {typeof onChangePickup === "function" ? (
            <Pressable
              onPress={onChangePickup}
              accessibilityRole="button"
              accessibilityLabel="Change pickup location"
              style={({ pressed }) => [
                styles.routeActionButton,
                pressed ? styles.routeActionButtonPressed : null,
              ]}
            >
              <Ionicons name="open-outline" size={18} color={COLORS.brandPrimary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </MapStageGlassPanel>
  );
}

export function MapBedDecisionSavedTransportCard({
  savedTransport,
  glassTokens,
  isDarkMode,
  stageMetrics,
  titleColor,
  mutedColor,
  surfaceColor,
  pillSurfaceColor,
}) {
  const visualProfile = getAmbulanceVisualProfile({
    tierKey: savedTransport?.tierKey,
    service_type: savedTransport?.serviceType,
    title: savedTransport?.title,
    service_name: savedTransport?.title,
  });

  return (
    <MapStageGlassPanel
      style={[styles.savedTransportCard, stageMetrics?.panel?.cardStyle]}
      backgroundColor={surfaceColor}
      glassTokens={glassTokens}
      isDarkMode={isDarkMode}
    >
      <View style={styles.savedTransportHeader}>
        <View
          style={[
            styles.savedTransportPill,
            { backgroundColor: pillSurfaceColor },
          ]}
        >
          <Text style={styles.savedTransportPillText}>
            {MAP_BED_DECISION_COPY.SAVED_TRANSPORT_STEP}
          </Text>
        </View>
      </View>
      <View style={styles.savedTransportRow}>
        <View
          style={[
            styles.savedTransportIconWrap,
            { backgroundColor: toAccentRgba(visualProfile.accent, 0.12) },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={visualProfile.accent}
          />
        </View>
        <View style={styles.savedTransportCopy}>
          <Text
            style={[
              styles.savedTransportTitle,
              stageMetrics?.expanded?.titleStyle,
              { color: titleColor },
            ]}
          >
            {MAP_BED_DECISION_COPY.SAVED_TRANSPORT_TITLE}
          </Text>
          <Text
            style={[
              styles.savedTransportMeta,
              stageMetrics?.expanded?.metaStyle,
              { color: mutedColor },
            ]}
            numberOfLines={1}
          >
            {[
              savedTransport?.title ||
                MAP_BED_DECISION_COPY.SAVED_TRANSPORT_FALLBACK,
              savedTransport?.priceText || null,
            ]
              .filter(Boolean)
              .join(", ")}
          </Text>
        </View>
      </View>
    </MapStageGlassPanel>
  );
}

// PULLBACK NOTE: UX-A — compact transport status strip for HALF snap
// Replaces full MapBedDecisionSavedTransportCard when sheet is in HALF snap.
// Full card preserved in EXPANDED (rendered by MapBedDecisionStageBase).
export function MapBedDecisionTransportStatusStrip({
  savedTransport,
  titleColor,
  onPress,
}) {
  const visualProfile = getAmbulanceVisualProfile({
    tierKey: savedTransport?.tierKey,
    service_type: savedTransport?.serviceType,
    title: savedTransport?.title,
    service_name: savedTransport?.title,
  });
  const label = savedTransport?.title
    ? `Ambulance confirmed \u2014 ${savedTransport.title}`
    : MAP_BED_DECISION_COPY.SAVED_TRANSPORT_TITLE;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.transportStripRow, { opacity: pressed ? 0.75 : 1 }]}
    >
      <Ionicons
        name="checkmark-circle"
        size={14}
        color={visualProfile.accent}
      />
      <Text
        style={[styles.transportStripLabel, { color: titleColor }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function MapBedDecisionExpandedRoomChoices({
  decision,
  stageMetrics,
  titleColor,
  mutedColor,
  isDarkMode = false,
  onSelectRoom,
}) {
  const alternativeOptions = Array.isArray(decision?.roomOptions)
    ? decision.roomOptions.filter(
        (option) => option?.id !== decision?.recommendedRoom?.id,
      )
    : [];
  if (alternativeOptions.length === 0) {
    return null;
  }

  return (
    <View style={styles.expandedList}>
      {alternativeOptions.map((option) => {
        const isEnabled = option?.enabled !== false;
        const roomVisual = getRoomDecisionVisual(option);
        const imageSource = getHospitalDetailServiceImageSource(option, "room");
        const inactiveSurfaceColor = toAccentRgba(
          roomVisual.accent,
          isDarkMode ? 0.14 : 0.1,
        );
        const metaText = formatRoomMeta(option, null);

        return (
          <Pressable
            key={option?.id || option?.title}
            onPress={isEnabled ? () => onSelectRoom?.(option) : undefined}
            disabled={!isEnabled}
            style={({ pressed }) => [
              styles.expandedRow,
              stageMetrics?.expanded?.rowStyle,
              {
                backgroundColor: inactiveSurfaceColor,
                opacity: isEnabled ? (pressed ? 0.94 : 1) : 0.48,
              },
            ]}
          >
            <View style={styles.expandedLead}>
              <View
                style={[
                  styles.expandedIconWrap,
                  stageMetrics?.expanded?.iconWrapStyle,
                  { backgroundColor: toAccentRgba(roomVisual.accent, 0.12) },
                ]}
              >
                <RoomIcon
                  roomVisual={roomVisual}
                  isActive={false}
                  size={18}
                  color={roomVisual.accent}
                />
              </View>
              <View style={styles.expandedCopy}>
                <Text
                  style={[
                    styles.expandedTitle,
                    stageMetrics?.expanded?.titleStyle,
                    { color: titleColor },
                  ]}
                  numberOfLines={1}
                >
                  {option?.title || "Room"}
                </Text>
                {metaText ? (
                  <Text
                    style={[
                      styles.expandedMeta,
                      stageMetrics?.expanded?.metaStyle,
                      { color: mutedColor },
                    ]}
                    numberOfLines={2}
                  >
                    {metaText}
                  </Text>
                ) : option?.showMetaSkeleton || option?.showPriceSkeleton ? (
                  <View style={styles.expandedMetaSkeletonRow}>
                    {option?.showMetaSkeleton ? (
                      <MetaSkeleton style={styles.expandedMetaSkeletonShort} />
                    ) : null}
                    {option?.showPriceSkeleton ? (
                      <MetaSkeleton style={styles.expandedMetaSkeletonMedium} />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
            {imageSource ? (
              <Image
                source={imageSource}
                resizeMode="contain"
                fadeDuration={0}
                style={[
                  styles.expandedImage,
                  stageMetrics?.expanded?.imageStyle,
                ]}
              />
            ) : null}
            <View style={styles.expandedActionWrap}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={roomVisual.accent}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MapBedDecisionDetailsCard({
  decision,
  glassTokens,
  isDarkMode,
  stageMetrics,
  titleColor,
  mutedColor,
  surfaceColor,
  pillSurfaceColor,
}) {
  const features = Array.isArray(decision?.roomFeatures)
    ? decision.roomFeatures
    : [];
  if (!decision?.roomSummary && features.length === 0) {
    return null;
  }

  return (
    <MapStageGlassPanel
      style={[styles.detailsCard, stageMetrics?.panel?.cardStyle]}
      backgroundColor={surfaceColor}
      glassTokens={glassTokens}
      isDarkMode={isDarkMode}
    >
      <View style={styles.detailsHeader}>
        <View
          style={[styles.detailsPill, { backgroundColor: pillSurfaceColor }]}
        >
          <Text style={styles.detailsPillText}>{decision.confidenceLabel}</Text>
        </View>
      </View>
      {decision.roomSummary ? (
        <Text
          style={[
            styles.detailsSummary,
            stageMetrics?.panel?.summaryStyle,
            { color: titleColor },
          ]}
        >
          {decision.roomSummary}
        </Text>
      ) : null}
      {features.map((feature) => (
        <View key={feature} style={styles.detailsFeatureRow}>
          <View style={styles.detailsFeatureDot} />
          <Text
            style={[
              styles.detailsFeatureText,
              stageMetrics?.panel?.featureStyle,
              { color: mutedColor },
            ]}
          >
            {feature}
          </Text>
        </View>
      ))}
    </MapStageGlassPanel>
  );
}

export function MapBedDecisionEmptyState({
  titleColor,
  mutedColor,
  surfaceColor,
  glassTokens,
  isDarkMode,
}) {
  return (
    <MapStageGlassPanel
      style={styles.emptyCard}
      backgroundColor={surfaceColor}
      glassTokens={glassTokens}
      isDarkMode={isDarkMode}
    >
      <Text style={[styles.emptyTitle, { color: titleColor }]}>
        {MAP_BED_DECISION_COPY.NO_HOSPITAL_TITLE}
      </Text>
      <Text style={[styles.emptyBody, { color: mutedColor }]}>
        {MAP_BED_DECISION_COPY.NO_HOSPITAL_BODY}
      </Text>
    </MapStageGlassPanel>
  );
}

export function MapBedDecisionFooter({
  modalContainedStyle,
  canConfirm = true,
  canBrowseHospitals,
  careIntent = "bed",
  isAdvancing = false,
  stageMetrics,
  onConfirm,
  onOpenHospitals,
}) {
  const usesRecoveryAction = !canConfirm && canBrowseHospitals;
  const primaryLabel = isAdvancing
    ? MAP_BED_DECISION_COPY.CONTINUING_CTA
    : canConfirm
      ? MAP_BED_DECISION_COPY.CONFIRM_BED_CTA
      : usesRecoveryAction
        ? MAP_BED_DECISION_COPY.RECOVER_CTA
        : MAP_BED_DECISION_COPY.UNAVAILABLE_CTA;
  const primaryPress = canConfirm
    ? onConfirm
    : usesRecoveryAction
      ? onOpenHospitals
      : undefined;
  const primaryDisabled = isAdvancing || (!canConfirm && !usesRecoveryAction);
  const hasBrowseAction = canBrowseHospitals && canConfirm;
  const buttonHeight = stageMetrics?.footer?.buttonHeight || 50;
  const buttonRadius =
    stageMetrics?.footer?.buttonRadius || Math.round(buttonHeight / 2);

  return (
    // PULLBACK NOTE: UX bed footer — horizontal row CTA, no max width constraint
    // OLD: modalContainedStyle applied (maxWidth constraint in modal mode)
    // NEW: no modalContainedStyle on footer, allows full width without overflow
    <View
      style={[
        styles.footerDock,
        stageMetrics?.footer?.dockStyle,
      ]}
    >
      <View style={styles.footerRow}>
        {hasBrowseAction ? (
          <Pressable
            onPress={onOpenHospitals}
            style={({ pressed }) => [
              styles.secondaryAction,
              {
                minHeight: buttonHeight,
                borderRadius: buttonRadius,
                opacity: pressed ? 0.88 : 1,
                backgroundColor: "rgba(134,16,14,0.08)",
              },
            ]}
          >
            <Text
              style={styles.secondaryActionText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {MAP_BED_DECISION_COPY.OTHER_HOSPITALS_CTA}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={COLORS.brandPrimary}
            />
          </Pressable>
        ) : null}
        <EntryActionButton
          label={primaryLabel}
          onPress={primaryPress}
          variant={canConfirm || usesRecoveryAction ? "primary" : "secondary"}
          height={buttonHeight}
          radius={buttonRadius}
          fullWidth={!hasBrowseAction}
          minWidth={hasBrowseAction ? 0 : undefined}
          contentPaddingHorizontal={hasBrowseAction ? 14 : 20}
          disabled={primaryDisabled}
          loading={isAdvancing}
          style={hasBrowseAction ? styles.primaryButtonFlex : styles.primaryButton}
        />
      </View>
    </View>
  );
}
