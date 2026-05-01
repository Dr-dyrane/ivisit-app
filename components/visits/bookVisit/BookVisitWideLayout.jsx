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
import { COLORS } from "../../../constants/colors";
import { BOOK_VISIT_SCREEN_COPY } from "./bookVisit.content";
import BookVisitActionIsland from "./BookVisitActionIsland";
import BookVisitContextPane from "./BookVisitContextPane";
import BookVisitStepPanel from "./BookVisitStepPanel";
import {
  BOOK_VISIT_SIDEBAR_HIG,
  computeBookVisitHeaderClearance,
  computeBookVisitThirdColumnLayout,
  getBookVisitSidebarGlassTokens,
} from "./bookVisitSidebarLayout";

export default function BookVisitWideLayout({
  isDarkMode,
  theme,
  metrics,
  layout,
  surfaceConfig,
  viewportVariant,
  bottomPadding,
  model,
  loading = false,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const glass = useMemo(
    () => getBookVisitSidebarGlassTokens({ isDarkMode }),
    [isDarkMode],
  );
  const headerClearance = useMemo(
    () =>
      computeBookVisitHeaderClearance({
        surfaceConfig,
        insetsTop: insets.top,
      }),
    [insets.top, surfaceConfig],
  );
  const thirdColumnLayout = useMemo(
    () =>
      computeBookVisitThirdColumnLayout({
        layout,
        viewportVariant,
        width,
      }),
    [layout, viewportVariant, width],
  );
  const showThirdColumn = thirdColumnLayout.usesThirdColumn === true;
  const centerPanelMaxWidth = showThirdColumn ? 760 : 780;

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
              letterSpacing: 0.3,
              color: COLORS.brandPrimary,
              opacity: 0.72,
              lineHeight: 12,
            }}
          >
            {BOOK_VISIT_SCREEN_COPY.screen.title}
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
          borderRadius: BOOK_VISIT_SIDEBAR_HIG.SIDEBAR_CORNER_RADIUS,
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
          <BookVisitContextPane
            theme={theme}
            metrics={metrics}
            stepMeta={model.stepMeta}
            selections={model.selections}
            quoteLabel={model.quoteLabel}
            progressValue={model.progressValue}
            loading={loading}
          />
        </ScrollView>
      </BlurView>

      <View
        style={{
          flex: 1,
          minWidth: 0,
          marginRight: showThirdColumn
            ? thirdColumnLayout.centerPanelMarginRight
            : 0,
          paddingTop: headerClearance,
          paddingBottom: bottomPadding,
          paddingLeft: layout.rightPanelLeftPadding,
          paddingRight: layout.rightPanelRightPadding,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: centerPanelMaxWidth,
            minWidth: 0,
            alignSelf: "flex-start",
            flex: 1,
          }}
        >
          <BookVisitStepPanel
            theme={theme}
            metrics={metrics}
            model={model}
            loading={loading}
          />
        </View>
      </View>

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
            borderRadius: BOOK_VISIT_SIDEBAR_HIG.SIDEBAR_CORNER_RADIUS,
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
            <BookVisitActionIsland
              theme={theme}
              metrics={metrics}
              currentStepLabel={model.currentStepLabel}
              nextStepLabel={model.nextStepLabel}
              selections={model.selections}
              quoteLabel={model.quoteLabel}
              loading={loading}
            />
          </ScrollView>
        </BlurView>
      ) : null}
    </>
  );
}
