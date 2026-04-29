import React, { useMemo } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../constants/colors";
import { SelectionToolbar } from "../ContactCard";
import EmergencyContactsActionIsland from "./EmergencyContactsActionIsland";
import EmergencyContactsContextPane from "./EmergencyContactsContextPane";
import EmergencyContactsListPane from "./EmergencyContactsListPane";
import EmergencyContactsMigrationReviewPane from "./EmergencyContactsMigrationReviewPane";
import { EMERGENCY_CONTACTS_COPY } from "./emergencyContacts.content";
import {
  computeEmergencyContactsHeaderClearance,
  computeEmergencyContactsThirdColumnLayout,
  EMERGENCY_CONTACTS_SIDEBAR_HIG,
  getEmergencyContactsSidebarGlassTokens,
} from "./emergencyContactsSidebarLayout";

// PULLBACK NOTE: EmergencyContacts wide-screen variant.
// Owns: MD+/desktop sidebar shell, center list panel, and XL right context island.
// Does NOT own: header/FAB registration or modal orchestration.

export default function EmergencyContactsWideLayout({
  isDarkMode,
  theme,
  metrics,
  layout,
  surfaceConfig,
  viewportVariant,
  bottomPadding,
  model,
  showMigrationPane,
}) {
  const insets = useSafeAreaInsets();
  const glass = useMemo(
    () => getEmergencyContactsSidebarGlassTokens({ isDarkMode }),
    [isDarkMode],
  );
  const headerClearance = useMemo(
    () =>
      computeEmergencyContactsHeaderClearance({
        surfaceConfig,
        insetsTop: insets.top,
      }),
    [insets.top, surfaceConfig],
  );
  const thirdColumnLayout = useMemo(
    () =>
      computeEmergencyContactsThirdColumnLayout({
        layout,
        viewportVariant,
      }),
    [layout, viewportVariant],
  );
  const showThirdColumn = thirdColumnLayout.usesThirdColumn === true;
  const centerPanelMaxWidth = showThirdColumn ? 760 : 720;

  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: layout.sidebarLeft,
          width: layout.sidebarWidth,
          top: 0,
          height: headerClearance,
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: layout.sidebarInnerPaddingHorizontal + 4,
          gap: 8,
        }}
      >
        <Image
          source={require("../../../assets/logo.png")}
          style={{ width: 28, height: 28 }}
          resizeMode="contain"
        />
        <View style={{ flexDirection: "column", gap: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              letterSpacing: -0.3,
              color: isDarkMode ? "#FFFFFF" : "#0F172A",
              lineHeight: 20,
            }}
          >
            iVisit<Text style={{ color: COLORS.brandPrimary }}>.</Text>
          </Text>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: COLORS.brandPrimary,
              opacity: 0.7,
              lineHeight: 12,
            }}
          >
            {EMERGENCY_CONTACTS_COPY.screen.title}
          </Text>
        </View>
      </View>

      <BlurView
        intensity={glass.blurIntensity}
        tint={glass.tint}
        style={{
          width: layout.sidebarWidth,
          maxWidth: layout.sidebarWidth,
          flexShrink: 0,
          marginLeft: layout.sidebarLeft,
          marginRight: layout.sidebarGutter,
          marginTop: headerClearance,
          marginBottom: layout.sidebarGutter,
          backgroundColor: glass.ghostSurface,
          borderRadius: EMERGENCY_CONTACTS_SIDEBAR_HIG.SIDEBAR_CORNER_RADIUS,
          borderCurve: "continuous",
          overflow: "hidden",
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: layout.sidebarInnerPadding,
            paddingBottom: layout.sidebarInnerPadding + bottomPadding,
            paddingHorizontal: layout.sidebarInnerPaddingHorizontal,
          }}
          showsVerticalScrollIndicator={false}
        >
          <EmergencyContactsContextPane
            theme={theme}
            metrics={metrics}
            contactCount={model.contactCount}
            reachableCount={model.reachableCount}
            reviewCount={model.reviewCount}
          />
        </ScrollView>
      </BlurView>

      <ScrollView
        style={{
          flex: 1,
          marginRight: showThirdColumn
            ? thirdColumnLayout.centerPanelMarginRight
            : 0,
        }}
        contentContainerStyle={{
          gap: metrics.spacing.lg,
          paddingTop: headerClearance,
          paddingBottom: bottomPadding,
          paddingLeft: layout.rightPanelLeftPadding,
          paddingRight: layout.rightPanelRightPadding,
          maxWidth: centerPanelMaxWidth,
          width: "100%",
          alignSelf: "flex-start",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: metrics.spacing.xs }}>
          <Text
            style={{
              color: theme.text,
              fontSize: Math.max(metrics.typography.title.fontSize + 4, 24),
              lineHeight: Math.max(metrics.typography.title.lineHeight + 6, 30),
              fontWeight: "700",
              letterSpacing: -0.35,
            }}
          >
            {EMERGENCY_CONTACTS_COPY.list.title}
          </Text>
        </View>

        {model.selectionCount > 0 ? (
          <SelectionToolbar
            selectedCount={model.selectionCount}
            onClear={model.clearSelection}
            onDelete={model.bulkDelete}
            isDarkMode={isDarkMode}
            floating={false}
          />
        ) : null}

        {showMigrationPane && !showThirdColumn ? (
          <EmergencyContactsMigrationReviewPane
            isDarkMode={isDarkMode}
            theme={theme}
            metrics={metrics}
            skippedLegacyContacts={model.skippedLegacyContacts}
            onResolve={model.openResolveLegacy}
            onDiscard={model.discardLegacyContact}
            onDismiss={model.dismissMigrationReview}
          />
        ) : null}

        <EmergencyContactsListPane
          isDarkMode={isDarkMode}
          theme={theme}
          metrics={metrics}
          contacts={model.contacts}
          isLoading={model.isLoading}
          selectedIdSet={model.selectedIdSet}
          onEdit={model.openEdit}
          onDelete={model.deleteContact}
          onToggleSelect={model.toggleSelect}
          error={model.error}
          syncNotice={model.syncNotice}
        />
      </ScrollView>

      {showThirdColumn ? (
        <BlurView
          intensity={glass.blurIntensity}
          tint={glass.tint}
          style={{
            position: "absolute",
            right: thirdColumnLayout.thirdIslandRight,
            top: headerClearance,
            bottom: layout.sidebarGutter,
            width: thirdColumnLayout.thirdIslandWidth,
            backgroundColor: glass.ghostSurface,
            borderRadius: EMERGENCY_CONTACTS_SIDEBAR_HIG.SIDEBAR_CORNER_RADIUS,
            borderCurve: "continuous",
            overflow: "hidden",
          }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              gap: metrics.spacing.lg,
              paddingTop: layout.sidebarInnerPadding,
              paddingBottom: layout.sidebarInnerPadding + bottomPadding,
              paddingHorizontal: layout.sidebarInnerPaddingHorizontal,
            }}
            showsVerticalScrollIndicator={false}
          >
            <EmergencyContactsActionIsland
              isDarkMode={isDarkMode}
              primaryContact={model.primaryContact}
              reachableCount={model.reachableCount}
              reviewCount={model.reviewCount}
              selectionCount={model.selectionCount}
              backendUnavailable={model.backendUnavailable}
              syncNotice={model.syncNotice}
              onAddContact={model.openCreate}
              onReviewFirst={() =>
                model.skippedLegacyContacts[0]
                  ? model.openResolveLegacy(model.skippedLegacyContacts[0])
                  : model.openCreate()
              }
            />

            {showMigrationPane ? (
              <EmergencyContactsMigrationReviewPane
                isDarkMode={isDarkMode}
                theme={theme}
                metrics={metrics}
                skippedLegacyContacts={model.skippedLegacyContacts}
                onResolve={model.openResolveLegacy}
                onDiscard={model.discardLegacyContact}
                onDismiss={model.dismissMigrationReview}
                embedded
              />
            ) : null}
          </ScrollView>
        </BlurView>
      ) : null}
    </>
  );
}
