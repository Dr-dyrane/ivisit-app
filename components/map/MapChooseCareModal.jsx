import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import useResponsiveSurfaceMetrics from "../../hooks/ui/useResponsiveSurfaceMetrics";
import MapModalShell from "./surfaces/MapModalShell";
import { MAP_SHEET_SNAP_STATES } from "./core/mapSheet.constants";
import { getMapSheetTokens } from "./tokens/mapSheetTokens";
import {
  GLASS_SURFACE_VARIANTS,
  getGlassSurfaceTokens,
} from "../../constants/surfaces";
import {
  PROVIDER_TYPES,
  EXPLORE_CATEGORY_META,
  EXPLORE_PROVIDER_TYPES,
} from "../../constants/providerTypes";

const squircle = (radius) => ({
  borderRadius: radius,
  borderCurve: "continuous",
});

function CareBlade({
  colors,
  iconName,
  title,
  subtext,
  onPress,
  titleColor,
  mutedColor,
  responsiveStyles,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.careBlade, responsiveStyles.careBlade]}
    >
      <View style={styles.bladeTop}>
        <LinearGradient
          colors={colors}
          start={{ x: 0.18, y: 0.18 }}
          end={{ x: 0.82, y: 0.9 }}
          style={[styles.bladeIconWrap, responsiveStyles.bladeIconWrap]}
        >
          <MaterialCommunityIcons name={iconName} size={22} color="#FFFFFF" />
        </LinearGradient>
        <View style={[styles.bladeChevronWrap, { backgroundColor: "rgba(128,128,128,0.12)" }]}>
          <Ionicons name="chevron-forward" size={15} color={mutedColor} />
        </View>
      </View>
      <View style={styles.bladeCopy}>
        <Text
          style={[
            styles.bladeTitle,
            responsiveStyles.bladeTitle,
            { color: titleColor },
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtext ? (
          <Text
            style={[
              styles.bladeSubtext,
              responsiveStyles.bladeSubtext,
              { color: mutedColor },
            ]}
            numberOfLines={2}
          >
            {subtext}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// EXP-5A: Explore category cards — non-emergency provider categories.
// Hospital is excluded — it surfaces through the emergency section above.
// Two subtaxonomy rails by access urgency:
//   RAIL_DIRECT  — urgent/accessible care (high-frequency, walk-in)
//   RAIL_SPECIALIST — focused/specialist care (condition-specific)
const EXPLORE_RAIL_DIRECT = [
  PROVIDER_TYPES.PHARMACY,
  PROVIDER_TYPES.URGENT_CARE,
  PROVIDER_TYPES.CLINIC,
  PROVIDER_TYPES.LAB,
];
const EXPLORE_RAIL_SPECIALIST = [
  PROVIDER_TYPES.RADIOLOGY,
  PROVIDER_TYPES.MENTAL_HEALTH,
  PROVIDER_TYPES.WOMENS_CARE,
  PROVIDER_TYPES.PEDIATRICS,
];

const EXPLORE_CARD_WIDTH = 148;
const EXPLORE_CARD_HEIGHT = 172;
const EXPLORE_CARD_GAP = 10;
// PULLBACK NOTE: UI-REGRESSION-4 — remove peek padding for smooth edge-to-edge flow
// OLD: EXPLORE_RAIL_PEEK = 28 (cards split before edge)
// NEW: paddingRight = 0 (last card touches modal edge)
// EXP-5B: emergency blade icon compressed — blades become tighter action lane
const BLADE_ICON_SIZE = 38;

// EXP-5B: Card anatomy — gradient orb icon tile → muted subtext → category title → action pill.
// PULLBACK NOTE: UI-REGRESSION-4 — reuse 3D orb gradient design from CareBlade, muted subtext
// OLD: flat icon tile + category-colored spatial copy
// NEW: gradient orb (matches emergency section) + muted iVisit subtext
function ExploreCategoryCard({ providerType, onPress, tokens, isDarkMode, cardSurface }) {
  const meta = EXPLORE_CATEGORY_META[providerType];
  if (!meta) return null;
  // Reuse gradient orb colors from category meta (same pattern as CareBlade)
  const orbColors = meta.orbColors || [meta.markerTint, meta.markerTint];
  // Per-category ambient fog — higher alpha on Android (no blur compositor)
  const isAndroid = Platform.OS === "android";
  const fogStart = meta.markerTint + (isDarkMode ? (isAndroid ? "28" : "1A") : (isAndroid ? "1A" : "0F"));
  const fogEnd = meta.markerTint + "00";
  return (
    <Pressable
      onPress={() => onPress?.(providerType)}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label} — ${meta.spatialCopy}`}
      style={({ pressed }) => [
        styles.exploreCategoryCard,
        { backgroundColor: cardSurface },
        pressed ? styles.exploreCategoryCardPressed : null,
      ]}
    >
      {/* ambient fog — category tint at very low opacity, top-left origin */}
      <LinearGradient
        colors={[fogStart, fogEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.exploreCategoryFog}
        pointerEvents="none"
      />
      {/* PULLBACK NOTE: UI-REGRESSION-4 — gradient orb icon (matches CareBlade) */}
      <LinearGradient
        colors={orbColors}
        start={{ x: 0.18, y: 0.18 }}
        end={{ x: 0.82, y: 0.9 }}
        style={styles.exploreCategoryIconTile}
      >
        <MaterialCommunityIcons
          name={meta.iconName}
          size={20}
          color="#FFFFFF"
        />
      </LinearGradient>
      <View style={styles.exploreCategoryCopy}>
        {/* spatial awareness copy — muted iVisit color, not category tint */}
        <Text
          style={[styles.exploreCategorySpatial, { color: tokens.mutedText }]}
          numberOfLines={1}
        >
          {meta.spatialCopy}
        </Text>
        <Text
          style={[styles.exploreCategoryTitle, { color: tokens.titleColor }]}
          numberOfLines={2}
        >
          {meta.label}
        </Text>
      </View>
      {/* action pill — per-category emotional language */}
      <View style={[styles.exploreCategoryActionPill, { backgroundColor: tokens.mutedCardSurface }]}>
        <Text style={[styles.exploreCategoryActionText, { color: tokens.mutedText }]}>
          {meta.actionLabel}
        </Text>
        <Ionicons name="chevron-forward" size={11} color={tokens.mutedText} />
      </View>
    </Pressable>
  );
}

// EXP-5A: Horizontal rail — single row of category cards
function ExploreCategoryRail({ categories, onExploreCare, tokens, isDarkMode, cardSurface }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToAlignment="start"
      snapToInterval={EXPLORE_CARD_WIDTH + EXPLORE_CARD_GAP}
      contentContainerStyle={[
        styles.exploreCategoryRailContent,
        { gap: EXPLORE_CARD_GAP },
      ]}
    >
      {categories.map((providerType) => (
        <ExploreCategoryCard
          key={providerType}
          providerType={providerType}
          onPress={onExploreCare}
          tokens={tokens}
          isDarkMode={isDarkMode}
          cardSurface={cardSurface}
        />
      ))}
    </ScrollView>
  );
}

export default function MapChooseCareModal({
  visible,
  onClose,
  onChooseCare,
  onBookVisit,
  onExploreCare,
}) {
  const { isDarkMode } = useTheme();
  const viewportMetrics = useResponsiveSurfaceMetrics({
    presentationMode: "modal",
  });
  // EXP-5A/5B: explicit Platform.OS — matches established pattern (MapServiceDetailStageBase)
  const tokens = useMemo(
    () => getMapSheetTokens({ isDarkMode, platform: Platform.OS }),
    [isDarkMode],
  );
  // Platform-aware card surface: Android gets opaque ACTION surface (no blur),
  // iOS/web get semi-transparent strongCardSurface (blur compositor handles frosting).
  // Pattern: constants/surfaces.js GLASS_SURFACE_VARIANTS.ACTION
  const cardSurface = useMemo(() => {
    if (Platform.OS !== "android") return tokens.strongCardSurface;
    const glass = getGlassSurfaceTokens({
      isDarkMode,
      variant: GLASS_SURFACE_VARIANTS.ACTION,
      platform: "android",
    });
    return glass.surfaceColor;
  }, [isDarkMode, tokens.strongCardSurface]);
  const titleColor = tokens.titleColor;
  const mutedColor = tokens.mutedText;
  const responsiveStyles = useMemo(() => {
    return {
      content: {
        paddingBottom: Math.max(32, viewportMetrics.insets.sectionGap),
        gap: viewportMetrics.insets.largeGap,
      },
      careBlade: {},
      bladeIconWrap: {
        width: BLADE_ICON_SIZE,
        height: BLADE_ICON_SIZE,
        borderRadius: Math.round(BLADE_ICON_SIZE / 2),
      },
      bladeTitle: {
        fontSize: Math.max(13, viewportMetrics.type.title - 4),
        lineHeight: Math.max(17, viewportMetrics.type.titleLineHeight - 5),
      },
      bladeSubtext: {
        fontSize: Math.max(11, viewportMetrics.type.caption - 1),
        lineHeight: viewportMetrics.type.captionLineHeight,
      },
    };
  }, [viewportMetrics]);
  const [modalSnapState, setModalSnapState] = useState(MAP_SHEET_SNAP_STATES.EXPANDED);
  const isModalExpanded = modalSnapState === MAP_SHEET_SNAP_STATES.EXPANDED;
  const hasExploreSection = typeof onExploreCare === "function";

  useEffect(() => {
    if (visible) {
      setModalSnapState(MAP_SHEET_SNAP_STATES.EXPANDED);
    }
  }, [visible]);

  const careOptions = useMemo(() => {
    const options = [
      {
        colors: ["#F97316", "#DC2626"],
        iconName: "ambulance",
        title: "Ambulance",
        subtext: "Fast transport nearby",
        onPress: () => onChooseCare?.("ambulance"),
      },
      {
        colors: ["#38BDF8", "#2563EB"],
        iconName: "bed",
        title: "Bed space",
        subtext: "Available beds nearby",
        onPress: () => onChooseCare?.("bed"),
      },
      {
        colors: ["#14B8A6", "#0F766E"],
        iconName: "hospital-box",
        title: "Ambulance + bed",
        subtext: "Transport and admission",
        onPress: () => onChooseCare?.("both"),
      },
    ];

    if (typeof onBookVisit === "function") {
      options.push({
        colors: ["#F59E0B", "#EA580C"],
        iconName: "calendar-check",
        title: "Book a visit",
        subtext: "Clinic or telehealth care",
        onPress: () => onBookVisit(),
      });
    }

    return options;
  }, [onBookVisit, onChooseCare]);

  return (
    <MapModalShell
      visible={visible}
      onClose={onClose}
      title="Choose care"
      headerLayout="leading"
      defaultSnapState={MAP_SHEET_SNAP_STATES.EXPANDED}
      minHeightRatio={hasExploreSection ? 0.88 : 0.78}
      contentContainerStyle={[styles.content, responsiveStyles.content]}
      snapState={modalSnapState}
      onSnapStateChange={setModalSnapState}
    >
      {/* ── Emergency section label ────────────────────────────────── */}
      {hasExploreSection ? (
        <Text style={[styles.sectionLabel, { color: mutedColor }]}>
          Emergency now
        </Text>
      ) : null}

      {/* ── Emergency care blades — 2×2 grid ─────────────────────── */}
      <View style={styles.bladeGrid}>
        {careOptions.map((item) => (
          <View
            key={item.title}
            style={[
              styles.bladeSurface,
              styles.bladeGridCell,
              {
                backgroundColor: cardSurface,
                borderRadius: viewportMetrics.radius.card,
              },
            ]}
          >
            <CareBlade
              {...item}
              titleColor={titleColor}
              mutedColor={mutedColor}
              responsiveStyles={responsiveStyles}
            />
          </View>
        ))}
      </View>

      {/* ── Explore Nearby Care section ───────────────────────────── */}
      {hasExploreSection ? (
        <View style={styles.exploreSection}>
          <View style={styles.exploreSectionHeader}>
            <Text style={[styles.sectionLabel, { color: mutedColor }]}>
              Explore care
            </Text>
            {!isModalExpanded ? (
              <Pressable
                onPress={() => setModalSnapState(MAP_SHEET_SNAP_STATES.EXPANDED)}
                style={[styles.expandSheetOrb, { backgroundColor: "rgba(128,128,128,0.12)" }]}
                accessibilityLabel="Expand sheet"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-down" size={15} color={mutedColor} />
              </Pressable>
            ) : null}
          </View>
          {/* EXP-5A: two subtaxonomy rails — direct care + specialist care */}
          <View style={styles.exploreRailGroup}>
            <Text style={[styles.exploreRailLabel, { color: mutedColor }]}>Direct care</Text>
            <ExploreCategoryRail
              categories={EXPLORE_RAIL_DIRECT}
              onExploreCare={onExploreCare}
              tokens={tokens}
              isDarkMode={isDarkMode}
              cardSurface={cardSurface}
            />
          </View>
          <View style={styles.exploreRailGroup}>
            <Text style={[styles.exploreRailLabel, { color: mutedColor }]}>Specialist care</Text>
            <ExploreCategoryRail
              categories={EXPLORE_RAIL_SPECIALIST}
              onExploreCare={onExploreCare}
              tokens={tokens}
              isDarkMode={isDarkMode}
              cardSurface={cardSurface}
            />
          </View>
        </View>
      ) : null}
    </MapModalShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
    paddingBottom: 32,
    gap: 18,
  },
  bladeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bladeGridCell: {
    width: "48%",
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: "48%",
  },
  bladeSurface: {
    ...squircle(24),
  },
  careBlade: {
    flexDirection: "column",
    alignItems: "flex-start",
    ...squircle(24),
    padding: 14,
    minHeight: 108,
  },
  bladeTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  bladeChevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  bladeIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  bladeCopy: {
    flex: 1,
    width: "100%",
  },
  bladeTitle: {
    fontWeight: "700",
  },
  bladeSubtext: {
    fontWeight: "400",
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  exploreSection: {
    gap: 14,
  },
  exploreRailGroup: {
    gap: 8,
  },
  exploreRailLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    paddingHorizontal: 2,
  },
  exploreSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expandSheetOrb: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  // EXP-5A: rail container — negative horizontal margin so cards bleed to sheet edge
  exploreCategoryRailContent: {
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  // EXP-5B: card — overflow hidden so fog gradient clips to squircle
  exploreCategoryCard: {
    width: EXPLORE_CARD_WIDTH,
    height: EXPLORE_CARD_HEIGHT,
    borderRadius: 30,
    borderCurve: "continuous",
    padding: 14,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  // ambient fog fills card, clipped by overflow:hidden
  exploreCategoryFog: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
  },
  exploreCategoryCardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.996 }],
  },
  // icon tile — tinted circle, markerTint at 0x18 alpha
  exploreCategoryIconTile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  exploreCategoryCopy: {
    flex: 1,
    gap: 2,
    marginTop: 8,
  },
  // spatial awareness text — uses markerTint as color (done inline)
  exploreCategorySpatial: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  exploreCategoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 2,
  },
  // action pill — mutedCardSurface, matches hospitalCardCta pattern
  exploreCategoryActionPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  exploreCategoryActionText: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
  },
});
