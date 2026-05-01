import React, { useCallback, useMemo } from "react";
import { Platform, RefreshControl, useWindowDimensions } from "react-native";
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
import { HELP_SUPPORT_SCREEN_COPY } from "./helpSupport.content";
import HelpSupportComposerModal from "./HelpSupportComposerModal";
import HelpSupportMainContent from "./HelpSupportMainContent";
import HelpSupportStageBase from "./HelpSupportStageBase";
import HelpSupportWideLayout from "./HelpSupportWideLayout";
import { useHelpSupportScreenModel } from "../../hooks/support/useHelpSupportScreenModel";
import {
  computeHelpSupportSidebarLayout,
  HELP_SUPPORT_SIDEBAR_HIG,
} from "./helpSupportSidebarLayout";

export default function HelpSupportScreenOrchestrator() {
  const { isDarkMode } = useTheme();
  const { setHeaderState } = useHeaderState();
  const { width } = useWindowDimensions();
  const model = useHelpSupportScreenModel();

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
    () => computeHelpSupportSidebarLayout({ width, surfaceConfig }),
    [surfaceConfig, width],
  );
  const usesSidebarLayout = sidebarLayout.usesSidebarLayout;
  const headerLayoutInsets = useMemo(() => {
    if (!usesSidebarLayout) return null;
    const baseTopInset = surfaceConfig.headerTopInset || 10;
    const topInset = Math.round(
      baseTopInset * HELP_SUPPORT_SIDEBAR_HIG.HEADER_TOP_INSET_REDUCTION,
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
      void model.onRefresh();
      setHeaderState({
        title: HELP_SUPPORT_SCREEN_COPY.screen.title,
        subtitle: model.headerSubtitle,
        icon: <Ionicons name="help-buoy" size={26} color="#FFFFFF" />,
        backgroundColor: COLORS.brandPrimary,
        leftComponent: backButton(),
        rightComponent: null,
        scrollAware: false,
        layoutInsets: headerLayoutInsets,
      });
    }, [
      backButton,
      headerLayoutInsets,
      model.headerSubtitle,
      model.onRefresh,
      setHeaderState,
    ]),
  );

  return (
    <>
      <HelpSupportStageBase
        isDarkMode={isDarkMode}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(model.isRefreshing)}
            onRefresh={() => {
              void model.onRefresh();
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
              <HelpSupportWideLayout
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
            <HelpSupportMainContent
              model={model}
              isDarkMode={isDarkMode}
              theme={theme}
              metrics={metrics}
              contentPaddingHorizontal={0}
            />
          );
        }}
      </HelpSupportStageBase>

      <HelpSupportComposerModal
        visible={model.composeVisible}
        subject={model.subject}
        message={model.message}
        canSubmit={model.canSubmit}
        isSubmitting={model.isSubmitting}
        onClose={model.onHideComposer}
        onDiscard={model.onDiscardComposer}
        onSubmit={model.onSubmitComposer}
        onSubjectChange={model.onSubjectChange}
        onMessageChange={model.onMessageChange}
        isDarkMode={isDarkMode}
      />
    </>
  );
}
