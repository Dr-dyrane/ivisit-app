import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FULL_VERSION } from "../../version";

// Muted OTA build marker at the very bottom of Settings.
// FULL_VERSION is `${runtimeVersion}.${OTA_BUILD}` (e.g. "1.0.6.50"). OTA_BUILD
// increments on every EAS update push (`npm run ota:bump`), so a tester can glance
// here and confirm they are running the newest over-the-air bundle of the current
// runtime -- a higher trailing number means a fresher fix. Display-only; the
// leading "1.0.6" is the OTA compatibility key and must not be inferred from here.
export default function SettingsVersionFooter({ isDarkMode }) {
  const color = isDarkMode ? "rgba(226,232,240,0.38)" : "rgba(71,85,105,0.42)";

  return (
    <View style={styles.container}>
      <Text
        style={[styles.text, { color }]}
        accessibilityRole="text"
        accessibilityLabel={`iVisit version ${FULL_VERSION}`}
        allowFontScaling
      >
        iVisit v{FULL_VERSION}
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
