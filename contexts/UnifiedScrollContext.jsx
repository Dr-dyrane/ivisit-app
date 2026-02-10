import React, { createContext, useContext, useRef, useCallback, useMemo, useState } from 'react';
import { Animated, Platform, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const UnifiedScrollContext = createContext(null);

// Constants
const VISUAL_TAB_HEIGHT = Platform.OS === 'ios' ? 70 : 65;
const HEADER_HEIGHT = 140;
const ANIMATION_DURATION = 400; // Longer for smoother feel
const SCROLL_THRESHOLD = 50;
const DEBOUNCE_DELAY = 16; // ~60fps
const MIN_SCROLL_DIFF = 8; // Higher threshold to reduce jitter

// Apple-style bezier easing curves
const EASING_BEZIER = {
  // Smooth ease-out for showing elements (like iOS navigation bar)
  SHOW: Platform.OS === 'ios'
    ? [0.25, 0.46, 0.45, 0.94]  // iOS-style ease-out
    : [0.25, 0.46, 0.45, 0.94], // Same for Android

  // Smooth ease-in for hiding elements (like iOS control center)
  HIDE: Platform.OS === 'ios'
    ? [0.55, 0.085, 0.68, 0.53] // iOS-style ease-in
    : [0.55, 0.085, 0.68, 0.53], // Same for Android

  // Gentle spring-like ease for natural movement
  SPRING: [0.175, 0.885, 0.32, 1.275],
};

export function UnifiedScrollProvider({ children }) {
  const insets = useSafeAreaInsets();
  const effectivePadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 20 : 12);
  const HIDE_DISTANCE = VISUAL_TAB_HEIGHT + effectivePadding;
  const TAB_BAR_HEIGHT = HIDE_DISTANCE;

  // Animation values
  const tabTranslateY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;

  // State tracking
  // State tracking
  const lastScrollY = useRef(0);
  const isAnimating = useRef(false);
  const isTabHidden = useRef(false);
  const isHeaderHidden = useRef(false);
  const isTabBarLockedHidden = useRef(false);
  const isHeaderLockedHidden = useRef(false);
  const debounceTimer = useRef(null);

  // Reactive state
  const [isTabBarHiddenState, setIsTabBarHiddenState] = useState(false);
  const [isTabBarLockedHiddenState, setIsTabBarLockedHiddenState] = useState(false);
  const [isHeaderLockedHiddenState, setIsHeaderLockedHiddenState] = useState(false);

  // Synchronized show animations
  const showBoth = useCallback(() => {
    if (isAnimating.current) return;

    const canShowTab = !isTabBarLockedHidden.current;
    const canShowHeader = !isHeaderLockedHidden.current;

    if (!canShowTab && !canShowHeader) return;
    if (isTabHidden.current === !canShowTab && isHeaderHidden.current === !canShowHeader) return;

    isAnimating.current = true;

    const animations = [];
    if (canShowTab && isTabHidden.current) {
      animations.push(Animated.timing(tabTranslateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: Easing.bezier(...EASING_BEZIER.SHOW),
        useNativeDriver: true,
      }));
      isTabHidden.current = false;
      setIsTabBarHiddenState(false);
    }

    if (canShowHeader && isHeaderHidden.current) {
      animations.push(Animated.timing(headerOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        easing: Easing.bezier(...EASING_BEZIER.SHOW),
        useNativeDriver: true,
      }));
      animations.push(Animated.timing(titleOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION + 50,
        easing: Easing.bezier(...EASING_BEZIER.SHOW),
        useNativeDriver: true,
      }));
      isHeaderHidden.current = false;
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start(() => {
        isAnimating.current = false;
      });
    } else {
      isAnimating.current = false;
    }
  }, [tabTranslateY, headerOpacity, titleOpacity]);

  // Synchronized hide animations
  const hideBoth = useCallback(() => {
    if (isAnimating.current) return;
    if (isTabHidden.current && isHeaderHidden.current) return;

    isAnimating.current = true;

    Animated.parallel([
      Animated.timing(tabTranslateY, {
        toValue: HIDE_DISTANCE,
        duration: ANIMATION_DURATION,
        easing: Easing.bezier(...EASING_BEZIER.HIDE),
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: Easing.bezier(...EASING_BEZIER.HIDE),
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION - 50,
        easing: Easing.bezier(...EASING_BEZIER.HIDE),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isTabHidden.current = true;
      isHeaderHidden.current = true;
      setIsTabBarHiddenState(true);
      isAnimating.current = false;
    });
  }, [tabTranslateY, headerOpacity, titleOpacity, HIDE_DISTANCE]);

  const handleScroll = useCallback((event) => {
    // Lock check - if both locked, don't handle scroll
    if (isTabBarLockedHidden.current && isHeaderLockedHidden.current) return;

    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const diff = currentScrollY - lastScrollY.current;
      if (Math.abs(diff) < MIN_SCROLL_DIFF) return;

      if (currentScrollY < SCROLL_THRESHOLD) {
        showBoth();
        lastScrollY.current = currentScrollY;
        return;
      }

      if (diff > 0) {
        hideBoth();
      } else {
        showBoth();
      }
      lastScrollY.current = currentScrollY;
    }, DEBOUNCE_DELAY);
  }, [hideBoth, showBoth]);

  const resetBoth = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    lastScrollY.current = 0;

    const animations = [];
    if (!isTabBarLockedHidden.current) {
      animations.push(Animated.spring(tabTranslateY, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }));
      isTabHidden.current = false;
      setIsTabBarHiddenState(false);
    }

    if (!isHeaderLockedHidden.current) {
      animations.push(Animated.spring(headerOpacity, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }));
      animations.push(Animated.spring(titleOpacity, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }));
      isHeaderHidden.current = false;
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, [tabTranslateY, headerOpacity, titleOpacity]);

  const lockTabBarHidden = useCallback(() => {
    if (isTabBarLockedHidden.current) return;
    isTabBarLockedHidden.current = true;
    setIsTabBarLockedHiddenState(true);

    // Animate tab specifically
    Animated.timing(tabTranslateY, {
      toValue: HIDE_DISTANCE,
      duration: ANIMATION_DURATION,
      easing: Easing.bezier(...EASING_BEZIER.HIDE),
      useNativeDriver: true,
    }).start(() => {
      isTabHidden.current = true;
      setIsTabBarHiddenState(true);
    });
  }, [tabTranslateY, HIDE_DISTANCE]);

  const unlockTabBarHidden = useCallback(() => {
    if (!isTabBarLockedHidden.current) return;
    isTabBarLockedHidden.current = false;
    setIsTabBarLockedHiddenState(false);
    // Explicitly show to ensure navigation reappears
    showBoth();
  }, [showBoth]);

  const lockHeaderHidden = useCallback(() => {
    if (isHeaderLockedHidden.current) return;
    isHeaderLockedHidden.current = true;
    setIsHeaderLockedHiddenState(true);

    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: Easing.bezier(...EASING_BEZIER.HIDE),
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION - 50,
        easing: Easing.bezier(...EASING_BEZIER.HIDE),
        useNativeDriver: true,
      })
    ]).start(() => {
      isHeaderHidden.current = true;
    });
  }, [headerOpacity, titleOpacity]);

  const unlockHeaderHidden = useCallback(() => {
    if (!isHeaderLockedHidden.current) return;
    isHeaderLockedHidden.current = false;
    setIsHeaderLockedHiddenState(false);
    showBoth();
  }, [showBoth]);

  const value = useMemo(() => ({
    tabTranslateY,
    showTabBar: showBoth,
    hideTabBar: hideBoth,
    isTabBarHidden: isTabBarHiddenState,
    isTabBarLockedHidden: isTabBarLockedHiddenState,
    lockTabBarHidden,
    unlockTabBarHidden,
    TAB_BAR_HEIGHT,
    HIDE_DISTANCE,

    headerOpacity,
    titleOpacity,
    showHeader: showBoth,
    hideHeader: hideBoth,
    isHeaderLockedHidden: isHeaderLockedHiddenState,
    lockHeaderHidden,
    unlockHeaderHidden,
    HEADER_HEIGHT,

    handleScroll,
    resetBoth,
    showBoth,
    hideBoth,
  }), [
    tabTranslateY, headerOpacity, titleOpacity,
    isTabBarHiddenState, isTabBarLockedHiddenState, isHeaderLockedHiddenState,
    lockTabBarHidden, unlockTabBarHidden, lockHeaderHidden, unlockHeaderHidden,
    handleScroll, resetBoth, showBoth, hideBoth,
    TAB_BAR_HEIGHT, HIDE_DISTANCE, HEADER_HEIGHT,
  ]);

  return (
    <UnifiedScrollContext.Provider value={value}>
      {children}
    </UnifiedScrollContext.Provider>
  );
}

export function useUnifiedScroll() {
  const context = useContext(UnifiedScrollContext);
  if (!context) {
    throw new Error('useUnifiedScroll must be used within a UnifiedScrollProvider');
  }
  return context;
}

export default UnifiedScrollContext;
