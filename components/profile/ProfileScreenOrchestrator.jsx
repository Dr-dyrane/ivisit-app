import React, { useCallback, useEffect, useMemo } from "react";
import { Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useWindowDimensions } from "react-native";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import HeaderBackButton from "../navigation/HeaderBackButton";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
} from "../../utils/ui/stackViewportConfig";
import { PROFILE_SCREEN_COPY } from "./profileScreen.content";
import ProfileStageBase from "./ProfileStageBase";
import ProfileIdentityPane from "./ProfileIdentityPane";
import ProfileWideLayout from "./ProfileWideLayout";
import ProfileActionList from "./surfaces/ProfileActionList";
import PersonalInfoSheet from "./surfaces/PersonalInfoSheet";
import ProfileDeleteAccountModal from "./ProfileDeleteAccountModal";
import { useProfileScreenModel } from "../../hooks/profile/useProfileScreenModel";
import {
  computeProfileSidebarLayout,
  PROFILE_SIDEBAR_HIG,
} from "./profileSidebarLayout";

// PULLBACK NOTE: ProfileScreenOrchestrator now matches the payment/emergency stack ownership split.
// It owns header wiring, focus refresh, and wide-vs-compact composition, but not the shell or animation boot.

export default function ProfileScreenOrchestrator() {
  const { isDarkMode } = useTheme();
  const { setHeaderState } = useHeaderState();
  const { width } = useWindowDimensions();
  const model = useProfileScreenModel();

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
    () => computeProfileSidebarLayout({ width, surfaceConfig }),
    [width, surfaceConfig],
  );
  const usesSidebarLayout = sidebarLayout.usesSidebarLayout;
  const headerLayoutInsets = useMemo(() => {
    if (!usesSidebarLayout) return null;
    const baseTopInset = surfaceConfig.headerTopInset || 10;
    const topInset = Math.round(
      baseTopInset * PROFILE_SIDEBAR_HIG.HEADER_TOP_INSET_REDUCTION,
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
        title: PROFILE_SCREEN_COPY.screen.title,
        subtitle: PROFILE_SCREEN_COPY.screen.subtitle,
        icon: <Ionicons name="person" size={26} color="#FFFFFF" />,
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
      <ProfileStageBase isDarkMode={isDarkMode}>
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
              <ProfileWideLayout
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
              <ProfileIdentityPane
                user={model.user}
                displayId={model.displayId}
                imageUri={model.imageUri}
                isDarkMode={isDarkMode}
                theme={theme}
                metrics={metrics}
                onPickImage={model.pickImage}
                compact
                loading={model.isDataLoading}
              />
              <ProfileActionList
                emergencyContacts={model.emergencyContacts}
                user={model.user}
                isDarkMode={isDarkMode}
                router={model.router}
                navigateToEmergencyContacts={model.navigateToEmergencyContacts}
                navigateToMedicalProfile={model.navigateToMedicalProfile}
                navigateToInsurance={model.navigateToInsurance}
                onPersonalInfoPress={model.openPersonalInfo}
                onDeleteAccountPress={model.openDeleteAccount}
                onSignOutPress={model.signOut}
                contentPaddingHorizontal={0}
                loading={model.isDataLoading}
              />
            </View>
          );
        }}
      </ProfileStageBase>

      <PersonalInfoSheet
        visible={model.isPersonalInfoModalOpen}
        onClose={model.closePersonalInfo}
        formState={model.formState}
        saveProfile={model.saveProfile}
        isDarkMode={isDarkMode}
      />

      <ProfileDeleteAccountModal
        visible={model.isDeleteAccountModalOpen}
        onClose={model.closeDeleteAccount}
        onConfirm={model.confirmDeleteAccount}
        isDeleting={model.isDeleting}
        theme={{
          text: isDarkMode ? "#FFFFFF" : "#0F172A",
        }}
      />
    </>
  );
}
