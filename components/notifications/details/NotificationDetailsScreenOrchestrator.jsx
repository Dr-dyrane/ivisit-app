import React, { useCallback, useMemo } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import { useHeaderState } from "../../../contexts/HeaderStateContext";
import ActionWrapper from "../../headers/ActionWrapper";
import SettingsIconButton from "../../headers/SettingsIconButton";
import HeaderBackButton from "../../navigation/HeaderBackButton";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
} from "../../../utils/ui/stackViewportConfig";
import {
  computeNotificationsSidebarLayout,
  NOTIFICATIONS_SIDEBAR_HIG,
} from "../notificationsSidebarLayout";
import NotificationDetailsMainContent from "./NotificationDetailsMainContent";
import NotificationDetailsStageBase from "./NotificationDetailsStageBase";
import NotificationDetailsWideLayout from "./NotificationDetailsWideLayout";
import { useNotificationDetailsScreenModel } from "../../../hooks/notifications/useNotificationDetailsScreenModel";
import { NOTIFICATION_DETAILS_COPY } from "./notificationDetails.content";

export default function NotificationDetailsScreenOrchestrator() {
  const { isDarkMode } = useTheme();
  const { setHeaderState } = useHeaderState();
  const { width } = useWindowDimensions();
  const model = useNotificationDetailsScreenModel();

  const backButton = useCallback(() => <HeaderBackButton />, []);
  const headerActions = useMemo(
    () => (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <ActionWrapper>
          <SettingsIconButton />
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
    () => computeNotificationsSidebarLayout({ width, surfaceConfig }),
    [surfaceConfig, width],
  );
  const usesSidebarLayout = sidebarLayout.usesSidebarLayout;
  const headerLayoutInsets = useMemo(() => {
    if (!usesSidebarLayout) return null;
    const baseTopInset = surfaceConfig.headerTopInset || 10;
    const topInset = Math.round(
      baseTopInset * NOTIFICATIONS_SIDEBAR_HIG.HEADER_TOP_INSET_REDUCTION,
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
      setHeaderState({
        title: NOTIFICATION_DETAILS_COPY.screen.title,
        subtitle: model.headerSubtitle,
        icon: <Ionicons name="notifications" size={24} color="#FFFFFF" />,
        backgroundColor: COLORS.brandPrimary,
        leftComponent: backButton(),
        rightComponent: headerActions,
        scrollAware: false,
        layoutInsets: headerLayoutInsets,
      });
    }, [
      backButton,
      headerActions,
      headerLayoutInsets,
      model.headerSubtitle,
      setHeaderState,
    ]),
  );

  return (
    <NotificationDetailsStageBase isDarkMode={isDarkMode}>
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
            <NotificationDetailsWideLayout
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
          <NotificationDetailsMainContent
            model={model}
            theme={theme}
            metrics={metrics}
          />
        );
      }}
    </NotificationDetailsStageBase>
  );
}
