import React from "react";
import { View } from "react-native";
import { NOTIFICATIONS_SCREEN_COPY } from "./notificationsScreen.content";
import NotificationsFilterStrip from "./NotificationsFilterStrip";
import NotificationsList from "./NotificationsList";
import NotificationsSelectionBar from "./NotificationsSelectionBar";

export default function NotificationsMainContent({
  model,
  isDarkMode,
  theme,
  metrics,
  contentPaddingHorizontal = 0,
  showSelectionBar = true,
}) {
  const emptyTitle =
    model.filter === "all"
      ? NOTIFICATIONS_SCREEN_COPY.center.emptyTitle
      : NOTIFICATIONS_SCREEN_COPY.center.emptyFilteredTitle;
  const emptyBody =
    model.filter === "all"
      ? NOTIFICATIONS_SCREEN_COPY.center.emptyBody
      : NOTIFICATIONS_SCREEN_COPY.center.emptyFilteredBody;

  return (
    <View style={{ gap: metrics.spacing.lg }}>
      <View style={{ paddingHorizontal: contentPaddingHorizontal }}>
        <NotificationsFilterStrip
          filters={model.filters}
          selectedFilter={model.filter}
          counts={model.filterCounts}
          onSelect={model.onSelectFilter}
          theme={theme}
          metrics={metrics}
        />
      </View>

      {showSelectionBar ? (
        <View style={{ paddingHorizontal: contentPaddingHorizontal }}>
          <NotificationsSelectionBar
            model={model}
            theme={theme}
            metrics={metrics}
          />
        </View>
      ) : null}

      <NotificationsList
        sections={model.sections}
        isDarkMode={isDarkMode}
        loading={model.isDataLoading}
        emptyTitle={emptyTitle}
        emptyBody={emptyBody}
        contentPaddingHorizontal={contentPaddingHorizontal}
        onPrimaryAction={model.onPrimaryAction}
        primaryActionLabel={model.primaryActionLabel}
        isSelectMode={model.isSelectMode}
        selectedIdSet={model.selectedIdSet}
        onPrepareSectionSelection={model.onPrepareSectionSelection}
        onDeleteSection={model.onDeleteSection}
        onClearSectionSelection={model.onCloseSelectionMode}
        onPressNotification={model.onNotificationPress}
        onLongPressNotification={model.onNotificationLongPress}
      />
    </View>
  );
}
