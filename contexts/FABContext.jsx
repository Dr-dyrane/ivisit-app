import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * FAB Context - Context-aware Floating Action Button
 * 
 * Architecture:
 * - FAB lives at (user) root, always above tabs
 * - Screens register intent via this context
 * - FAB position is anchored to tab bar
 * - Different action per screen/tab
 */

const FABContext = createContext(null);

// Default FAB configs per tab (fallback when no screen override)
// Apple style: icon only, no labels
const TAB_DEFAULTS = {
  index: {
    icon: 'medical',
    visible: true,
  },
  visits: {
    icon: 'add-outline',
    visible: true,
  },
  more: {
    icon: 'ellipsis-horizontal',
    visible: false, // Hidden by default on More tab
  },
};

export function FABProvider({ children }) {
  // Current FAB configuration - Apple simplicity
  const [config, setConfig] = useState({
    icon: 'medical',
    visible: true,
    onPress: null,
  });

  // Track current tab for default fallback
  const [currentTab, setCurrentTab] = useState('index');

  // Screen-level override (temporary, resets on unmount)
  const [screenOverride, setScreenOverride] = useState(null);

  // Register screen-level FAB intent (called by screens on mount)
  const registerFAB = useCallback((fabConfig) => {
    setScreenOverride(fabConfig);
  }, []);

  // Unregister (called by screens on unmount)
  const unregisterFAB = useCallback(() => {
    setScreenOverride(null);
  }, []);

  // Update current tab (called by tab navigator)
  const setActiveTab = useCallback((tabName) => {
    setCurrentTab(tabName);
  }, []);

  // Compute final config: screen override > tab default
  useEffect(() => {
    if (screenOverride) {
      setConfig((prev) => ({
        ...prev,
        ...screenOverride,
      }));
    } else {
      // Fall back to tab default
      const tabDefault = TAB_DEFAULTS[currentTab] || TAB_DEFAULTS.index;
      setConfig((prev) => ({
        ...prev,
        icon: tabDefault.icon,
        label: tabDefault.label,
        visible: tabDefault.visible,
        onPress: null, // No default action for tab-level
      }));
    }
  }, [screenOverride, currentTab]);

  // Direct config update (for simple cases)
  const updateFAB = useCallback((updates) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const value = {
    config,
    registerFAB,
    unregisterFAB,
    updateFAB,
    setActiveTab,
    currentTab,
  };

  return (
    <FABContext.Provider value={value}>
      {children}
    </FABContext.Provider>
  );
}

// Hook for screens to register their FAB intent
export function useFAB() {
  const context = useContext(FABContext);
  if (!context) {
    throw new Error('useFAB must be used within a FABProvider');
  }
  return context;
}

// Convenience hook for screens to declare FAB on mount
export function useFABIntent(fabConfig) {
  const { registerFAB, unregisterFAB } = useFAB();

  useEffect(() => {
    if (fabConfig) {
      registerFAB(fabConfig);
    }
    return () => {
      unregisterFAB();
    };
  }, [fabConfig, registerFAB, unregisterFAB]);
}

export default FABContext;

