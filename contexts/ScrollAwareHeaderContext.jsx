import React, { createContext, useContext } from 'react';
import { useUnifiedScroll } from './UnifiedScrollContext';

const ScrollAwareHeaderContext = createContext(null);

export function ScrollAwareHeaderProvider({ children }) {
  const unifiedScroll = useUnifiedScroll();

  const value = {
    headerOpacity: unifiedScroll.headerOpacity,
    titleOpacity: unifiedScroll.titleOpacity,
    handleScroll: unifiedScroll.handleScroll,
    showHeader: unifiedScroll.showHeader,
    hideHeader: unifiedScroll.hideHeader,
    lockHeaderHidden: unifiedScroll.lockHeaderHidden,
    unlockHeaderHidden: unifiedScroll.unlockHeaderHidden,
    resetHeader: unifiedScroll.resetBoth,
    HEADER_HEIGHT: unifiedScroll.HEADER_HEIGHT,
  };

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
