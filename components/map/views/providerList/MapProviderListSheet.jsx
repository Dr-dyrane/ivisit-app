// components/map/views/providerList/MapProviderListSheet.jsx
//
// EXPLORE-CARE-01 — EXP-6B: Provider List Visual Identity Recovery
// Shell removed: now pure content, hosted by MapProviderListStageBase via MapSheetShell
//
// Restored from EXP-6B audit:
//   - Liquid glass SheetIconTile (Pass A)
//   - Icon-anchored meta chips, platform-aware surfaces, squircle geometry (Pass B)
//   - Per-category capability filter rail from CATEGORY_CAPABILITY_TAGS (Pass C)
//   - Per-category emotional identity, chevron audit, selection state (Pass D)
//
// Props:
//   providerCategory  - PROVIDER_TYPES value (e.g. 'pharmacy')
//   location          - { latitude, longitude }
//   onSelectProvider  - called with a provider row when the user taps a card
//   selectedProviderId - highlights the matching card

import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useNearbyProviders } from "../../../../hooks/emergency/useNearbyProviders";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";

// ─── Smart subtitle — mirrors buildHospitalSubtitle from mapHospitalList.helpers.js ──

function buildProviderSubtitle(provider) {
  const locality = [provider?.city, provider?.region].filter(Boolean).join(", ").trim();
  if (locality) return locality;
  const street = [provider?.streetNumber, provider?.street].filter(Boolean).join(" ").trim();
  if (street) return street;
  return provider?.address || provider?.formattedAddress || "Available nearby";
}

// ─── Travel-time bucketing ────────────────────────────────────────────────────
// Assumes avg urban speed ~30 km/h → 0.5 km/min.

const SPEED_KM_PER_MIN = 0.5;

function estimateTravelMin(distanceKm) {
  // PULLBACK NOTE: EXP-6B — guard 0 as unknown (service fallback was 0, not null)
  // OLD: distanceKm < 0 only — 0 produced '0 min' display
  // NEW: distanceKm <= 0 returns null — renders '--' instead
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  return distanceKm / SPEED_KM_PER_MIN;
}

const TIME_BUCKETS = [
  { key: "under5",   label: "Under 5 min",  minMin: 0,  maxMin: 5  },
  { key: "5to10",    label: "5–10 min",      minMin: 5,  maxMin: 10 },
  { key: "10to20",   label: "10–20 min",     minMin: 10, maxMin: 20 },
  { key: "over20",   label: "20+ min",       minMin: 20, maxMin: Infinity },
];

function bucketProviders(providers) {
  const result = {};
  TIME_BUCKETS.forEach((b) => { result[b.key] = []; });

  providers.forEach((p) => {
    const km = p?.distanceKm ?? (Number.isFinite(p?.distance) ? p.distance : null);
    const mins = estimateTravelMin(km);
    if (mins === null) {
      result.over20.push(p);
      return;
    }
    const bucket = TIME_BUCKETS.find((b) => mins >= b.minMin && mins < b.maxMin);
    if (bucket) result[bucket.key].push(p);
  });

  return TIME_BUCKETS
    .map((b) => ({ ...b, providers: result[b.key] }))
    .filter((b) => b.providers.length > 0);
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

const SORT_MODES = ["nearest", "featured", "sponsored"];

function sortProviders(providers, mode) {
  const copy = [...providers];
  if (mode === "sponsored") {
    copy.sort((a, b) => {
      const sa = a?.isSponsored ? 0 : a?.isFeatured ? 1 : 2;
      const sb = b?.isSponsored ? 0 : b?.isFeatured ? 1 : 2;
      if (sa !== sb) return sa - sb;
      return (a?.distanceKm ?? 999) - (b?.distanceKm ?? 999);
    });
  } else if (mode === "featured") {
    copy.sort((a, b) => {
      const fa = a?.isFeatured || a?.isSponsored ? 0 : 1;
      const fb = b?.isFeatured || b?.isSponsored ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return (a?.distanceKm ?? 999) - (b?.distanceKm ?? 999);
    });
  } else {
    copy.sort((a, b) => (a?.distanceKm ?? 999) - (b?.distanceKm ?? 999));
  }
  return copy;
}

// ─── Pass A: Liquid glass icon tile ──────────────────────────────────────────
// Ported from MapHospitalListContent / mapHospitalList.styles.js.
// LinearGradient + top-cap highlight + shadow shell = liquid glass.

function SheetIconTile({ iconName, tintColor, isDarkMode }) {
  const gradColors = isDarkMode
    ? ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.05)"]
    : ["#FFFFFF", "#EEF2F7"];
  return (
    <View style={styles.sheetIconShell}>
      <LinearGradient
        colors={gradColors}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sheetIconFill}
      >
        <View pointerEvents="none" style={styles.sheetIconHighlight} />
        <MaterialCommunityIcons name={iconName ?? "medical-bag"} size={18} color={isDarkMode ? "#FFFFFF" : tintColor} />
      </LinearGradient>
    </View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow({ tokens }) {
  const shimmer = tokens.mutedCardSurface;
  return (
    <View style={[styles.card, { backgroundColor: tokens.strongCardSurface }]}>
      <View style={styles.rowTop}>
        <View style={styles.rowHeading}>
          <View style={[styles.sheetIconShell, { backgroundColor: shimmer }]} />
          <View style={styles.titleBlock}>
            <View style={[styles.skeletonLine, { width: "58%", backgroundColor: shimmer }]} />
            <View style={[styles.skeletonLine, { width: "40%", backgroundColor: shimmer, marginTop: 6 }]} />
          </View>
        </View>
        <View style={[styles.selectionRing, { borderColor: shimmer, marginRight: 1 }]} />
      </View>
      <View style={[styles.skeletonLine, { width: "72%", backgroundColor: shimmer, marginTop: 10 }]} />
    </View>
  );
}

function SkeletonList({ tokens }) {
  return (
    <View style={styles.listContent}>
      {[0, 1, 2, 3].map((i) => <SkeletonRow key={i} tokens={tokens} />)}
    </View>
  );
}

// ─── Filter Rail ─────────────────────────────────────────────────────────────
// Mirrors hospital list specialty rail exactly:
//   - Sort pills first (Nearest / Featured / Sponsored) — functional sort state
//   - Data-driven service tags second — functional filter state (from actual provider data)
//   - All pills: pressed opacity, active bg, count badge
//   - tintColor accent on active only; muted tokens everywhere else

const SORT_PILL_META = [
  { mode: "nearest",  label: "Nearest",  icon: "navigation-variant-outline" },
  { mode: "featured", label: "Featured",  icon: "star-outline" },
  { mode: "sponsored",label: "Sponsored", icon: "lightning-bolt-outline" },
];

function FilterRail({ activeMode, onSortSelect, activeTag, onTagSelect, serviceTags, totalCount, tintColor, tokens, filterPillSurface, filterPillActive, filterCountText, stickToTop = false }) {
  const pillActiveBg   = filterPillActive  ?? tintColor + "1A";
  const pillInactiveBg = filterPillSurface ?? tokens.mutedCardSurface;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={stickToTop ? styles.filterRailSticky : null}
      contentContainerStyle={styles.filterRailContent}
    >
      {/* ── Sort pills ── */}
      {SORT_PILL_META.map(({ mode, label, icon }) => {
        const isActive = activeMode === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => onSortSelect(mode)}
            style={({ pressed }) => [
              styles.filterPill,
              { backgroundColor: isActive ? pillActiveBg : pillInactiveBg, opacity: pressed ? 0.94 : 1 },
            ]}
          >
            <MaterialCommunityIcons
              name={icon}
              size={13}
              color={isActive ? tintColor : tokens.mutedText}
            />
            <Text style={[styles.filterPillLabel, { color: isActive ? tintColor : tokens.titleColor }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}

      {/* ── Divider ── */}
      {serviceTags.length > 0 ? (
        <View style={styles.filterRailDivider} />
      ) : null}

      {/* ── "All" pill — resets tag filter ── */}
      {serviceTags.length > 0 ? (
        <Pressable
          onPress={() => onTagSelect(null)}
          style={({ pressed }) => [
            styles.filterPill,
            { backgroundColor: !activeTag ? pillActiveBg : pillInactiveBg, opacity: pressed ? 0.94 : 1 },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={13}
            color={!activeTag ? tintColor : tokens.mutedText}
          />
          <Text style={[styles.filterPillLabel, { color: !activeTag ? tintColor : tokens.titleColor }]}>All</Text>
          <Text style={[styles.filterPillCount, { color: filterCountText ?? tokens.mutedText }]}>{totalCount}</Text>
        </Pressable>
      ) : null}

      {/* ── Service tag pills (data-driven) ── */}
      {serviceTags.map(({ label, count }) => {
        const isActive = activeTag === label;
        return (
          <Pressable
            key={label}
            onPress={() => onTagSelect(label)}
            style={({ pressed }) => [
              styles.filterPill,
              { backgroundColor: isActive ? pillActiveBg : pillInactiveBg, opacity: pressed ? 0.94 : 1 },
            ]}
          >
            <Text style={[styles.filterPillLabel, { color: isActive ? tintColor : tokens.titleColor }]}>
              {label}
            </Text>
            <Text style={[styles.filterPillCount, { color: filterCountText ?? tokens.mutedText }]}>{count}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Provider Card ────────────────────────────────────────────────────────────
// Liquid glass icon tile, icon-anchored meta chips, squircle(24) geometry,
// hospital-list radio selection ring pattern, detail navigation on tap.

function ProviderCard({ provider, isSelected, onPress, tintColor, iconName, isDarkMode, tokens, rowSurface, rowPressed, metaChipBg }) {
  const km = provider?.distanceKm ?? null;
  // Guard 0 and non-finite — both mean 'unknown', not literally 0 km away
  const distLabel = (Number.isFinite(km) && km > 0) ? `${Math.round(km * 10) / 10} km` : null;
  const mins = estimateTravelMin(km);
  const timeLabel = mins !== null ? `~${Math.round(mins)} min` : null;
  // PULLBACK NOTE: EXP-6B-FIX — mirror hospital row meta chips: rating, price, eta, verified
  const rating = provider?.rating > 0 ? Number(provider.rating).toFixed(1) : null;
  // PULLBACK NOTE: EXP-6B-COLOR — normalize price: strip $ symbols (US-centric, universal app)
  // Show actual label if it's text (e.g. "Emergency", "Free"), show "Flexible" for symbol-only ($$$)
  const rawPrice = typeof provider?.price === "string" ? provider.price.trim() : null;
  const price = rawPrice && /^[\$€£¥₦]+$/.test(rawPrice) ? "Flexible" : (rawPrice || null);
  const eta = typeof provider?.eta === "string" && provider.eta.trim() ? provider.eta.trim() : null;
  const isVerified = provider?.verified === true;
  const isWideFallback =
    provider?.isWideProviderFallback === true || provider?.providerLocalityScope === "wide_fallback";

  const rowActiveBg = tintColor + "14";

  const handlePress = useCallback(() => onPress?.(provider), [onPress, provider]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isSelected ? rowActiveBg : pressed ? rowPressed : rowSurface,
          opacity: pressed ? 0.96 : 1,
          transform: [{ scale: pressed ? 0.995 : 1 }],
        },
      ]}
    >
      {/* rowTop: [icon + titleBlock] vs [actions] — mirrors hospital rowTop/rowHeading layout */}
      <View style={styles.rowTop}>
        <View style={styles.rowHeading}>
          <SheetIconTile iconName={iconName} tintColor={tintColor} isDarkMode={isDarkMode} />
          <View style={styles.titleBlock}>
            {/* Title + badge inline — mirrors rowTitleLine */}
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: tokens.titleColor }]} numberOfLines={1}>
                {provider?.name ?? "Unnamed Provider"}
              </Text>
              {provider?.isSponsored ? (
                <View style={[styles.badge, { backgroundColor: tintColor + "33" }]}>
                  <Text style={[styles.badgeText, { color: tintColor }]}>Sponsored</Text>
                </View>
              ) : provider?.isFeatured ? (
                <View style={[styles.badge, { backgroundColor: metaChipBg }]}>
                  <Text style={[styles.badgeText, { color: tokens.mutedText }]}>Featured</Text>
                </View>
              ) : isVerified ? (
                <View style={[styles.badge, { backgroundColor: metaChipBg }]}>
                  <Text style={[styles.badgeText, { color: tokens.mutedText }]}>Verified</Text>
                </View>
              ) : null}
            </View>
            {/* Subtitle — mirrors rowSubtitle */}
            <Text style={[styles.cardAddress, { color: tokens.mutedText }]} numberOfLines={1}>
              {buildProviderSubtitle(provider)}
            </Text>
          </View>
        </View>

        {/* ETA pill + selection ring — mirrors rowActions */}
        <View style={styles.cardActions}>
          {eta ? (
            <View style={[styles.etaPill, { backgroundColor: metaChipBg }]}>
              <Text style={[styles.etaText, { color: tokens.mutedText }]}>{eta}</Text>
            </View>
          ) : null}
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={20} color={tintColor} />
          ) : (
            <View style={[styles.selectionRing, { borderColor: tokens.mutedText }]} />
          )}
        </View>
      </View>

      {/* Meta chips below rowTop — mirrors hospital metaRow */}
      {(distLabel || timeLabel || rating || price || isWideFallback) ? (
        <View style={styles.cardMeta}>
          {isWideFallback ? (
            <View style={[styles.metaChip, { backgroundColor: metaChipBg }]}>
              <Ionicons name="map-outline" size={12} color={tokens.mutedText} />
              <Text style={[styles.metaChipText, { color: tokens.mutedText }]}>Wider area</Text>
            </View>
          ) : null}
          {distLabel ? (
            <View style={[styles.metaChip, { backgroundColor: metaChipBg }]}>
              <Ionicons name="navigate" size={12} color={tokens.mutedText} />
              <Text style={[styles.metaChipText, { color: tokens.mutedText }]}>{distLabel}</Text>
            </View>
          ) : null}
          {timeLabel ? (
            <View style={[styles.metaChip, { backgroundColor: metaChipBg }]}>
              <Ionicons name="time-outline" size={12} color={tokens.mutedText} />
              <Text style={[styles.metaChipText, { color: tokens.mutedText }]}>{timeLabel}</Text>
            </View>
          ) : null}
          {rating ? (
            <View style={[styles.metaChip, { backgroundColor: metaChipBg }]}>
              <Ionicons name="star" size={12} color="#D97706" />
              <Text style={[styles.metaChipText, { color: tokens.mutedText }]}>{rating}</Text>
            </View>
          ) : null}
          {price ? (
            <View style={[styles.metaChip, { backgroundColor: metaChipBg }]}>
              <MaterialCommunityIcons name="tag-outline" size={12} color={tokens.mutedText} />
              <Text style={[styles.metaChipText, { color: tokens.mutedText }]}>{price}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
// Pass D: sentence-case labels (no uppercase)

function SectionHeader({ label, count, tokens }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionLabel, { color: tokens.mutedText }]}>{label}</Text>
      <Text style={[styles.sectionCount, { color: tokens.mutedText }]}>{count}</Text>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ categoryMeta, tokens, emptySurface }) {
  return (
    <View style={[styles.emptyWrap, { backgroundColor: emptySurface }]}>
      {categoryMeta?.iconName ? (
        <View style={[styles.emptyIconTile, { backgroundColor: tokens.mutedCardSurface }]}>
          <MaterialCommunityIcons
            name={categoryMeta.iconName}
            size={28}
            color={tokens.mutedText}
          />
        </View>
      ) : null}
      <Text style={[styles.emptyText, { color: tokens.mutedText }]}>
        No {categoryMeta?.label ?? "providers"} found nearby
      </Text>
    </View>
  );
}

// ─── Named export for StageBase header ────────────────────────────────────────

export { buildProviderSubtitle };

// ─── Content ──────────────────────────────────────────────────────────────────

export default function MapProviderListContent({
  providerCategory,
  location,
  countryCode = null,
  onSelectProvider,
  // PULLBACK NOTE: FIX-B — BUG-3: accept selectedProviderId to drive card highlight
  // OLD: no prop — isSelected was hardcoded to false for every card
  // NEW: selectedProviderId drives isSelected per card via atom read in MapScreen
  selectedProviderId,
  isSidebarPresentation = false,
}) {
  const { isDarkMode } = useTheme();
  const [sortMode, setSortMode] = useState("nearest");

  const handleCardPress = useCallback((provider) => {
    onSelectProvider?.(provider);
  }, [onSelectProvider]);

  const tokens = useMemo(
    () => getMapSheetTokens({ isDarkMode, platform: Platform.OS }),
    [isDarkMode],
  );

  const { providers, isLoading, isFetching, categoryMeta } = useNearbyProviders({
    providerCategory,
    location,
    enabled: !!providerCategory,
    includeGoogle: true,
    countryCode,
  });

  const tintColor = categoryMeta?.markerTint ?? "#64748B";
  const iconName  = categoryMeta?.iconName ?? "hospital-building";
  const titleLabel = categoryMeta?.label ?? "Nearby Providers";

  // Surface tokens — exact match to MapHospitalListContent for visual parity
  const rowSurface        = isDarkMode ? "rgba(255,255,255,0.05)"  : "rgba(255,255,255,0.94)";
  const rowPressed        = isDarkMode ? "rgba(255,255,255,0.08)"  : "#FFFFFF";
  const metaChipBg        = isDarkMode ? "rgba(255,255,255,0.065)" : "rgba(15,23,42,0.045)";
  const emptySurface      = isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.9)";
  const filterPillSurface = isDarkMode ? "rgba(255,255,255,0.06)"  : "rgba(15,23,42,0.05)";
  const filterPillActive  = isDarkMode ? tintColor + "2E"          : tintColor + "1A";
  const filterCountText   = isDarkMode ? "#CBD5E1"                 : "#475467";

  // PULLBACK NOTE: EXP-6B-FIX — data-driven service tag filter mirrors hospital specialty filter
  const [activeServiceTag, setActiveServiceTag] = useState(null);

  // Build tag list with counts from actual data — mirrors buildHospitalSpecialtyFilters
  const serviceTagsWithCounts = useMemo(() => {
    const countMap = new Map();
    providers.forEach((p) => {
      const tags = [
        ...(Array.isArray(p?.serviceTypes) ? p.serviceTypes : []),
        ...(Array.isArray(p?.specialties) ? p.specialties : []),
      ];
      tags.forEach((t) => {
        if (typeof t === "string" && t.trim()) {
          const k = t.trim();
          countMap.set(k, (countMap.get(k) ?? 0) + 1);
        }
      });
    });
    return Array.from(countMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [providers]);

  const filteredProviders = useMemo(() => {
    if (!activeServiceTag) return providers;
    return providers.filter((p) => {
      const tags = [
        ...(Array.isArray(p?.serviceTypes) ? p.serviceTypes : []),
        ...(Array.isArray(p?.specialties) ? p.specialties : []),
      ];
      return tags.some((t) => typeof t === "string" && t.trim() === activeServiceTag);
    });
  }, [providers, activeServiceTag]);

  const sorted = useMemo(() => sortProviders(filteredProviders, sortMode), [filteredProviders, sortMode]);
  const buckets = useMemo(() => bucketProviders(sorted), [sorted]);
  const hasWideFallbackProviders = providers.some(
    (provider) => provider?.isWideProviderFallback === true || provider?.providerLocalityScope === "wide_fallback",
  );

  return (
    <>
      {isLoading || isFetching ? (
        <SkeletonList tokens={tokens} />
      ) : providers.length === 0 ? (
        <EmptyState categoryMeta={categoryMeta} tokens={tokens} emptySurface={emptySurface} />
      ) : (
        <>
          {/* Unified filter rail — sort pills + data-driven service tags */}
          <FilterRail
            activeMode={sortMode}
            onSortSelect={setSortMode}
            activeTag={activeServiceTag}
            onTagSelect={setActiveServiceTag}
            serviceTags={serviceTagsWithCounts}
            totalCount={providers.length}
            tintColor={tintColor}
            tokens={tokens}
            filterPillSurface={filterPillSurface}
            filterPillActive={filterPillActive}
            filterCountText={filterCountText}
            stickToTop={isSidebarPresentation}
          />

          <View style={styles.listContent}>
            {buckets.map((bucket) => (
              <View key={bucket.key}>
                <SectionHeader
                  label={bucket.label}
                  count={bucket.providers.length}
                  tokens={tokens}
                />
                {bucket.providers.map((provider) => {
                  const pid = provider?.id ?? provider?.placeId ?? provider?.name;
                  return (
                    <ProviderCard
                      key={pid}
                      provider={provider}
                      isSelected={selectedProviderId != null && selectedProviderId === (provider?.id ?? provider?.placeId ?? provider?.name)}
                      onPress={handleCardPress}
                      tintColor={tintColor}
                      iconName={iconName}
                      isDarkMode={isDarkMode}
                      tokens={tokens}
                      rowSurface={rowSurface}
                      rowPressed={rowPressed}
                      metaChipBg={metaChipBg}
                    />
                  );
                })}
              </View>
            ))}

            <Text style={[styles.footerNote, { color: tokens.mutedText }]}>
              {providers.length} {titleLabel.toLowerCase()} {hasWideFallbackProviders ? "nearby, wider area included" : "within 20 km"}
            </Text>
          </View>
        </>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const squircle = (r) => ({ borderRadius: r, borderCurve: "continuous" });

const styles = StyleSheet.create({
  listContent: {
    gap: 4,
  },
  filterRailSticky: Platform.select({
    web: {
      position: "sticky",
      top: 0,
      zIndex: 12,
    },
    default: null,
  }),
  filterRailContent: {
    paddingHorizontal: 2,
    paddingRight: 8,
    paddingBottom: 14,
    paddingTop: 2,
    gap: 10,
    alignItems: "center",
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 8,
    ...squircle(18),
  },
  filterPillLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
  filterPillCount: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  filterRailDivider: {
    width: 1,
    height: 18,
    borderRadius: 1,
    backgroundColor: "rgba(148,163,184,0.25)",
    marginHorizontal: 2,
  },
  // Section header — sentence case, no uppercase
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: "500",
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 72,
    borderWidth: 0,
    marginBottom: 6,
    ...squircle(20),
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowHeading: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  titleBlock: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    ...squircle(8),
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cardAddress: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
    marginTop: 4,
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  etaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  etaText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },
  // Radio selection ring — hospital list pattern
  selectionRing: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  // Pass A: liquid glass icon tile — ported from mapHospitalList.styles.js
  sheetIconShell: {
    width: 40,
    height: 40,
    padding: 1,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    flexShrink: 0,
    ...squircle(16),
  },
  sheetIconFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...squircle(15),
  },
  sheetIconHighlight: {
    position: "absolute",
    left: 1,
    right: 1,
    top: 1,
    height: "42%",
    backgroundColor: "rgba(255,255,255,0.20)",
    ...squircle(14),
  },
  emptyWrap: {
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: "center",
    gap: 14,
    ...squircle(28),
  },
  emptyIconTile: {
    marginBottom: 0,
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
    ...squircle(18),
  },
  emptyText: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  footerNote: {
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
    paddingTop: 8,
  },
});
