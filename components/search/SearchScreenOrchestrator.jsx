import React, { useCallback, useMemo } from "react";
import {
  Platform,
  RefreshControl,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import ActionWrapper from "../headers/ActionWrapper";
import NotificationIconButton from "../headers/NotificationIconButton";
import SettingsIconButton from "../headers/SettingsIconButton";
import HeaderBackButton from "../navigation/HeaderBackButton";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
} from "../../utils/ui/stackViewportConfig";
import { SEARCH_SCREEN_COPY } from "./searchScreen.content";
import SearchContextPane from "./SearchContextPane";
import SearchMainContent from "./SearchMainContent";
import SearchStageBase from "./SearchStageBase";
import SearchWideLayout from "./SearchWideLayout";
import { useSearchScreenModel } from "../../hooks/search/useSearchScreenModel";
import {
  computeSearchSidebarLayout,
  SEARCH_SIDEBAR_HIG,
} from "./searchSidebarLayout";

// PULLBACK NOTE: SearchScreenOrchestrator now matches the refined stack-screen pattern.
// It keeps the route thin, owns header wiring + focus refresh, and delegates shell/layout
// work to SearchStageBase and SearchWideLayout.

export default function SearchScreenOrchestrator() {
  const { isDarkMode } = useTheme();
  const { setHeaderState } = useHeaderState();
  const { width } = useWindowDimensions();
  const model = useSearchScreenModel();

  const backButton = useCallback(() => <HeaderBackButton />, []);
  const headerActions = useMemo(
    () => (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <ActionWrapper>
          <SettingsIconButton />
        </ActionWrapper>
        <ActionWrapper>
          <NotificationIconButton />
        </ActionWrapper>
      </View>
    ),
    [],
  );
  const viewportVariant = useMemo(
    () => getStackViewportVariant({ platform: Platform.OS, width }),
    [width],
  );
  const surfaceConfig = useMemo(
    () => getStackViewportSurfaceConfig(viewportVariant),
    [viewportVariant],
  );
  const sidebarLayout = useMemo(
    () => computeSearchSidebarLayout({ width, surfaceConfig }),
    [surfaceConfig, width],
  );
  const usesSidebarLayout = sidebarLayout.usesSidebarLayout;
  const headerLayoutInsets = useMemo(() => {
    if (!usesSidebarLayout) return null;
    const baseTopInset = surfaceConfig.headerTopInset || 10;
    const topInset = Math.round(
      baseTopInset * SEARCH_SIDEBAR_HIG.HEADER_TOP_INSET_REDUCTION,
    );
    return {
      topInset,
      leftInset: 0,
      rightInset: 0,
      containerLeft: sidebarLayout.headerContainerLeft,
      containerRight: sidebarLayout.sidebarGutter,
    };
  }, [
    sidebarLayout.headerContainerLeft,
    sidebarLayout.sidebarGutter,
    surfaceConfig.headerTopInset,
    usesSidebarLayout,
  ]);

  useFocusEffect(
    useCallback(() => {
      void model.refresh();
    }, [model.refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      setHeaderState({
        title: SEARCH_SCREEN_COPY.screen.title,
        subtitle: SEARCH_SCREEN_COPY.screen.subtitle,
        icon: <Ionicons name="search" size={26} color="#FFFFFF" />,
        backgroundColor: COLORS.brandPrimary,
        leftComponent: backButton(),
        rightComponent: headerActions,
        scrollAware: false,
        layoutInsets: headerLayoutInsets,
      });
    }, [backButton, headerActions, headerLayoutInsets, setHeaderState]),
  );

  return (
    <SearchStageBase
      isDarkMode={isDarkMode}
      refreshControl={
        <RefreshControl
          refreshing={Boolean(model.isRefreshing)}
          onRefresh={() => {
            void model.refresh();
          }}
          tintColor={isDarkMode ? "#FFFFFF" : COLORS.brandPrimary}
        />
      }
    >
      {({
        theme,
        metrics,
        surfaceConfig: stageSurfaceConfig,
        bottomPadding,
        layout,
        viewportVariant: stageViewportVariant,
      }) => {
        if (layout?.usesSidebarLayout) {
          return (
            <SearchWideLayout
              isDarkMode={isDarkMode}
              theme={theme}
              metrics={metrics}
              layout={layout}
              surfaceConfig={stageSurfaceConfig}
              viewportVariant={stageViewportVariant}
              bottomPadding={bottomPadding}
              model={model}
            />
          );
        }

        return (
          <View style={{ gap: metrics.spacing.lg }}>
            <SearchMainContent
              model={model}
              isDarkMode={isDarkMode}
              theme={theme}
              metrics={metrics}
              contentPaddingHorizontal={0}
            />
          </View>
        );
      }}
    </SearchStageBase>
  );
}
