import React, { useCallback, useEffect, useMemo } from "react";
import { Platform, View, useWindowDimensions } from "react-native";
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
import { MEDICAL_PROFILE_SCREEN_COPY } from "./medicalProfileScreen.content";
import MedicalProfileContextPane from "./MedicalProfileContextPane";
import MedicalProfileEditorModal from "./MedicalProfileEditorModal";
import MedicalProfileStageBase from "./MedicalProfileStageBase";
import MedicalProfileSummaryList from "./MedicalProfileSummaryList";
import MedicalProfileWideLayout from "./MedicalProfileWideLayout";
import { useMedicalProfileScreenModel } from "../../hooks/medicalProfile/useMedicalProfileScreenModel";
import {
  computeMedicalProfileSidebarLayout,
  MEDICAL_PROFILE_SIDEBAR_HIG,
} from "./medicalProfileSidebarLayout";

// PULLBACK NOTE: MedicalProfileScreenOrchestrator matches the newer stack ownership contract.
// It owns header wiring, focus refresh, and compact-vs-wide composition while the stage base owns shell and motion.

export default function MedicalProfileScreenOrchestrator() {
  const { isDarkMode } = useTheme();
  const { setHeaderState } = useHeaderState();
  const { width } = useWindowDimensions();
  const model = useMedicalProfileScreenModel();

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
    () => computeMedicalProfileSidebarLayout({ width, surfaceConfig }),
    [surfaceConfig, width],
  );
  const usesSidebarLayout = sidebarLayout.usesSidebarLayout;
  const headerLayoutInsets = useMemo(() => {
    if (!usesSidebarLayout) return null;
    const baseTopInset = surfaceConfig.headerTopInset || 10;
    const topInset = Math.round(
      baseTopInset * MEDICAL_PROFILE_SIDEBAR_HIG.HEADER_TOP_INSET_REDUCTION,
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
      model.refresh();
    }, [model.refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      setHeaderState({
        title: MEDICAL_PROFILE_SCREEN_COPY.screen.title,
        subtitle: MEDICAL_PROFILE_SCREEN_COPY.screen.subtitle,
        icon: <Ionicons name="fitness" size={26} color="#FFFFFF" />,
        backgroundColor: COLORS.brandPrimary,
        leftComponent: backButton(),
        rightComponent: null,
        scrollAware: false,
        layoutInsets: headerLayoutInsets,
      });
    }, [backButton, headerLayoutInsets, setHeaderState]),
  );

  return (
    <>
      <MedicalProfileStageBase isDarkMode={isDarkMode}>
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
              <MedicalProfileWideLayout
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
            <View style={{ gap: metrics.spacing.lg }}>
              <MedicalProfileContextPane
                theme={theme}
                metrics={metrics}
                completionLabel={model.completionLabel}
                lastUpdatedLabel={model.lastUpdatedLabel}
                syncNotice={model.syncNotice}
                onEditProfile={model.openEditor}
                compact
                loading={model.isDataLoading}
              />
              <MedicalProfileSummaryList
                sections={model.sections}
                isDarkMode={isDarkMode}
                theme={theme}
                metrics={metrics}
                onEditProfile={model.openEditor}
                contentPaddingHorizontal={0}
                footerNotice={model.syncNotice}
                loading={model.isDataLoading}
              />
            </View>
          );
        }}
      </MedicalProfileStageBase>

      {!model.isDataLoading ? (
        <MedicalProfileEditorModal
          visible={model.isEditorOpen}
          onClose={model.closeEditor}
          draft={model.draft}
          onChangeField={model.updateField}
          onSave={model.saveProfile}
          isSaving={model.isSaving}
        />
      ) : null}
    </>
  );
}
