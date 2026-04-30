import { Linking } from "react-native";
import { useCallback, useMemo } from "react";
import { useAtom } from "jotai";
import * as Haptics from "expo-haptics";
import { useVisits } from "../../contexts/VisitsContext";
import { useSearch } from "../../contexts/SearchContext";
import { useSearchRanking } from "./useSearchRanking";
import { useEmergency, EmergencyMode } from "../../contexts/EmergencyContext";
import { useModeStore } from "../../stores/modeStore";
import { searchDiscoveryTabAtom } from "../../atoms/searchScreenAtoms";
import {
  SEARCH_DISCOVERY_TABS,
  SEARCH_SCREEN_COPY,
} from "../../components/search/searchScreen.content";
import { discoveryService } from "../../services/discoveryService";

function createHistoryLabel(count) {
  if (!count) return SEARCH_SCREEN_COPY.messages.noRecent;
  return `${count} saved`;
}

function createTopTrendLabel(trendingSearches, trendingLoading) {
  if (trendingLoading) return SEARCH_SCREEN_COPY.messages.noTopTrend;
  const topItem = Array.isArray(trendingSearches) ? trendingSearches[0] : null;
  return topItem?.query || SEARCH_SCREEN_COPY.messages.noTopTrend;
}

function getResultToneKey(key) {
  if (String(key || "").startsWith("hospital_")) return "care";
  if (String(key || "").startsWith("visit_")) return "profile";
  if (String(key || "").startsWith("notification_")) return "system";
  return "payment";
}

function getResultBadge(key) {
  if (String(key || "").startsWith("hospital_")) return "Nearby";
  if (String(key || "").startsWith("visit_")) return "Visit";
  if (String(key || "").startsWith("notification_")) return "Alert";
  return "Shortcut";
}

function getQuickActionRows(visits, onSelectQuery) {
  const rows = [
    {
      key: "quick-emergency",
      label: SEARCH_SCREEN_COPY.quickActions.emergency.label,
      subtitle: SEARCH_SCREEN_COPY.quickActions.emergency.subtitle,
      icon: SEARCH_SCREEN_COPY.quickActions.emergency.icon,
      toneKey: SEARCH_SCREEN_COPY.quickActions.emergency.tone,
      onPress: () =>
        onSelectQuery(SEARCH_SCREEN_COPY.quickActions.emergency.query),
    },
  ];

  const latestVisit = Array.isArray(visits) ? visits[0] : null;
  if (latestVisit?.hospital) {
    rows.push({
      key: `quick-visit-${latestVisit.id || latestVisit.hospital}`,
      label: latestVisit.hospital,
      subtitle: "Search this care team again",
      icon: "time",
      toneKey: "profile",
      onPress: () => onSelectQuery(latestVisit.hospital),
    });
  }

  rows.push(
    {
      key: "quick-hospital",
      label: SEARCH_SCREEN_COPY.quickActions.hospital.label,
      subtitle: SEARCH_SCREEN_COPY.quickActions.hospital.subtitle,
      icon: SEARCH_SCREEN_COPY.quickActions.hospital.icon,
      toneKey: SEARCH_SCREEN_COPY.quickActions.hospital.tone,
      onPress: () =>
        onSelectQuery(SEARCH_SCREEN_COPY.quickActions.hospital.query),
    },
    {
      key: "quick-pharmacy",
      label: SEARCH_SCREEN_COPY.quickActions.pharmacy.label,
      subtitle: SEARCH_SCREEN_COPY.quickActions.pharmacy.subtitle,
      icon: SEARCH_SCREEN_COPY.quickActions.pharmacy.icon,
      toneKey: SEARCH_SCREEN_COPY.quickActions.pharmacy.tone,
      onPress: () =>
        onSelectQuery(SEARCH_SCREEN_COPY.quickActions.pharmacy.query),
    },
  );

  return rows;
}

// PULLBACK NOTE: Search screen model owns the screen-specific contract.
// It keeps route/header/layout files free of query selection logic, discovery-tab state,
// and derived row construction while preserving the existing SearchContext boundary.

export function useSearchScreenModel() {
  const { visits } = useVisits();
  const { allHospitals, specialties } = useEmergency();
  const mode = useModeStore((state) => state.mode);
  const setMode = useModeStore((state) => state.setMode);
  const selectedSpecialty = useModeStore((state) => state.selectedSpecialty);
  const setSelectedSpecialty = useModeStore(
    (state) => state.setSelectedSpecialty,
  );
  const {
    query,
    setSearchQuery,
    recentQueries,
    historyLoading,
    trendingSearches,
    trendingLoading,
    healthNews,
    healthNewsLoading,
    discoveryRefreshing,
    commitQuery,
    refreshDiscovery,
  } = useSearch();
  const { rankedResults, isBedQuery } = useSearchRanking();
  const [activeDiscoveryTab, setActiveDiscoveryTab] = useAtom(
    searchDiscoveryTabAtom,
  );

  const trimmedQuery = useMemo(
    () => (typeof query === "string" ? query.trim() : ""),
    [query],
  );
  const hasQuery = trimmedQuery.length > 0;

  const handleSelectQuery = useCallback(
    (nextQuery) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSearchQuery(nextQuery);
    },
    [setSearchQuery],
  );

  const handleClearQuery = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery("");
  }, [setSearchQuery]);

  const handleQueryBlur = useCallback(() => {
    commitQuery(trimmedQuery);
  }, [commitQuery, trimmedQuery]);

  const handleDiscoveryTabChange = useCallback(
    (nextTab) => {
      if (activeDiscoveryTab === nextTab) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveDiscoveryTab(nextTab);
    },
    [activeDiscoveryTab, setActiveDiscoveryTab],
  );

  const handleFilterSpecialtySelect = useCallback(
    (specialty) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedSpecialty(selectedSpecialty === specialty ? null : specialty);
      if (specialty) {
        setMode(EmergencyMode.BOOKING);
      }
    },
    [selectedSpecialty, setMode, setSelectedSpecialty],
  );

  const handleNewsOpen = useCallback(async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await discoveryService.trackSearchSelection({
      query: item?.title,
      source: "health_news_tab",
      resultType: "health_news",
      resultId: item?.id,
    });

    if (typeof item?.url === "string" && item.url.trim()) {
      await Linking.openURL(item.url);
    }
  }, []);

  const quickActionRows = useMemo(
    () => getQuickActionRows(visits, handleSelectQuery),
    [handleSelectQuery, visits],
  );

  const discoverySpecialties = useMemo(() => {
    if (Array.isArray(specialties) && specialties.length > 0)
      return specialties;
    return SEARCH_SCREEN_COPY.discovery.defaultSpecialties;
  }, [specialties]);

  const specialtyCounts = useMemo(() => {
    const counts = {};
    const hospitals = Array.isArray(allHospitals) ? allHospitals : [];
    const list = Array.isArray(specialties) ? specialties : [];

    for (const specialty of list) {
      if (!specialty) continue;
      counts[specialty] =
        hospitals.filter(
          (hospital) =>
            Array.isArray(hospital?.specialties) &&
            hospital.specialties.some(
              (item) =>
                item &&
                typeof item === "string" &&
                item.toLowerCase() === specialty.toLowerCase(),
            ) &&
            (hospital?.availableBeds ?? 0) > 0,
        ).length || 0;
    }

    return counts;
  }, [allHospitals, specialties]);

  const resultRows = useMemo(
    () =>
      rankedResults.map((item) => ({
        key: item.key,
        label: item.title,
        subtitle: item.subtitle || "Open this result",
        icon: item.icon,
        toneKey: getResultToneKey(item.key),
        badge: getResultBadge(item.key),
        onPress: item.onPress,
      })),
    [rankedResults],
  );

  const recentRows = useMemo(
    () =>
      (Array.isArray(recentQueries) ? recentQueries : []).map(
        (item, index) => ({
          key: `recent-${item}-${index}`,
          label: item,
          subtitle: SEARCH_SCREEN_COPY.recent.subtitle,
          icon: "time-outline",
          toneKey: "system",
          onPress: () => handleSelectQuery(item),
        }),
      ),
    [handleSelectQuery, recentQueries],
  );

  const trendingRows = useMemo(
    () =>
      (Array.isArray(trendingSearches) ? trendingSearches : []).map((item) => ({
        key: `trending-${item.query}`,
        label: item.query,
        subtitle: `${item.count || 0} searches`,
        icon: "trending-up",
        toneKey: "payment",
        badge: item.rank ? `#${item.rank}` : null,
        onPress: () => handleSelectQuery(item.query),
      })),
    [handleSelectQuery, trendingSearches],
  );

  const healthNewsRows = useMemo(
    () =>
      (Array.isArray(healthNews) ? healthNews : []).map((item) => ({
        key: `news-${item.id}`,
        label: item.title,
        subtitle: [item.source, item.time].filter(Boolean).join(" / "),
        icon: item.icon || "newspaper",
        toneKey: "system",
        onPress: () => {
          void handleNewsOpen(item);
        },
      })),
    [handleNewsOpen, healthNews],
  );

  const recentCountLabel = useMemo(
    () => createHistoryLabel(recentRows.length),
    [recentRows.length],
  );
  const resultCountLabel = useMemo(() => {
    if (!hasQuery) return "Type to search";
    if (resultRows.length === 1) return "1 match";
    return `${resultRows.length} matches`;
  }, [hasQuery, resultRows.length]);
  const topTrendLabel = useMemo(
    () => createTopTrendLabel(trendingSearches, trendingLoading),
    [trendingLoading, trendingSearches],
  );
  const focusLabel = useMemo(() => {
    if (selectedSpecialty) return selectedSpecialty;
    if (mode === EmergencyMode.BOOKING || isBedQuery) {
      return SEARCH_SCREEN_COPY.messages.bookingFocus;
    }
    return SEARCH_SCREEN_COPY.messages.allCareTypes;
  }, [isBedQuery, mode, selectedSpecialty]);

  const centerTitle = hasQuery
    ? SEARCH_SCREEN_COPY.center.resultsTitle
    : SEARCH_SCREEN_COPY.center.idleTitle;
  const primaryActionLabel = hasQuery
    ? SEARCH_SCREEN_COPY.context.primaryActionActive
    : SEARCH_SCREEN_COPY.context.primaryActionIdle;

  return {
    query,
    hasQuery,
    centerTitle,
    discoveryTabs: SEARCH_DISCOVERY_TABS,
    activeDiscoveryTab,
    setSearchQuery,
    onQueryBlur: handleQueryBlur,
    onClearQuery: handleClearQuery,
    onPrimaryAction: hasQuery
      ? handleClearQuery
      : () => handleSelectQuery("emergency"),
    onDiscoveryTabChange: handleDiscoveryTabChange,
    onDiscoverySpecialtySelect: handleSelectQuery,
    onFilterSpecialtySelect: handleFilterSpecialtySelect,
    primaryActionLabel,
    recentCountLabel,
    resultCountLabel,
    topTrendLabel,
    focusLabel,
    showSpecialtyFilter:
      (mode === EmergencyMode.BOOKING || isBedQuery) &&
      Array.isArray(specialties) &&
      specialties.length > 0,
    selectedSpecialty,
    filterSpecialties: Array.isArray(specialties) ? specialties : [],
    discoverySpecialties,
    specialtyCounts,
    resultRows,
    recentRows,
    trendingRows,
    healthNewsRows,
    quickActionRows,
    historyLoading,
    trendingLoading,
    healthNewsLoading,
    isRefreshing: discoveryRefreshing,
    refresh: refreshDiscovery,
    showRecentSection: historyLoading || recentRows.length > 0,
    actionIslandTrendRows: trendingRows.slice(0, 4),
    actionIslandRecentRows: recentRows.slice(0, 4),
  };
}
