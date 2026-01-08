import React, { createContext, useContext, useRef, useCallback, useState } from 'react';
import { Animated, Platform } from 'react-native';

// Tab bar height constants
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 70;

const TabBarVisibilityContext = createContext(null);

export function TabBarVisibilityProvider({ children }) {
  // Animated value for tab bar translation (0 = visible, TAB_BAR_HEIGHT = hidden)
  const translateY = useRef(new Animated.Value(0)).current;

  // Track last scroll position to determine direction
  const lastScrollY = useRef(0);
  const isAnimating = useRef(false);
  const isHiddenRef = useRef(false);

  // Reactive state for components that need to know visibility
  // (e.g., bottom sheet adjusting its inset)
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);

  // Show the tab bar with smooth animation
  const showTabBar = useCallback(() => {
    if (!isHiddenRef.current || isAnimating.current) return;

    isAnimating.current = true;
    isHiddenRef.current = false;
    setIsTabBarHidden(false);

    Animated.timing(translateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
    });
  }, [translateY]);

  // Hide the tab bar with smooth animation
  const hideTabBar = useCallback(() => {
    if (isHiddenRef.current || isAnimating.current) return;

    isAnimating.current = true;
    isHiddenRef.current = true;
    setIsTabBarHidden(true);

    Animated.timing(translateY, {
      toValue: TAB_BAR_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
    });
  }, [translateY]);

  // Handle scroll events - call this from scrollable screens
  const handleScroll = useCallback((event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const diff = currentScrollY - lastScrollY.current;

    // Only trigger if scroll difference is significant (reduces jitter)
    if (Math.abs(diff) < 5) return;

    // Don't hide if near top of content
    if (currentScrollY < 50) {
      showTabBar();
      lastScrollY.current = currentScrollY;
      return;
    }

    if (diff > 0) {
      // Scrolling down - hide tab bar
      hideTabBar();
    } else {
      // Scrolling up - show tab bar
      showTabBar();
    }

    lastScrollY.current = currentScrollY;
  }, [hideTabBar, showTabBar]);

  // Reset tab bar visibility (useful when switching tabs)
  const resetTabBar = useCallback(() => {
    lastScrollY.current = 0;
    isHiddenRef.current = false;
    setIsTabBarHidden(false);
    translateY.setValue(0);
  }, [translateY]);

  const value = {
    translateY,
    handleScroll,
    showTabBar,
    hideTabBar,
    resetTabBar,
    isTabBarHidden,
    TAB_BAR_HEIGHT,
  };

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const context = useContext(TabBarVisibilityContext);
  if (!context) {
    throw new Error('useTabBarVisibility must be used within a TabBarVisibilityProvider');
  }
  return context;
}

export default TabBarVisibilityContext;

