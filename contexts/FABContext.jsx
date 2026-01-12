import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { COLORS } from '../constants/colors';

/**
 * FAB Context - Enhanced Context-aware Floating Action Button
 * 
 * Architecture:
 * - FAB lives at (user) root, always above tabs
 * - Screens register intent via this context
 * - FAB position is anchored to tab bar
 * - Different action per screen/tab
 * - Priority-based conflict resolution
 * - Support for advanced features (labels, sub-text, loading states)
 */

const FABContext = createContext(null);

// Enhanced FAB configuration schema
const FAB_CONFIG_SCHEMA = {
  // Core properties (existing)
  icon: 'string',           // Ionicons/Fontisto name
  visible: 'boolean',       // Visibility state
  onPress: 'function',      // Action handler
  
  // Enhanced properties (new)
  label: 'string',          // Dynamic text label
  subText: 'string',        // Sub-text description
  style: 'primary|success|emergency|warning',  // Visual style
  haptic: 'light|medium|heavy|success|error',  // Haptic feedback
  priority: 'number',       // 1-10, higher wins conflicts
  animation: 'subtle|prominent|pulse|bounce',  // Animation variant
  disabled: 'boolean',      // Disabled state
  loading: 'boolean',      // Loading state
  mode: 'string',          // Mode for context-aware behavior
  badge: 'string|number',   // Optional badge
  position: 'default|top-right|bottom-left',    // Position variant
};

// Default FAB configs per tab (fallback when no screen override)
// Apple style: icon only, no labels (for tab defaults)
const TAB_DEFAULTS = {
  index: {
    icon: 'medical',
    visible: true,
    mode: 'emergency',
  },
  visits: {
    icon: 'add-outline',
    visible: true,
    mode: 'add',
  },
  more: {
    icon: 'ellipsis-horizontal',
    visible: false, // Hidden by default on More tab
  },
};

// Style variants for different FAB types
const FAB_STYLES = {
  primary: {
    backgroundColor: COLORS.brandPrimary,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    elevation: 8,
  },
  success: {
    backgroundColor: COLORS.success,
    shadowColor: '#00C851',
    shadowOpacity: 0.25,
    elevation: 10,
  },
  emergency: {
    backgroundColor: COLORS.emergency,
    shadowColor: '#FF4444',
    shadowOpacity: 0.30,
    elevation: 12,
  },
  warning: {
    backgroundColor: COLORS.warning,
    shadowColor: '#FF8800',
    shadowOpacity: 0.25,
    elevation: 10,
  },
};

export function FABProvider({ children }) {
  // Track current tab for default fallback
  const [currentTab, setCurrentTab] = useState('index');
  
  // Track FAB registrations with unique IDs
  const [registrations, setRegistrations] = useState(new Map());
  
  // Track if we're in a stack screen (hide FAB on stacks)
  const [isInStack, setIsInStack] = useState(false);

  // Register FAB with unique ID and priority system
  const registerFAB = useCallback((id, config) => {
    setRegistrations(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { ...config, id });
      return newMap;
    });
  }, []);

  // Unregister FAB by ID
  const unregisterFAB = useCallback((id) => {
    setRegistrations(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  // Update current tab (called by tab navigator)
  const setActiveTab = useCallback((tabName) => {
    setCurrentTab(tabName);
  }, []);

  // Enter/exit stack screen (hide FAB on stacks)
  const enterStack = useCallback(() => {
    setIsInStack(true);
  }, []);

  const exitStack = useCallback(() => {
    setIsInStack(false);
  }, []);

  // Resolve active FAB based on priority and visibility
  const activeFAB = useMemo(() => {
    // Always hide in stack screens
    if (isInStack) return null;
    
    // Get visible FABs from registrations
    const visibleFABs = Array.from(registrations.values())
      .filter(fab => fab.visible && !fab.disabled);
    
    // If no registered FABs, fall back to tab default
    if (visibleFABs.length === 0) {
      const tabDefault = TAB_DEFAULTS[currentTab] || TAB_DEFAULTS.index;
      return tabDefault.visible ? tabDefault : null;
    }
    
    // Sort by priority (highest first), then by registration order
    visibleFABs.sort((a, b) => {
      const priorityDiff = (b.priority || 5) - (a.priority || 5);
      if (priorityDiff !== 0) return priorityDiff;
      return (b.id || '').localeCompare(a.id || '');
    });
    
    return visibleFABs[0];
  }, [registrations, currentTab, isInStack]);

  // Get style configuration for active FAB
  const getFABStyle = useCallback((style) => {
    return FAB_STYLES[style] || FAB_STYLES.primary;
  }, []);

  const value = {
    // Registration system
    registerFAB,
    unregisterFAB,
    
    // Tab and stack management
    setActiveTab,
    currentTab,
    enterStack,
    exitStack,
    isInStack,
    
    // Active FAB state
    activeFAB,
    getFABStyle,
    
    // Legacy support (for backward compatibility)
    updateFAB: useCallback((updates) => {
      console.warn('updateFAB is deprecated, use registerFAB with unique ID');
    }, []),
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

// Convenience hook for screens to declare FAB on mount (legacy support)
export function useFABIntent(fabConfig) {
  const { registerFAB, unregisterFAB } = useFAB();
  const fabId = useMemo(() => `fab-${Date.now()}-${Math.random()}`, []);

  useEffect(() => {
    if (fabConfig) {
      registerFAB(fabId, fabConfig);
    }
    return () => {
      unregisterFAB(fabId);
    };
  }, [fabConfig, registerFAB, unregisterFAB, fabId]);
}

export default FABContext;

