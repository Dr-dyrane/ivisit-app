import React, { createContext, useContext, useRef, useCallback, useMemo } from 'react';
import { Animated, Platform } from 'react-native';

const ScrollAwareHeaderContext = createContext(null);

const HEADER_HEIGHT = 140;
const ANIMATION_DURATION = 250;
const SCROLL_THRESHOLD = 50;

export function ScrollAwareHeaderProvider({ children }) {
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;

  const lastScrollY = useRef(0);
  const isAnimating = useRef(false);
  const isHidden = useRef(false);

  const showHeader = useCallback(() => {
    if (!isHidden.current || isAnimating.current) return;

    isAnimating.current = true;
    isHidden.current = false;

    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
    });
  }, [headerOpacity, titleOpacity]);

  const hideHeader = useCallback(() => {
    if (isHidden.current || isAnimating.current) return;

    isAnimating.current = true;
    isHidden.current = true;

    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
    });
  }, [headerOpacity, titleOpacity]);

  const handleScroll = useCallback((event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const diff = currentScrollY - lastScrollY.current;

    if (Math.abs(diff) < 5) return;

    if (currentScrollY < SCROLL_THRESHOLD) {
      showHeader();
      lastScrollY.current = currentScrollY;
      return;
    }

    if (diff > 0) {
      hideHeader();
    } else {
      showHeader();
    }

    lastScrollY.current = currentScrollY;
  }, [hideHeader, showHeader]);

  const resetHeader = useCallback(() => {
    lastScrollY.current = 0;
    isHidden.current = false;
    headerOpacity.setValue(1);
    titleOpacity.setValue(1);
  }, [headerOpacity, titleOpacity]);

  const value = useMemo(() => ({
    headerOpacity,
    titleOpacity,
    handleScroll,
    showHeader,
    hideHeader,
    resetHeader,
    HEADER_HEIGHT,
  }), [headerOpacity, titleOpacity, handleScroll, showHeader, hideHeader, resetHeader]);

  return (
    <ScrollAwareHeaderContext.Provider value={value}>
      {children}
    </ScrollAwareHeaderContext.Provider>
  );
}

export function useScrollAwareHeader() {
  const context = useContext(ScrollAwareHeaderContext);
  if (!context) {
    throw new Error('useScrollAwareHeader must be used within ScrollAwareHeaderProvider');
  }
  return context;
}

export default ScrollAwareHeaderContext;
