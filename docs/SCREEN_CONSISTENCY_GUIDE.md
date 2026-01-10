# Screen Consistency Guide for (stacks) Routes

## Overview
All screens in `app/(user)/(stacks)/` should follow a unified visual design system for consistent UX across the app.

## Applied Pattern (Option 2: Visual Consistency)
Each screen maintains its unique UX but follows standardized:
- **Animations**
- **Spacing & Padding**
- **Card Styling**
- **Typography**
- **Color System**
- **Interaction Feedback**

---

## Core Standards

### 1. Imports
Every (stacks) screen should import:
```jsx
import { useCallback, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, Platform,
  Animated, Pressable, Modal, TextInput, // as needed
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import * as Haptics from "expo-haptics";
```

### 2. Header Setup
All screens must set up their header on focus:
```jsx
useFocusEffect(
  useCallback(() => {
    resetTabBar();
    resetHeader();
    setHeaderState({
      title: "Screen Title",
      subtitle: "CONTEXT",
      icon: <Ionicons name="icon-name" size={26} color="#FFFFFF" />,
      backgroundColor: COLORS.brandPrimary,
      leftComponent: backButton(),
      rightComponent: null,
    });
  }, [backButton, resetHeader, resetTabBar, setHeaderState])
);
```

### 3. Animations on Mount
Add fade + slide animations for all screens:
```jsx
const fadeAnim = useRef(new Animated.Value(0)).current;
const slideAnim = useRef(new Animated.Value(30)).current;

useEffect(() => {
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }),
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }),
  ]).start();
}, []);
```

### 4. Color System
Use consistent color object:
```jsx
const colors = {
  text: isDarkMode ? "#FFFFFF" : "#0F172A",
  textMuted: isDarkMode ? "#94A3B8" : "#64748B",
  card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
  inputBg: isDarkMode ? "#0B0F1A" : "#F3F4F6",
};
```

### 5. Padding & Spacing
**Horizontal padding**: 20px
**Vertical gaps between items**: 12px
**Card padding**: 20px
**Card border-radius**: 30px

ScrollView contentContainerStyle:
```jsx
contentContainerStyle={{
  paddingTop: topPadding,
  paddingBottom: bottomPadding,
  paddingHorizontal: 20,
}}
```

### 6. Card Styling
Wrap content in cards with:
```jsx
<View
  style={{
    backgroundColor: colors.card,
    borderRadius: 30,
    padding: 20,
    marginBottom: 12, // gap between cards
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0 : 0.03,
    shadowRadius: 10,
  }}
>
  {/* content */}
</View>
```

### 7. Typography
| Element | Font Size | Weight | Letter Spacing |
|---------|-----------|--------|-----------------|
| Screen Title | 24 | 900 | -0.5 |
| Section Header | 10 | 900 | 3 (uppercase) |
| Card Title | 19 | 900 | -0.5 |
| Card Subtitle | 14 | 600 | - |
| Body Text | 14 | 400 | - |
| Labels | 10 | 900 | 3 |

### 8. Haptics on Interaction
Add haptic feedback to all interactions:
```jsx
onPress={() => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // action
}}
```

Feedback styles:
- **Light**: toggles, selection
- **Medium**: card taps, navigation
- **Heavy**: delete/destructive

### 9. Animation Wrapper Pattern
Wrap animated sections:
```jsx
<Animated.View
  style={{
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  }}
>
  {/* content */}
</Animated.View>
```

### 10. Scroll Handlers
All screens handle scroll for header/tabbar:
```jsx
const handleScroll = useCallback(
  (event) => {
    handleTabBarScroll(event);
    handleHeaderScroll(event);
  },
  [handleHeaderScroll, handleTabBarScroll]
);
```

---

## Screens Already Standardized ✅

| Screen | Animations | Padding | Cards | Typography |
|--------|-----------|---------|-------|-----------|
| SettingsScreen | ✅ | ✅ | ✅ | ✅ |
| HelpSupportScreen | ✅ | ✅ | ✅ | ✅ |
| InsuranceScreen | ✅ | ✅ | ✅ | ✅ |
| MoreScreen | ✅ | ✅ | ✅ | ✅ |
| ProfileScreen | ✅ | ✅ | ✅ | ✅ |

---

## Screens Needing Standardization

| Screen | Priority | Notes |
|--------|----------|-------|
| MedicalProfileScreen | HIGH | Form-heavy, needs animation refactor |
| EmergencyContactsScreen | HIGH | Complex form + list, update card styling |
| NotificationsScreen | MEDIUM | List view, add animation wrapper |
| ChangePasswordScreen | MEDIUM | Password form, add animations |
| CreatePasswordScreen | MEDIUM | Password form, add animations |
| BookVisitScreen | MEDIUM | Booking flow, standardize spacing |
| SearchScreen | LOW | Search interface, refactor styling |
| CompleteProfileScreen | LOW | Onboarding, verify compliance |

---

## Refactor Checklist

For each remaining screen, ensure:

- [ ] Imports include `Animated`, `useRef`, `useEffect`
- [ ] Header setup via `useFocusEffect`
- [ ] Fade + slide animation on mount
- [ ] `paddingHorizontal: 20` on ScrollView
- [ ] Color object with text/textMuted/card
- [ ] Cards have `borderRadius: 30, padding: 20`
- [ ] Cards have shadow styling
- [ ] 12px gaps between sections
- [ ] Typography follows guide
- [ ] Haptics on all interactions
- [ ] Animations wrap content sections
- [ ] Scroll handlers connected to header/tabbar
- [ ] Old StyleSheet cleaned up (inline styles preferred)

---

## Example: Minimal Standardized Screen

```jsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";

export default function ExampleScreen() {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { setHeaderState } = useHeaderState();
  const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
  const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();

  const backButton = useCallback(() => <HeaderBackButton />, []);

  useFocusEffect(
    useCallback(() => {
      resetTabBar();
      resetHeader();
      setHeaderState({
        title: "Example",
        subtitle: "CONTEXT",
        icon: <Ionicons name="icon" size={26} color="#FFFFFF" />,
        backgroundColor: COLORS.brandPrimary,
        leftComponent: backButton(),
        rightComponent: null,
      });
    }, [backButton, resetHeader, resetTabBar, setHeaderState])
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleScroll = useCallback(
    (event) => { handleTabBarScroll(event); handleHeaderScroll(event); },
    [handleHeaderScroll, handleTabBarScroll]
  );

  const backgroundColors = isDarkMode
    ? ["#121826", "#0B0F1A", "#121826"]
    : ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

  const colors = {
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
  };

  const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
  const bottomPadding = tabBarHeight + 20;
  const topPadding = STACK_TOP_PADDING;

  return (
    <LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 30,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDarkMode ? 0 : 0.03,
              shadowRadius: 10,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
              Title
            </Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>
              Subtitle
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
```

---

## Notes for Future Developers

1. **Never** use old `styles.content` pattern - inline padding in contentContainerStyle
2. **Always** wrap animated content in `Animated.View` with fade + slide
3. **Always** add haptics to touchable elements
4. **Spacing is critical** - maintain 20px horizontal, 12px vertical gaps
5. **Dark mode support** - use `isDarkMode` for all conditional colors/opacity
6. **No hardcoded colors** - always use the `colors` object
7. **Rounded corners** - cards use `borderRadius: 30`, buttons use `borderRadius: 16`
