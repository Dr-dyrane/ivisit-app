import React, { useMemo } from "react";
import {
  Image,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { SEARCH_SCREEN_COPY } from "./searchScreen.content";
import SearchActionIsland from "./SearchActionIsland";
import SearchContextPane from "./SearchContextPane";
import SearchMainContent from "./SearchMainContent";
import {
  computeSearchHeaderClearance,
  computeSearchThirdColumnLayout,
  getSearchSidebarGlassTokens,
  SEARCH_SIDEBAR_HIG,
} from "./searchSidebarLayout";

export default function SearchWideLayout({
  isDarkMode,
  theme,
  metrics,
  layout,
  surfaceConfig,
  viewportVariant,
  bottomPadding,
  model,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const glass = useMemo(
    () => getSearchSidebarGlassTokens({ isDarkMode }),
    [isDarkMode],
  );
  const headerClearance = useMemo(
    () =>
      computeSearchHeaderClearance({
        surfaceConfig,
        insetsTop: insets.top,
      }),
    [insets.top, surfaceConfig],
  );
  const thirdColumnLayout = useMemo(
    () =>
      computeSearchThirdColumnLayout({
        layout,
        viewportVariant,
        width,
      }),
    [layout, viewportVariant, width],
  );
  const showThirdColumn = thirdColumnLayout.usesThirdColumn === true;
  const centerPanelMaxWidth = showThirdColumn ? 820 : 780;

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
          source={require("../../assets/logo.png")}
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
              letterSpacing: 0.3,
              color: COLORS.brandPrimary,
              opacity: 0.72,
              lineHeight: 12,
            }}
          >
            {SEARCH_SCREEN_COPY.screen.title}
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
          borderRadius: SEARCH_SIDEBAR_HIG.SIDEBAR_CORNER_RADIUS,
          borderCurve: "continuous",
          overflow: "hidden",
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            gap: metrics.spacing.xl,
            paddingTop: layout.sidebarInnerPadding,
            paddingBottom: layout.sidebarInnerPadding + bottomPadding,
            paddingHorizontal: layout.sidebarInnerPaddingHorizontal,
          }}
          showsVerticalScrollIndicator={false}
        >
          <SearchContextPane
            theme={theme}
            metrics={metrics}
            recentCountLabel={model.recentCountLabel}
            trendLabel={model.topTrendLabel}
            focusLabel={model.focusLabel}
            primaryActionLabel={model.primaryActionLabel}
            onPrimaryAction={model.onPrimaryAction}
            loading={model.historyLoading && !model.hasQuery}
          />
        </ScrollView>
      </BlurView>

      <ScrollView
        style={{
          flex: 1,
          minWidth: 0,
          marginRight: showThirdColumn
            ? thirdColumnLayout.centerPanelMarginRight
            : 0,
        }}
        contentContainerStyle={{
          paddingTop: headerClearance,
          paddingBottom: bottomPadding,
          paddingLeft: layout.rightPanelLeftPadding,
          paddingRight: layout.rightPanelRightPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: "100%",
            maxWidth: centerPanelMaxWidth,
            minWidth: 0,
            alignSelf: "flex-start",
            gap: metrics.spacing.lg,
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontSize: Math.max(metrics.typography.title.fontSize + 4, 24),
              lineHeight: Math.max(metrics.typography.title.lineHeight + 6, 30),
              fontWeight: "700",
              letterSpacing: -0.35,
            }}
          >
            {model.centerTitle}
          </Text>

          <SearchMainContent
            model={model}
            isDarkMode={isDarkMode}
            theme={theme}
            metrics={metrics}
            contentPaddingHorizontal={0}
          />
        </View>
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
            borderRadius: SEARCH_SIDEBAR_HIG.SIDEBAR_CORNER_RADIUS,
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
            <SearchActionIsland
              theme={theme}
              metrics={metrics}
              isDarkMode={isDarkMode}
              resultCountLabel={model.resultCountLabel}
              recentCountLabel={model.recentCountLabel}
              topTrendLabel={model.topTrendLabel}
              primaryActionLabel={model.primaryActionLabel}
              onPrimaryAction={model.onPrimaryAction}
              trendingRows={model.actionIslandTrendRows}
              recentRows={model.actionIslandRecentRows}
              trendingLoading={model.trendingLoading}
              historyLoading={model.historyLoading}
            />
          </ScrollView>
        </BlurView>
      ) : null}
    </>
  );
}
