import { Platform, StyleSheet } from "react-native";

// Only topSlot chrome and phone chip styles live here.
// Card-level styles (orb, title, description, input shell, OTP row, feedback)
// are now owned by MapAuthQuestionCard in components/map/shared/.

const styles = StyleSheet.create({
  bodyContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === "android" ? 2 : 0,
    paddingBottom: 16,
  },
  webWideContentInset: {
    paddingHorizontal: 20,
  },

  // ── TopSlot chrome ────────────────────────────────────────────────────────
  topSlot: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 0,
    paddingTop: 0,
    marginTop: Platform.OS === "android" ? -6 : 0,
  },
  topSlotSpacer: {
    width: 38,
    height: 38,
  },
  topSlotCopy: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  topSlotTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center",
  },
  topSlotSubtitle: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  topSlotAction: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  topSlotCloseButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Phone step: country chip ──────────────────────────────────────────────
  phoneCountryChip: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 2,
    paddingRight: 6,
    borderRadius: 19,
    borderCurve: "continuous",
  },
  phoneCountryChipPressed: {
    transform: [{ scale: 0.98 }, { translateY: 1 }],
  },
  phoneCountryChipDisabled: {
    opacity: 0.68,
  },
  phoneCountryFlag: {
    marginRight: 1,
  },
  phoneCountryDial: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
});

export default styles;
