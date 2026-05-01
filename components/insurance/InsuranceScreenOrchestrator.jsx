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
import HeaderBackButton from "../navigation/HeaderBackButton";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
} from "../../utils/ui/stackViewportConfig";
import { INSURANCE_SCREEN_COPY } from "./insuranceScreen.content";
import InsuranceContextPane from "./InsuranceContextPane";
import InsuranceEditorModal from "./InsuranceEditorModal";
import InsurancePolicyList from "./InsurancePolicyList";
import InsuranceStageBase from "./InsuranceStageBase";
import InsuranceWideLayout from "./InsuranceWideLayout";
import { useInsuranceScreenModel } from "../../hooks/insurance/useInsuranceScreenModel";
import {
  computeInsuranceSidebarLayout,
  INSURANCE_SIDEBAR_HIG,
} from "./insuranceSidebarLayout";

// PULLBACK NOTE: InsuranceScreenOrchestrator now matches the newer stack ownership contract.
// It owns header wiring, focus refresh, and compact-vs-wide composition while the stage base owns shell and motion.

export default function InsuranceScreenOrchestrator() {
  const { isDarkMode } = useTheme();
  const { setHeaderState } = useHeaderState();
  const { width } = useWindowDimensions();
  const model = useInsuranceScreenModel();

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
    () => computeInsuranceSidebarLayout({ width, surfaceConfig }),
    [surfaceConfig, width],
  );
  const usesSidebarLayout = sidebarLayout.usesSidebarLayout;
  const headerLayoutInsets = useMemo(() => {
    if (!usesSidebarLayout) return null;
    const baseTopInset = surfaceConfig.headerTopInset || 10;
    const topInset = Math.round(
      baseTopInset * INSURANCE_SIDEBAR_HIG.HEADER_TOP_INSET_REDUCTION,
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
        title: INSURANCE_SCREEN_COPY.screen.title,
        subtitle: INSURANCE_SCREEN_COPY.screen.subtitle,
        icon: <Ionicons name="shield-checkmark" size={26} color="#FFFFFF" />,
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
      <InsuranceStageBase
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
              <InsuranceWideLayout
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
              <InsuranceContextPane
                theme={theme}
                metrics={metrics}
                coverageCountLabel={model.coverageCountLabel}
                defaultPolicyLabel={model.defaultPolicyLabel}
                lastUpdatedLabel={model.lastUpdatedLabel}
                syncNotice={model.syncNotice}
                onAddCoverage={model.openCreate}
                compact
                loading={model.isDataLoading}
              />
              <InsurancePolicyList
                policies={model.policies}
                isDarkMode={isDarkMode}
                theme={theme}
                metrics={metrics}
                loading={model.isDataLoading}
                onAddCoverage={model.openCreate}
                onEditPolicy={model.editPolicy}
                onDeletePolicy={model.deletePolicy}
                onSetDefaultPolicy={model.setDefaultPolicy}
                onLinkPayment={model.linkPayment}
                contentPaddingHorizontal={0}
              />
            </View>
          );
        }}
      </InsuranceStageBase>

      <InsuranceEditorModal
        visible={model.isEditorOpen}
        onClose={model.closeEditor}
        draft={model.draft}
        step={model.step}
        isEditing={model.isEditing}
        isSubmitting={model.isSubmitting}
        isScanning={model.isScanning}
        isDarkMode={isDarkMode}
        canAdvance={model.canAdvance}
        getInputValidation={model.getInputValidation}
        onNextStep={model.nextStep}
        onPreviousStep={model.previousStep}
        onSubmit={model.savePolicy}
        onChangeDraftField={model.updateDraftField}
        onScanInsuranceCard={model.scanInsuranceCard}
        onPickImage={model.pickImage}
      />
    </>
  );
}
