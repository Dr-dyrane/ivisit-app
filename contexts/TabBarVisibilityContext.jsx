import React, { createContext, useContext } from 'react';
import { useUnifiedScroll } from './UnifiedScrollContext';

const TabBarVisibilityContext = createContext(null);

export function TabBarVisibilityProvider({ children }) {
  const unifiedScroll = useUnifiedScroll();

  const value = {
    translateY: unifiedScroll.tabTranslateY,
    handleScroll: unifiedScroll.handleScroll,
    showTabBar: unifiedScroll.showTabBar,
    hideTabBar: unifiedScroll.hideTabBar,
    resetTabBar: unifiedScroll.resetBoth,
    isTabBarHidden: unifiedScroll.isTabBarHidden,
    isTabBarLockedHidden: unifiedScroll.isTabBarLockedHidden,
    lockTabBarHidden: unifiedScroll.lockTabBarHidden,
    unlockTabBarHidden: unifiedScroll.unlockTabBarHidden,
    TAB_BAR_HEIGHT: unifiedScroll.TAB_BAR_HEIGHT,
    HIDE_DISTANCE: unifiedScroll.HIDE_DISTANCE,
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
