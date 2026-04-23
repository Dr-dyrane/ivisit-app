import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { COLORS } from "../../../../../constants/colors";
import MapHeaderIconButton from "../../shared/MapHeaderIconButton";
import { getDetailTone, toTitleCaseLabel } from "../mapTracking.presentation";
import { TRACKING_TRIAGE_STEP_FLOOR } from "../useMapTrackingRuntime";
import styles from "../mapTracking.styles";

function resolveCtaIconName(action = {}) {
  const iconByKey = {
    info: "medkit",
    bed: "bed",
    home: "map",
    share: "share",
    arrived: "navigate-circle",
    "check-in": "clipboard",
    "complete-ambulance": "checkmark-circle",
    "complete-bed": "checkmark-circle",
  };
  if (iconByKey[action.key]) return iconByKey[action.key];
  const raw = String(action.iconName || "").trim();
  if (!raw) return "ellipse";
  if (raw.endsWith("-outline")) return raw.replace("-outline", "");
  return raw;
}

function renderCtaIcon(action, iconColor, isDarkMode = false) {
  const iconName = resolveCtaIconName(action);
  if (action?.iconFamily === "material-community") {
    return <MaterialCommunityIcons name={iconName} size={32} color={iconColor} />;
  }
  if (action?.key === "share") {
    return (
      <View style={styles.shareEtaIconStack}>
        <MaterialCommunityIcons
          name="account-circle-outline"
          size={34}
          color={iconColor}
        />
        <View style={[styles.shareEtaIconBadge, { backgroundColor: iconColor }]}>
          <MaterialCommunityIcons
            name="plus-thick"
            size={10}
            color={isDarkMode ? "#0F172A" : "#FFFFFF"}
          />
        </View>
      </View>
    );
  }
  return <Ionicons name={iconName} size={32} color={iconColor} />;
}

export function MapTrackingTopSlot({
  title,
  subtitle,
  titleColor,
  mutedColor,
  actionSurfaceColor,
  triageSurfaceColor,
  triageIconColor,
  triageIconName = "medkit",
  triageRingColor,
  triageTrackColor,
  onToggle,
  onOpenTriage,
  showTriage = false,
  triageComplete = false,
  triageProgress = 0,
  showToggle = true,
  toggleIconName = "chevron-up",
  toggleAccessibilityLabel = "Toggle tracking sheet size",
}) {
  const clampedProgress = Math.max(0, Math.min(1, Number(triageProgress) || 0));
  const visualProgress = triageComplete
    ? 1
    : Math.max(1 / TRACKING_TRIAGE_STEP_FLOOR, clampedProgress);
  const ringProgress = useRef(new Animated.Value(visualProgress)).current;
  const breathProgress = useRef(new Animated.Value(0)).current;
  const ringSize = 38;
  const strokeWidth = 2.5;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  useEffect(() => {
    Animated.timing(ringProgress, {
      toValue: visualProgress,
      duration: 420,
      useNativeDriver: false,
    }).start();
  }, [ringProgress, visualProgress]);

  useEffect(() => {
    if (triageComplete) {
      breathProgress.setValue(0);
      return undefined;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathProgress, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(breathProgress, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [breathProgress, triageComplete]);

  const ringDashOffset = ringProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });
  const breathScale = breathProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });

  const rightAction = showTriage ? (
    <Animated.View
      style={[
        styles.triageProgressWrap,
        { transform: [{ scale: breathScale }] },
      ]}
    >
      <Svg width={ringSize} height={ringSize} style={styles.triageProgressSvg}>
        <Circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke={
            triageTrackColor ||
            (triageComplete ? "rgba(22,163,74,0.35)" : "rgba(148,163,184,0.34)")
          }
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke={triageRingColor || (triageComplete ? "#16A34A" : COLORS.brandPrimary)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={ringDashOffset}
          transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
        />
      </Svg>
      <MapHeaderIconButton
        onPress={onOpenTriage}
        accessibilityLabel="Update your info"
        backgroundColor={triageSurfaceColor || actionSurfaceColor}
        color={triageIconColor || titleColor}
        iconName={triageIconName}
        pressableStyle={styles.topSlotAction}
        style={styles.topSlotActionButton}
      />
    </Animated.View>
  ) : (
    <View style={styles.topSlotSpacer} />
  );

  return (
    <View style={styles.topSlot}>
      <View style={[styles.topSlotSide, styles.topSlotSideLeft]}>
        {showToggle ? (
          <MapHeaderIconButton
            onPress={onToggle}
            accessibilityLabel={toggleAccessibilityLabel}
            backgroundColor={actionSurfaceColor}
            color={titleColor}
            iconName={toggleIconName}
            pressableStyle={styles.topSlotAction}
            style={styles.topSlotActionButton}
          />
        ) : (
          <View style={styles.topSlotSpacer} />
        )}
      </View>
      <View style={styles.topSlotCopy}>
        <Text numberOfLines={1} style={[styles.topSlotTitle, { color: titleColor }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[styles.topSlotSubtitle, { color: mutedColor }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.topSlotSide, styles.topSlotSideRight]}>{rightAction}</View>
    </View>
  );
}

export function TrackingTeamHeroCard({
  title,
  subtitle,
  rightMeta,
  stateLabel,
  statePillBackgroundColor,
  stateTextColor,
  progressValue = 0,
  avatarIcon = "person",
  backgroundColor,
  progressColor,
  titleColor,
  mutedColor,
}) {
  const clampedProgress = Math.max(0, Math.min(1, Number(progressValue) || 0));
  return (
    <View style={[styles.teamHeroCard, { backgroundColor }]}>
      <View
        pointerEvents="none"
        style={[
          styles.teamHeroProgressFill,
          {
            width: `${clampedProgress * 100}%`,
            backgroundColor: progressColor,
          },
        ]}
      />
      <View style={styles.teamHeroContent}>
        <View style={styles.teamHeroRow}>
          <View style={styles.teamHeroAvatar}>
            <Ionicons name={avatarIcon} size={20} color="#FFFFFF" />
          </View>
          <View style={styles.teamHeroCopy}>
            <Text numberOfLines={1} style={[styles.teamHeroTitle, { color: titleColor }]}>
              {title || "--"}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={[styles.teamHeroSubtitle, { color: mutedColor }]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {rightMeta ? (
            <View style={styles.teamHeroRight}>
              <Text
                numberOfLines={1}
                style={[styles.teamHeroRightText, { color: mutedColor }]}
              >
                {rightMeta}
              </Text>
              {stateLabel ? (
                <View
                  style={[
                    styles.teamHeroStatePill,
                    statePillBackgroundColor
                      ? { backgroundColor: statePillBackgroundColor }
                      : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.teamHeroStateText,
                      { color: stateTextColor || mutedColor },
                    ]}
                  >
                    {stateLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function TrackingCtaButton({
  action,
  iconColor,
  labelColor,
  isDarkMode = false,
  showDivider = false,
  isGrouped = false,
}) {
  return (
    <View>
      <Pressable
        onPress={action.onPress}
        style={({ pressed }) => [
          styles.ctaButton,
          isGrouped ? styles.ctaButtonGrouped : null,
          pressed ? styles.ctaButtonPressed : null,
        ]}
      >
        {action.loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : (
          <>
            {renderCtaIcon(action, iconColor, isDarkMode)}
            <Text numberOfLines={1} style={[styles.ctaButtonText, { color: labelColor }]}>
              {action.label}
            </Text>
          </>
        )}
      </Pressable>
      {showDivider ? <View style={styles.ctaDivider} /> : null}
    </View>
  );
}

export function TrackingRouteCard({
  elevatedSurfaceColor,
  routeCardRadius,
  routeGradientColors,
  serviceLabel,
  trackingKind,
  toneColors,
  requestLabel,
  connectorTrackColor,
  connectorProgressColor,
  routeVisualProgress,
  hospitalIconSurfaceColor,
  titleColor,
  hospitalName,
  hospitalAddress,
  routeFadeColors,
  mutedColor,
  pickupIconSurfaceColor,
  pickupLabel,
  pickupDetail,
}) {
  return (
    <View
      style={[
        styles.routeCard,
        { backgroundColor: elevatedSurfaceColor, borderRadius: routeCardRadius },
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={routeGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.routeCardGradient}
      />

      <View style={styles.routeHeader}>
        <View style={[styles.servicePill, { backgroundColor: toneColors.surface }]}>
          <Ionicons
            name={trackingKind === "bed" ? "bed-outline" : "car-outline"}
            size={15}
            color={toneColors.icon}
          />
          <Text
            numberOfLines={1}
            style={[styles.servicePillText, { color: toneColors.text }]}
          >
            {serviceLabel}
          </Text>
        </View>
        {requestLabel ? (
          <View style={[styles.requestPill, { backgroundColor: toneColors.surface }]}>
            <Ionicons name="receipt-outline" size={15} color={toneColors.icon} />
            <Text
              numberOfLines={1}
              style={[styles.requestPillText, { color: toneColors.text }]}
            >
              {requestLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.stopList}>
        <View style={styles.stopConnectorWrap}>
          <View style={[styles.stopConnector, { backgroundColor: connectorTrackColor }]} />
          <View
            style={[
              styles.stopConnectorProgress,
              {
                backgroundColor: connectorProgressColor,
                height: `${Math.max(0, Math.min(100, routeVisualProgress * 100))}%`,
              },
            ]}
          />
        </View>

        <View style={styles.stopRow}>
          <View
            style={[styles.stopIconWrap, { backgroundColor: hospitalIconSurfaceColor }]}
          >
            <Ionicons name="business-outline" size={18} color={titleColor} />
          </View>
          <View style={styles.stopCopyWrap}>
            <View style={styles.stopCopy}>
              <Text style={[styles.stopLabel, { color: mutedColor }]}>Hospital</Text>
              <Text numberOfLines={1} style={[styles.stopTitle, { color: titleColor }]}>
                {hospitalName}
              </Text>
              {hospitalAddress ? (
                <Text numberOfLines={1} style={[styles.stopSubtitle, { color: mutedColor }]}>
                  {hospitalAddress}
                </Text>
              ) : null}
            </View>
            <LinearGradient
              pointerEvents="none"
              colors={routeFadeColors}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.stopFade}
            />
          </View>
        </View>

        <View style={styles.stopRow}>
          <View
            style={[styles.stopIconWrap, { backgroundColor: pickupIconSurfaceColor }]}
          >
            <Ionicons name="navigate" size={18} color={toneColors.icon} />
          </View>
          <View style={styles.stopCopyWrap}>
            <View style={styles.stopCopy}>
              <Text style={[styles.stopLabel, { color: mutedColor }]}>Pickup</Text>
              <Text numberOfLines={1} style={[styles.stopTitle, { color: titleColor }]}>
                {pickupLabel}
              </Text>
              {pickupDetail ? (
                <Text numberOfLines={1} style={[styles.stopSubtitle, { color: mutedColor }]}>
                  {pickupDetail}
                </Text>
              ) : null}
            </View>
            <LinearGradient
              pointerEvents="none"
              colors={routeFadeColors}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.stopFade}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function renderRatingStars(value, color, mutedColor) {
  const numeric = Number(value);
  const clamped = Number.isFinite(numeric) ? Math.max(0, Math.min(5, numeric)) : 0;
  const stars = [];
  for (let i = 1; i <= 5; i += 1) {
    let name = "star-outline";
    let starColor = mutedColor;
    if (clamped >= i) {
      name = "star";
      starColor = color;
    } else if (clamped >= i - 0.5) {
      name = "star-half";
      starColor = color;
    }
    stars.push(<Ionicons key={i} name={name} size={14} color={starColor} />);
  }
  return <View style={styles.detailRatingStars}>{stars}</View>;
}

export function TrackingDetailsCard({
  surfaceColor,
  detailCardRadius,
  detailGradientColors,
  mutedColor,
  requestSurfaceColor,
  trackingDetailRows,
  isDarkMode,
  titleColor,
  headerLabel = "Details",
  valueNumberOfLines = 1,
  collapsible = false,
  collapsed = false,
  onToggleCollapsed = null,
  ratingStarColor = null,
}) {
  const HeaderTag = collapsible ? Pressable : View;
  const headerProps = collapsible
    ? {
        onPress: onToggleCollapsed,
        accessibilityRole: "button",
        accessibilityState: { expanded: !collapsed },
        hitSlop: 8,
      }
    : {};
  const starColor = ratingStarColor || titleColor;
  return (
    <View
      style={[
        styles.detailCard,
        { backgroundColor: surfaceColor, borderRadius: detailCardRadius },
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={detailGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.detailCardGradient}
      />
      <HeaderTag style={styles.detailHeaderRow} {...headerProps}>
        <Text style={[styles.detailHeader, { color: mutedColor }]}>{headerLabel}</Text>
        {collapsible ? (
          <View style={styles.detailHeaderChevron}>
            <Ionicons
              name={collapsed ? "chevron-down" : "chevron-up"}
              size={16}
              color={mutedColor}
            />
          </View>
        ) : null}
      </HeaderTag>
      {collapsible && collapsed ? null : (
        <View style={styles.detailList}>
          {trackingDetailRows.map((detail, index) => {
            const tone = getDetailTone(detail.label, isDarkMode);
            const isRating = detail.kind === "rating";
            const starsNode = isRating
              ? renderRatingStars(detail.ratingValue, starColor, mutedColor)
              : null;
            return (
              <View
                key={`${detail.label}-${index}`}
                style={[styles.detailRow, { backgroundColor: requestSurfaceColor }]}
              >
                <View style={styles.detailLeading}>
                  <View
                    style={[styles.detailIconWrap, { backgroundColor: tone.surface }]}
                  >
                    <Ionicons
                      name={detail.icon || "information-circle-outline"}
                      size={14}
                      color={tone.icon}
                    />
                  </View>
                  <Text style={[styles.detailLabel, { color: mutedColor }]}>
                    {detail.label}
                  </Text>
                </View>
                {isRating ? (
                  starsNode
                ) : (
                  <Text
                    numberOfLines={detail.valueNumberOfLines || valueNumberOfLines}
                    style={[styles.detailValue, { color: titleColor }]}
                  >
                    {detail.value}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function TrackingBottomActionButton({
  bottomAction,
  isBottomCompletionAction,
  bottomActionGradientColors,
  bottomActionTextColor,
  bottomActionSpinnerColor,
}) {
  if (!bottomAction) return null;

  return (
    <View style={styles.cancelCtaWrap}>
      <Pressable
        onPress={bottomAction.onPress}
        disabled={bottomAction.loading}
        style={({ pressed }) => [
          styles.cancelCtaButton,
          isBottomCompletionAction
            ? styles.cancelCtaButtonPrimary
            : styles.cancelCtaButtonSecondary,
          pressed ? styles.ctaButtonPressed : null,
        ]}
      >
        <LinearGradient
          colors={bottomActionGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cancelCtaFill}
        >
          <View
            pointerEvents="none"
            style={[
              styles.cancelCtaHighlight,
              { opacity: isBottomCompletionAction ? 0.08 : 0.05 },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.cancelCtaBottomShade,
              { opacity: isBottomCompletionAction ? 0.14 : 0.06 },
            ]}
          />
          {bottomAction.loading ? (
            <ActivityIndicator size="small" color={bottomActionSpinnerColor} />
          ) : (
            <Text style={[styles.cancelCtaText, { color: bottomActionTextColor }]}>
              {toTitleCaseLabel(bottomAction.label)}
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}
