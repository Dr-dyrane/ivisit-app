import React, { useCallback, useEffect, useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import { useHeaderState } from "../../../contexts/HeaderStateContext";
import HeaderBackButton from "../../navigation/HeaderBackButton";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
} from "../../../utils/ui/stackViewportConfig";
import { useBookVisitScreenModel } from "../../../hooks/visits/useBookVisitScreenModel";
import { BOOK_VISIT_SCREEN_COPY } from "./bookVisit.content";
import BookVisitStageBase from "./BookVisitStageBase";
import BookVisitWideLayout from "./BookVisitWideLayout";
import BookVisitStepPanel from "./BookVisitStepPanel";
import SpecialtySearchModal from "../book-visit/SpecialtySearchModal";
import ProviderDetailsModal from "../book-visit/ProviderDetailsModal";
import {
  BOOK_VISIT_SIDEBAR_HIG,
  computeBookVisitSidebarLayout,
} from "./bookVisitSidebarLayout";

export default function BookVisitScreenOrchestrator() {
  const { isDarkMode } = useTheme();
  const { setHeaderState } = useHeaderState();
  const { width } = useWindowDimensions();
  const model = useBookVisitScreenModel();

  const viewportVariant = useMemo(
    () => getStackViewportVariant({ platform: Platform.OS, width }),
    [width],
  );
  const surfaceConfig = useMemo(
    () => getStackViewportSurfaceConfig(viewportVariant),
    [viewportVariant],
  );
  const sidebarLayout = useMemo(
    () => computeBookVisitSidebarLayout({ width, surfaceConfig }),
    [surfaceConfig, width],
  );
  const usesSidebarLayout = sidebarLayout.usesSidebarLayout;

  const headerLayoutInsets = useMemo(() => {
    if (!usesSidebarLayout) return null;
    const baseTopInset = surfaceConfig.headerTopInset || 10;
    const topInset = Math.round(
      baseTopInset * BOOK_VISIT_SIDEBAR_HIG.HEADER_TOP_INSET_REDUCTION,
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

  const backButton = useCallback(
    () => <HeaderBackButton onPress={model.handleBack} />,
    [model.handleBack],
  );

  useFocusEffect(
    useCallback(() => {
      setHeaderState({
        title: BOOK_VISIT_SCREEN_COPY.screen.title,
        subtitle: BOOK_VISIT_SCREEN_COPY.screen.subtitle,
        icon: <Ionicons name="calendar" size={26} color="#FFFFFF" />,
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
      <BookVisitStageBase isDarkMode={isDarkMode}>
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
              <BookVisitWideLayout
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
            <BookVisitStepPanel
              theme={theme}
              metrics={metrics}
              model={model}
              compact
              loading={model.isDataLoading}
            />
          );
        }}
      </BookVisitStageBase>

      <SpecialtySearchModal
        visible={model.specialtySearchVisible}
        onClose={model.closeSpecialtySearch}
        searchQuery={model.searchQuery}
        onSearchChange={model.setSearchQuery}
        specialties={model.filteredSpecialties}
        onSelect={model.handleSelectSpecialty}
      />

      <ProviderDetailsModal
        visible={model.providerModalVisible}
        onClose={model.closeProviderModal}
        provider={model.selectedProvider}
        specialty={model.bookingData.specialty}
        onConfirm={model.confirmProviderSelection}
      />
    </>
  );
}
