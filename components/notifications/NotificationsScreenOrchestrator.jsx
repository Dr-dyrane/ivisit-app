import React, { useCallback, useEffect, useMemo } from "react";
import {
  Platform,
  Pressable,
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
import SearchIconButton from "../headers/SearchIconButton";
import SettingsIconButton from "../headers/SettingsIconButton";
import HeaderBackButton from "../navigation/HeaderBackButton";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
} from "../../utils/ui/stackViewportConfig";
import { NOTIFICATIONS_SCREEN_COPY } from "./notificationsScreen.content";
import NotificationsMainContent from "./NotificationsMainContent";
import NotificationsStageBase from "./NotificationsStageBase";
import NotificationsWideLayout from "./NotificationsWideLayout";
import { useNotificationsScreenModel } from "../../hooks/notifications/useNotificationsScreenModel";
import {
  computeNotificationsSidebarLayout,
  NOTIFICATIONS_SIDEBAR_HIG,
} from "./notificationsSidebarLayout";

// PULLBACK NOTE: NotificationsScreenOrchestrator now owns only header wiring,
// focus refresh, and compact-vs-wide composition. The route and screen stay thin.

export default function NotificationsScreenOrchestrator() {
  const { isDarkMode } = useTheme();
  const { setHeaderState } = useHeaderState();
  const { width } = useWindowDimensions();
  const model = useNotificationsScreenModel();

  const backButton = useCallback(() => <HeaderBackButton />, []);
  const headerActions = useMemo(
    () =>
      model.isSelectMode ? null : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActionWrapper>
            <SearchIconButton />
          </ActionWrapper>
          <ActionWrapper>
            <SettingsIconButton />
          </ActionWrapper>
        </View>
      ),
    [model.isSelectMode],
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
  const isCompactLayout = !usesSidebarLayout;
  const compactHeaderActions = useMemo(() => {
    if (!isCompactLayout) return null;

    if (model.isSelectMode) {
      return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <HeaderIconAction
            icon={
              model.allFilteredSelected
                ? "remove-circle-outline"
                : "checkbox-outline"
            }
            label={
              model.allFilteredSelected
                ? NOTIFICATIONS_SCREEN_COPY.rows.clearAll
                : NOTIFICATIONS_SCREEN_COPY.rows.selectAll
            }
            onPress={model.onToggleSelectAll}
            isDarkMode={isDarkMode}
          />
          <HeaderIconAction
            icon="checkmark-done-outline"
            label={NOTIFICATIONS_SCREEN_COPY.rows.markRead}
            onPress={() => {
              void model.onMarkSelectedRead();
            }}
            disabled={model.selectedCount === 0}
            isDarkMode={isDarkMode}
          />
          <HeaderIconAction
            icon="trash-outline"
            label={NOTIFICATIONS_SCREEN_COPY.rows.delete}
            onPress={model.onDeleteSelected}
            destructive
            disabled={model.selectedCount === 0}
            isDarkMode={isDarkMode}
          />
          <HeaderIconAction
            icon="close-outline"
            label={NOTIFICATIONS_SCREEN_COPY.rows.done}
            onPress={model.onCloseSelectionMode}
            isDarkMode={isDarkMode}
          />
        </View>
      );
    }

    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <HeaderIconAction
          icon={
            model.unreadCount > 0 ? "checkmark-done-outline" : "refresh-outline"
          }
          label={model.primaryActionLabel}
          onPress={() => {
            void model.onPrimaryAction();
          }}
          isDarkMode={isDarkMode}
        />
        <HeaderIconAction
          icon="checkbox-outline"
          label="Select"
          onPress={model.onOpenSelectionMode}
          isDarkMode={isDarkMode}
        />
      </View>
    );
  }, [
    isDarkMode,
    isCompactLayout,
    model.allFilteredSelected,
    model.isSelectMode,
    model.onCloseSelectionMode,
    model.onDeleteSelected,
    model.onMarkSelectedRead,
    model.onOpenSelectionMode,
    model.onPrimaryAction,
    model.onToggleSelectAll,
    model.primaryActionLabel,
    model.selectedCount,
    model.unreadCount,
  ]);
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

  useEffect(() => {
    setHeaderState({ layoutInsets: headerLayoutInsets });
  }, [headerLayoutInsets, setHeaderState]);

  useFocusEffect(
    useCallback(() => {
      void model.refresh();
    }, [model.refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      setHeaderState({
        title: NOTIFICATIONS_SCREEN_COPY.screen.title,
        subtitle: model.headerSubtitle,
        icon: <Ionicons name="notifications" size={26} color="#FFFFFF" />,
        backgroundColor: COLORS.brandPrimary,
        leftComponent: backButton(),
        rightComponent: isCompactLayout ? compactHeaderActions : headerActions,
        scrollAware: false,
        layoutInsets: headerLayoutInsets,
      });
    }, [
      backButton,
      compactHeaderActions,
      headerActions,
      headerLayoutInsets,
      isCompactLayout,
      model.headerSubtitle,
      setHeaderState,
    ]),
  );

  return (
    <NotificationsStageBase
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
            <NotificationsWideLayout
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
          <NotificationsMainContent
            model={model}
            isDarkMode={isDarkMode}
            theme={theme}
            metrics={metrics}
            contentPaddingHorizontal={0}
            showSelectionBar={false}
          />
        );
      }}
    </NotificationsStageBase>
  );
}

function HeaderIconAction({
  icon,
  label,
  onPress,
  disabled = false,
  destructive = false,
  isDarkMode = false,
}) {
  const color = destructive
    ? isDarkMode
      ? "#FCA5A5"
      : "#DC2626"
    : isDarkMode
      ? COLORS.textMutedDark
      : COLORS.textMuted;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => ({
        opacity: pressed ? 0.82 : disabled ? 0.46 : 1,
      })}
    >
      <ActionWrapper style={{ width: 38, height: 38 }}>
        <Ionicons name={icon} size={20} color={color} />
      </ActionWrapper>
    </Pressable>
  );
}
