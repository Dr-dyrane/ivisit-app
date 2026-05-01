import React, { useCallback, useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import HeaderBackButton from "../navigation/HeaderBackButton";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
} from "../../utils/ui/stackViewportConfig";
import { SETTINGS_SCREEN_COPY } from "./settingsScreen.content";
import SettingsSectionList from "./SettingsSectionList";
import SettingsStageBase from "./SettingsStageBase";
import SettingsWideLayout from "./SettingsWideLayout";
import { useSettingsScreenModel } from "../../hooks/settings/useSettingsScreenModel";
import {
  computeSettingsSidebarLayout,
  SETTINGS_SIDEBAR_HIG,
} from "./settingsSidebarLayout";

// PULLBACK NOTE: SettingsScreenOrchestrator matches the newer stack ownership contract.
// It owns header wiring, refresh, and compact-vs-wide composition while the stage base owns shell and motion.

export default function SettingsScreenOrchestrator() {
  const { isDarkMode } = useTheme();
  const { setHeaderState } = useHeaderState();
  const { width } = useWindowDimensions();
  const model = useSettingsScreenModel();

  const backButton = useCallback(() => <HeaderBackButton />, []);
  const viewportVariant = useMemo(
    () => getStackViewportVariant({ platform: Platform.OS, width }),
    [width],
  );
  const surfaceConfig = useMemo(
    () => getStackViewportSurfaceConfig(viewportVariant),
    [viewportVariant],
  );
  const sidebarLayout = useMemo(
    () => computeSettingsSidebarLayout({ width, surfaceConfig }),
    [surfaceConfig, width],
  );
  const usesSidebarLayout = sidebarLayout.usesSidebarLayout;
  const headerLayoutInsets = useMemo(() => {
    if (!usesSidebarLayout) return null;
    const baseTopInset = surfaceConfig.headerTopInset || 10;
    const topInset = Math.round(
      baseTopInset * SETTINGS_SIDEBAR_HIG.HEADER_TOP_INSET_REDUCTION,
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
      model.refresh();
    }, [model.refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      setHeaderState({
        title: SETTINGS_SCREEN_COPY.screen.title,
        subtitle: SETTINGS_SCREEN_COPY.screen.subtitle,
        icon: <Ionicons name="settings" size={26} color="#FFFFFF" />,
        backgroundColor: COLORS.brandPrimary,
        leftComponent: backButton(),
        rightComponent: null,
        scrollAware: false,
        layoutInsets: headerLayoutInsets,
      });
    }, [backButton, headerLayoutInsets, setHeaderState]),
  );

  return (
    <SettingsStageBase isDarkMode={isDarkMode}>
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
            <SettingsWideLayout
              isDarkMode={isDarkMode}
              theme={theme}
              metrics={metrics}
              layout={layout}
              surfaceConfig={stageSurfaceConfig}
              viewportVariant={stageViewportVariant}
              bottomPadding={bottomPadding}
              model={model}
              loading={model.isDataLoading}
            />
          );
        }

        return (
          <SettingsSectionList
            sections={model.sections}
            isDarkMode={isDarkMode}
            contentPaddingHorizontal={0}
            loading={model.isDataLoading}
          />
        );
      }}
    </SettingsStageBase>
  );
}
