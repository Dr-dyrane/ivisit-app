import React from "react";
import { Platform, StyleSheet, Text } from "react-native";

const WEB_EMOJI_FONT_STACK =
  'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Segoe UI Symbol, sans-serif';

export default function CountryFlagGlyph({
  flag,
  code,
  size = 22,
  style = null,
}) {
  const value =
    typeof flag === "string" && flag.trim().length > 0
      ? flag.trim()
      : typeof code === "string" && code.trim().length > 0
        ? code.trim().slice(0, 2).toUpperCase()
        : "\u{1F310}";

  return (
    <Text
      allowFontScaling={false}
      style={[
        styles.base,
        Platform.OS === "web"
          ? {
              fontFamily: WEB_EMOJI_FONT_STACK,
            }
          : null,
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.08),
        },
        style,
      ]}
    >
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    textAlign: "center",
    includeFontPadding: false,
  },
});
