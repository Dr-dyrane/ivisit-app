import React, { createContext, useContext, useRef, useCallback, useMemo, useState } from 'react';
import { Animated, Platform, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const UnifiedScrollContext = createContext(null);

// Constants
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 70;
const VISUAL_TAB_HEIGHT = Platform.OS === 'ios' ? 110 : 95;
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
  const HIDE_DISTANCE = VISUAL_TAB_HEIGHT + insets.bottom;

  // Animation values
  const tabTranslateY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;

  // State tracking
  const lastScrollY = useRef(0);
  const isAnimating = useRef(false);
  const isTabHidden = useRef(false);
  const isHeaderHidden = useRef(false);
  const isLockedHidden = useRef(false);
  const debounceTimer = useRef(null);

  // Reactive state
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const [isTabBarLockedHidden, setIsTabBarLockedHidden] = useState(false);

  // Synchronized show animations with smooth bezier easing
  const showBoth = useCallback(() => {
    if (isLockedHidden.current) return;
    if (!isTabHidden.current && !isHeaderHidden.current) return;
    if (isAnimating.current) return;

    isAnimating.current = true;
    isTabHidden.current = false;
    isHeaderHidden.current = false;
    setIsTabBarHidden(false);

    // Smooth parallel animations with Apple-style easing
    Animated.parallel([
      // Tab bar slides up with smooth ease-out
      Animated.timing(tabTranslateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: Easing.bezier(...EASING_BEZIER.SHOW),
        useNativeDriver: true,
      }),
      // Header fades in with smooth ease-out
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        easing: Easing.bezier(...EASING_BEZIER.SHOW),
        useNativeDriver: true,
      }),
      // Title fades in with slight delay for natural feel
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION + 50, // Slightly longer for title
        easing: Easing.bezier(...EASING_BEZIER.SHOW),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
    });
  }, [tabTranslateY, headerOpacity, titleOpacity]);

  // Synchronized hide animations with smooth bezier easing
  const hideBoth = useCallback(() => {
    if (isTabHidden.current && isHeaderHidden.current) return;
    if (isAnimating.current) return;

    isAnimating.current = true;
    isTabHidden.current = true;
    isHeaderHidden.current = true;
    setIsTabBarHidden(true);

    // Smooth parallel animations with Apple-style ease-in
    Animated.parallel([
      // Tab bar slides down with smooth ease-in
      Animated.timing(tabTranslateY, {
        toValue: HIDE_DISTANCE,
        duration: ANIMATION_DURATION,
        easing: Easing.bezier(...EASING_BEZIER.HIDE),
        useNativeDriver: true,
      }),
      // Header fades out with smooth ease-in
      Animated.timing(headerOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: Easing.bezier(...EASING_BEZIER.HIDE),
        useNativeDriver: true,
      }),
      // Title fades out with smooth ease-in
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION - 50, // Slightly faster for title
        easing: Easing.bezier(...EASING_BEZIER.HIDE),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
    });
  }, [tabTranslateY, headerOpacity, titleOpacity, HIDE_DISTANCE]);

  // Debounced scroll handler with improved sensitivity
  const handleScroll = useCallback((event) => {
    if (isLockedHidden.current) return;

    // Extract scroll position immediately before event is recycled
    const currentScrollY = event.nativeEvent.contentOffset.y;

    // Clear existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the scroll handling
    debounceTimer.current = setTimeout(() => {
      const diff = currentScrollY - lastScrollY.current;

      // Higher threshold to reduce jitter
      if (Math.abs(diff) < MIN_SCROLL_DIFF) return;

      // Don't hide if near top
      if (currentScrollY < SCROLL_THRESHOLD) {
        showBoth();
        lastScrollY.current = currentScrollY;
        return;
      }

      // Determine scroll direction and animate accordingly
      if (diff > 0) {
        // Scrolling down - hide both with smooth ease-in
        hideBoth();
      } else {
        // Scrolling up - show both with smooth ease-out
        showBoth();
      }

      lastScrollY.current = currentScrollY;
    }, DEBOUNCE_DELAY);
  }, [hideBoth, showBoth]);

  // Reset both animations with spring easing for natural feel
  const resetBoth = useCallback(() => {
    if (isLockedHidden.current) return;
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    lastScrollY.current = 0;
    isTabHidden.current = false;
    isHeaderHidden.current = false;
    setIsTabBarHidden(false);
    
    // Spring-based reset for natural movement
    Animated.parallel([
      Animated.spring(tabTranslateY, {
        toValue: 0,
        tension: 100,  // Gentle spring tension
        friction: 8,   // Smooth damping
        useNativeDriver: true,
      }),
      Animated.spring(headerOpacity, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(titleOpacity, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [tabTranslateY, headerOpacity, titleOpacity]);

  // Lock functionality
  const lockBothHidden = useCallback(() => {
    if (isLockedHidden.current) return;
    isLockedHidden.current = true;
    setIsTabBarLockedHidden(true);
    hideBoth();
  }, [hideBoth]);

  const unlockBothHidden = useCallback(() => {
    if (!isLockedHidden.current) return;
    isLockedHidden.current = false;
    setIsTabBarLockedHidden(false);
  }, []);

  // Individual controls for fine-grained control
  const showTabBar = useCallback(() => {
    if (isLockedHidden.current || !isTabHidden.current) return;
    showBoth();
  }, [showBoth]);

  const hideTabBar = useCallback(() => {
    if (isLockedHidden.current || isTabHidden.current) return;
    hideBoth();
  }, [hideBoth]);

  const showHeader = useCallback(() => {
    if (isLockedHidden.current || !isHeaderHidden.current) return;
    showBoth();
  }, [showBoth]);

  const hideHeader = useCallback(() => {
    if (isLockedHidden.current || isHeaderHidden.current) return;
    hideBoth();
  }, [hideBoth]);

  const value = useMemo(() => ({
    // Tab bar controls
    tabTranslateY,
    showTabBar,
    hideTabBar,
    isTabBarHidden,
    isTabBarLockedHidden,
    lockTabBarHidden: lockBothHidden,
    unlockTabBarHidden: unlockBothHidden,
    TAB_BAR_HEIGHT,
    HIDE_DISTANCE,
    
    // Header controls
    headerOpacity,
    titleOpacity,
    showHeader,
    hideHeader,
    lockHeaderHidden: lockBothHidden,
    unlockHeaderHidden: unlockBothHidden,
    HEADER_HEIGHT,
    
    // Unified controls
    handleScroll,
    resetBoth,
    showBoth,
    hideBoth,
  }), [
    tabTranslateY, headerOpacity, titleOpacity,
    showTabBar, hideTabBar, showHeader, hideHeader,
    handleScroll, resetBoth, showBoth, hideBoth,
    isTabBarHidden, isTabBarLockedHidden,
    lockBothHidden, unlockBothHidden,
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
