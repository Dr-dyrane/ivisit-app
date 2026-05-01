import React, { useCallback, useMemo } from "react";
import { Platform, View } from "react-native";
import { useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../../../contexts/ThemeContext";
import { useHeaderState } from "../../../contexts/HeaderStateContext";
import { useFAB } from "../../../contexts/FABContext";
import { COLORS } from "../../../constants/colors";
import HeaderBackButton from "../../navigation/HeaderBackButton";
import { SelectionToolbar } from "../ContactCard";
import { useEmergencyContactsScreenModel } from "../../../hooks/emergency/useEmergencyContactsScreenModel";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
} from "../../../utils/ui/stackViewportConfig";
import EmergencyContactsStageBase from "./EmergencyContactsStageBase";
import EmergencyContactsListPane from "./EmergencyContactsListPane";
import EmergencyContactsMigrationReviewPane from "./EmergencyContactsMigrationReviewPane";
import EmergencyContactsEditorModal from "./EmergencyContactsEditorModal";
import EmergencyContactsWideLayout from "./EmergencyContactsWideLayout";
import { EMERGENCY_CONTACTS_COPY } from "./emergencyContacts.content";
import {
  computeEmergencyContactsSidebarLayout,
  EMERGENCY_CONTACTS_SIDEBAR_HIG,
} from "./emergencyContactsSidebarLayout";

// PULLBACK NOTE: EmergencyContacts screen orchestrator follows the payment stack pattern.
// OLD: Header/FAB wiring existed, but viewport-aware shell decisions still lived inside a simple stacked render.
// NEW: Orchestrator computes wide-screen header insets, chooses compact vs wide surface, and delegates shell ownership downstream.
// REASON: Match payment's MD+/desktop contract while keeping the route and model thin.

export default function EmergencyContactsScreenOrchestrator() {
  const { isDarkMode } = useTheme();
  const { setHeaderState } = useHeaderState();
  const { registerFAB, unregisterFAB } = useFAB();
  const { width } = useWindowDimensions();
  const model = useEmergencyContactsScreenModel();

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
    () => computeEmergencyContactsSidebarLayout({ width, surfaceConfig }),
    [width, surfaceConfig],
  );
  const usesSidebarLayout = sidebarLayout.usesSidebarLayout;
  const headerLayoutInsets = useMemo(() => {
    if (!usesSidebarLayout) return null;
    const baseTopInset = surfaceConfig.headerTopInset || 10;
    const topInset = Math.round(
      baseTopInset * EMERGENCY_CONTACTS_SIDEBAR_HIG.HEADER_TOP_INSET_REDUCTION,
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
        title: EMERGENCY_CONTACTS_COPY.screen.title,
        subtitle: EMERGENCY_CONTACTS_COPY.screen.subtitle,
        icon: <Ionicons name="people" size={26} color="#FFFFFF" />,
        backgroundColor: COLORS.brandPrimary,
        leftComponent: backButton(),
        rightComponent: null,
        scrollAware: false,
        layoutInsets: headerLayoutInsets,
      });

      registerFAB("emergency-contacts-add", {
        icon: EMERGENCY_CONTACTS_COPY.fab.icon,
        label: EMERGENCY_CONTACTS_COPY.fab.label,
        subText: EMERGENCY_CONTACTS_COPY.fab.subText,
        visible: true,
        onPress: model.openCreate,
        style: "primary",
        haptic: "medium",
        priority: 7,
        animation: "prominent",
        allowInStack: true,
      });

      return () => {
        unregisterFAB("emergency-contacts-add");
      };
    }, [
      backButton,
      headerLayoutInsets,
      model.openCreate,
      registerFAB,
      setHeaderState,
      unregisterFAB,
    ]),
  );

  return (
    <>
      {model.selectionCount > 0 && !usesSidebarLayout ? (
        <SelectionToolbar
          selectedCount={model.selectionCount}
          onClear={model.clearSelection}
          onDelete={model.bulkDelete}
          isDarkMode={isDarkMode}
        />
      ) : null}

      <EmergencyContactsStageBase isDarkMode={isDarkMode}>
        {({
          theme,
          metrics,
          surfaceConfig: stageSurfaceConfig,
          bottomPadding,
          layout,
          viewportVariant: stageViewportVariant,
        }) => {
          const showMigrationPane =
            model.needsMigrationReview &&
            model.skippedLegacyContacts.length > 0;

          if (layout?.usesSidebarLayout) {
            return (
              <EmergencyContactsWideLayout
                isDarkMode={isDarkMode}
                theme={theme}
                metrics={metrics}
                layout={layout}
                surfaceConfig={stageSurfaceConfig}
                viewportVariant={stageViewportVariant}
                bottomPadding={bottomPadding}
                model={model}
                showMigrationPane={showMigrationPane}
              />
            );
          }

          return (
            <View style={{ gap: metrics.spacing.lg }}>
              {showMigrationPane ? (
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
            </View>
          );
        }}
      </EmergencyContactsStageBase>

      <EmergencyContactsEditorModal
        visible={model.editorVisible}
        editorMode={model.editorMode}
        editingId={model.editingId}
        wizardStep={model.wizardStep}
        draft={model.draft}
        isSaving={model.isSaving}
        isCurrentStepValid={model.isCurrentStepValid}
        canSave={model.canSave}
        onClose={model.resetEditor}
        onSave={model.saveContact}
        onNext={model.attemptNextStep}
        onBack={() => model.transitionStep(model.wizardStep - 1)}
        onChangeField={model.setDraftField}
        onPhoneChange={model.setPhoneDraft}
        getInputValidation={model.getInputValidation}
        theme={themeBridge(isDarkMode)}
      />
    </>
  );
}

function themeBridge(isDarkMode) {
  return {
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    muted: isDarkMode ? "#94A3B8" : "#64748B",
    border: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
  };
}
