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

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
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

/**
 * 💡 STABILITY NOTE / ROLLBACK GUIDE:
 * This context was split into State and Actions on 2026-02-09 to resolve "Maximum Update Depth" errors.
 * 
 * WHY: High-frequency UI components (like EmergencyRequestModal) register FABs. If they subscribe 
 * to the global FAB state (activeFAB), every registration triggers a re-render of the registrant, 
 * causing a lifecycle loop.
 * 
 * ARCHITECTURE Change:
 * - FABActionsContext: Holds stable dispatchers (register/unregister). Subscribers DO NOT re-render on FAB changes.
 * - FABStateContext: Holds the active FAB state. Only GlobalFAB and components needing state subscribe here.
 * 
 * ROLLBACK: If you need to revert, merge these back into one FABContext, but be wary of infinite loops 
 * in useFocusEffect/useEffect registrations.
 */
const FABStateContext = createContext(null);
const FABActionsContext = createContext(null);

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
  isFixed: 'boolean',      // Disable scroll responsiveness (NEW)
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
  const insets = useSafeAreaInsets();
  const [currentTab, setCurrentTab] = useState('index');
  const registrationsRef = useRef(new Map());
  const [activeFAB, setActiveFAB] = useState(null);
  const [isInStack, setIsInStack] = useState(false);
  const fabTraceRef = useRef('');

  const dimensions = useMemo(() => {
    const base = getBaseDimensions();
    return {
      height: base.height,
      offset: Platform.OS === 'android' ? base.baseOffset + insets.bottom : base.baseOffset,
    };
  }, [insets.bottom]);

  const resolveActiveFAB = useCallback(() => {
    const registrations = registrationsRef.current;
    if (!registrations) return null;

    const all = Array.from(registrations.values());
    const visible = all.filter(f => f.visible && !f.disabled);

    // 1. Stack Overrides (highest priority)
    const stackOverrides = visible.filter(f => f.allowInStack);
    if (stackOverrides.length > 0) {
      stackOverrides.sort((a, b) => (b.priority || 5) - (a.priority || 5) || (b.id || '').localeCompare(a.id || ''));
      return stackOverrides[0];
    }

    // 2. Hide on stacks unless overridden
    if (isInStack) return null;

    // 3. Contextual FABs
    if (all.length > 0) {
      if (visible.length === 0) return null;
      visible.sort((a, b) => (b.priority || 5) - (a.priority || 5) || (b.id || '').localeCompare(a.id || ''));
      return visible[0];
    }

    // 4. Tab Defaults
    const tabDefault = TAB_DEFAULTS[currentTab] || TAB_DEFAULTS.index;
    return tabDefault.visible ? tabDefault : null;
  }, [currentTab, isInStack]);

  const updateWinner = useCallback(() => {
    const winner = resolveActiveFAB();

    if (__DEV__) {
      const nextTrace = winner
        ? `${winner.id}|${winner.label || ''}|visible=${winner.visible}|stack=${isInStack}`
        : `none|stack=${isInStack}|registrations=${registrationsRef.current.size}`;

      if (fabTraceRef.current !== nextTrace) {
        fabTraceRef.current = nextTrace;
        console.log('[FABTrace][Provider] resolved winner', {
          currentTab,
          isInStack,
          registrations: Array.from(registrationsRef.current.values()).map((item) => ({
            id: item.id,
            label: item.label || null,
            visible: item.visible,
            allowInStack: item.allowInStack === true,
            priority: item.priority || 0,
            disabled: item.disabled === true,
          })),
          winner: winner
            ? {
                id: winner.id,
                label: winner.label || null,
                visible: winner.visible,
                allowInStack: winner.allowInStack === true,
                priority: winner.priority || 0,
              }
            : null,
        });
      }
    }

    setActiveFAB(prev => {
      if (!prev && !winner) return null;
      if (prev && winner &&
        prev.id === winner.id &&
        prev.visible === winner.visible &&
        prev.icon === winner.icon &&
        prev.label === winner.label &&
        prev.loading === winner.loading &&
        prev.style === winner.style) {
        return prev;
      }
      return winner;
    });
  }, [currentTab, isInStack, resolveActiveFAB]);

  // Sync winner when resolveActiveFAB changes (tab/stack change)
  const updateWinnerRef = useRef(updateWinner);
  useEffect(() => {
    updateWinnerRef.current = updateWinner;
    updateWinner();
  }, [updateWinner]);

  const registerFAB = useCallback((id, config) => {
    registrationsRef.current.set(id, { ...config, id });
    if (__DEV__) {
      console.log('[FABTrace][Provider] register', {
        id,
        label: config?.label || null,
        visible: config?.visible,
        allowInStack: config?.allowInStack === true,
        priority: config?.priority || 0,
        disabled: config?.disabled === true,
      });
    }
    updateWinnerRef.current();
  }, []);

  const unregisterFAB = useCallback((id) => {
    registrationsRef.current.delete(id);
    if (__DEV__) {
      console.log('[FABTrace][Provider] unregister', { id });
    }
    updateWinnerRef.current();
  }, []);

  const setActiveTab = useCallback((tabName) => setCurrentTab(tabName), []);
  const enterStack = useCallback(() => setIsInStack(true), []);
  const exitStack = useCallback(() => setIsInStack(false), []);
  const getFABStyle = useCallback((style) => FAB_STYLES[style] || FAB_STYLES.primary, []);

  const stateValue = useMemo(() => ({
    currentTab,
    isInStack,
    activeFAB,
    dimensions
  }), [currentTab, isInStack, activeFAB, dimensions]);

  const actionsValue = useMemo(() => ({
    registerFAB,
    unregisterFAB,
    setActiveTab,
    enterStack,
    exitStack,
    getFABStyle,
    updateFAB: () => console.warn('updateFAB is deprecated'),
  }), [registerFAB, unregisterFAB, setActiveTab, enterStack, exitStack, getFABStyle]);

  return (
    <FABStateContext.Provider value={stateValue}>
      <FABActionsContext.Provider value={actionsValue}>
        {children}
      </FABActionsContext.Provider>
    </FABStateContext.Provider>
  );
}

// Global hooks
export function useFAB() {
  const state = useContext(FABStateContext);
  const actions = useContext(FABActionsContext);
  if (!state || !actions) throw new Error('useFAB must be used within a FABProvider');
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

export function useFABActions() {
  const actions = useContext(FABActionsContext);
  if (!actions) throw new Error('useFABActions must be used within FABProvider');
  return actions;
}

export function useFABState() {
  const state = useContext(FABStateContext);
  if (!state) throw new Error('useFABState must be used within FABProvider');
  return state;
}

export function useFABIntent(fabConfig) {
  const { registerFAB, unregisterFAB } = useFABActions();
  const fabId = useMemo(() => `fab-${Date.now()}-${Math.random()}`, []);

  useEffect(() => {
    if (fabConfig) registerFAB(fabId, fabConfig);
    return () => unregisterFAB(fabId);
  }, [fabConfig, registerFAB, unregisterFAB, fabId]);
}

export default FABProvider;
