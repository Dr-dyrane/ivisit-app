import React from "react";
import { View, Text, StyleSheet } from "react-native";
import * as Updates from "expo-updates";
import VERSION, { OTA_BUILD } from "../../version";

// Muted OTA build marker at the very bottom of Settings, e.g. "iVisit v1.0.7.51".
//
// Runtime is read LIVE from expo-updates so the same bundle prints the correct
// runtime on every install -- essential now that updates are served to BOTH the
// 1.0.6 and 1.0.7 runtimes in parallel: a 1.0.6 install shows "1.0.6.<N>", a 1.0.7
// install shows "1.0.7.<N>". Falls back to the bundled VERSION constant in dev /
// Expo Go / web where Updates.runtimeVersion is unavailable. OTA_BUILD is the
// monotonic build counter (higher = fresher fix). Display-only.
function resolveRuntime() {
  const rt = Updates?.runtimeVersion;
  if (typeof rt === "string" && rt.length > 0) return rt;
  return VERSION;
}

export default function SettingsVersionFooter({ isDarkMode }) {
  const color = isDarkMode ? "rgba(226,232,240,0.38)" : "rgba(71,85,105,0.42)";
  const fullVersion = `${resolveRuntime()}.${OTA_BUILD}`;

  return (
    <View style={styles.container}>
      <Text
        style={[styles.text, { color }]}
        accessibilityRole="text"
        accessibilityLabel={`iVisit version ${fullVersion}`}
        allowFontScaling
      >
        iVisit v{fullVersion}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
    fontVariant: ["tabular-nums"],
  },
});
