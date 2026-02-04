/**
 * 🎯 FAB SYSTEM DOCUMENTATION
 * 
 * ARCHITECTURE:
 * - Home Tab: Mode switching FAB (priority 10, persistent via useEffect)
 * - EmergencyScreen: Contextual FAB (priority 15, useFocusEffect)
 * - FABContext: Priority-based competition resolution
 * - GlobalFAB: Renders the winning FAB
 * 
 * DATA FLOW:
 * 1. Components register FABs with visibility rules
 * 2. FABContext filters visible FABs and sorts by priority
 * 3. Highest priority visible FAB wins
 * 4. GlobalFAB renders the winner
 * 
 * DEBUGGING CHECKLIST:
 * ✅ Check registration logs in each component
 * ✅ Verify priority values (higher wins)
 * ✅ Check visibility conditions (selectedHospital, etc.)
 * ✅ Look at GlobalFAB rendering logs
 * ✅ Ensure proper cleanup in return functions
 * 
 * COMMON ISSUES:
 * - Wrong lifecycle hook (useEffect vs useFocusEffect)
 * - Missing selectedHospital dependency in Home Tab
 * - Both FABs hidden → no winner
 * - Priority conflicts → unexpected winner
 * 
 * ADDING NEW FABS:
 * 1. Use unique ID
 * 2. Set appropriate priority (10-100)
 * 3. Define visibility conditions
 * 4. Handle cleanup in return function
 * 5. Add debug logs
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

// Platform-specific FAB base dimensions
// iOS: More generous bottom spacing due to safe area and home indicator
// Android: Tighter base spacing - insets.bottom added dynamically in FABProvider
const FAB_BASE_DIMENSIONS = {
  ios: {
    height: 56, // Standard iOS touch target (44px min + padding)
    baseOffset: 16, // Generous bottom spacing for home indicator
  },
  android: {
    height: 56, // Match iOS height
    baseOffset: 6, // Base spacing - insets.bottom added dynamically
  },
};

// Get platform base dimensions (insets added in provider)
const getBaseDimensions = () => {
  return Platform.OS === 'ios' ? FAB_BASE_DIMENSIONS.ios : FAB_BASE_DIMENSIONS.android;
};

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
  allowInStack: 'boolean',  // Override stack hiding behavior
};

// Default FAB configs per tab (fallback when no screen override)
// Apple style: icon only, no labels (for tab defaults)
const TAB_DEFAULTS = {
  index: {
    icon: 'alarm-light-outline',
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

// FAB style variants with proper colors
const FAB_STYLES = {
  primary: {
    backgroundColor: COLORS.brandPrimary,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
  },
  success: {
    backgroundColor: '#16A34A', // Green
    shadowColor: 'rgba(22, 163, 74, 0.3)',
  },
  emergency: {
    backgroundColor: '#DC2626', // Red
    shadowColor: 'rgba(220, 38, 38, 0.3)',
  },
  warning: {
    backgroundColor: '#F59E0B', // Orange
    shadowColor: 'rgba(245, 158, 11, 0.3)',
    elevation: 10,
  },
};

export function FABProvider({ children }) {
  // Get safe area insets for Android navigation bar
  const insets = useSafeAreaInsets();

  // Track current tab for default fallback
  const [currentTab, setCurrentTab] = useState('index');

  // Track FAB registrations with unique IDs
  const [registrations, setRegistrations] = useState(new Map());

  // Track if we're in a stack screen (hide FAB on stacks)
  const [isInStack, setIsInStack] = useState(false);

  // Calculate dimensions with insets for Android
  const dimensions = useMemo(() => {
    const base = getBaseDimensions();
    return {
      height: base.height,
      // Android: add insets.bottom for devices with nav bars (gesture/3-button)
      offset: Platform.OS === 'android' ? base.baseOffset + insets.bottom : base.baseOffset,
    };
  }, [insets.bottom]);

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
    // Get all registered FABs (including hidden ones)
    const allRegistrations = Array.from(registrations.values());

    // Get visible FABs from registrations
    const visibleFABs = allRegistrations.filter(fab => fab.visible && !fab.disabled);

    // Check if any registered FAB explicitly allows stack display
    const stackOverrideFABs = visibleFABs.filter(fab => fab.allowInStack);

    // If we have stack override FABs, use them even in stack
    if (stackOverrideFABs.length > 0) {
      stackOverrideFABs.sort((a, b) => {
        const priorityDiff = (b.priority || 5) - (a.priority || 5);
        if (priorityDiff !== 0) return priorityDiff;
        return (b.id || '').localeCompare(a.id || '');
      });
      return stackOverrideFABs[0];
    }

    // Always hide in stack screens (unless overridden above)
    if (isInStack) return null;

    // IMPORTANT: If ANY screen has registered a FAB (even with visible: false),
    // that screen is actively managing the FAB state. Do NOT fall back to defaults.
    // Only fall back to tab defaults when NO registrations exist at all.
    if (allRegistrations.length > 0) {
      // A screen has registered - respect its visibility setting
      if (visibleFABs.length === 0) {
        // Screen registered but set visible: false - hide the FAB
        return null;
      }

      // Sort by priority (highest first), then by registration order
      visibleFABs.sort((a, b) => {
        const priorityDiff = (b.priority || 5) - (a.priority || 5);
        if (priorityDiff !== 0) return priorityDiff;
        return (b.id || '').localeCompare(a.id || '');
      });

      // FAB competition and winner - no debug logs
      const winner = visibleFABs[0];
      return winner;
    }

    // No registrations at all - fall back to tab default
    const tabDefault = TAB_DEFAULTS[currentTab] || TAB_DEFAULTS.index;
    return tabDefault.visible ? tabDefault : null;
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

    // Platform-specific dimensions (with insets for Android)
    dimensions,

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

