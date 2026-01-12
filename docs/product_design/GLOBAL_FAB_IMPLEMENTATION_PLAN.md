# Global FAB Implementation Plan

> **Date**: 2026-01-12  
> **Status**: Ready for Implementation  
> **Priority**: High - Core UX consistency

---

## Overview

This document outlines the technical implementation plan for migrating all inline FAB implementations to the global FAB system, ensuring consistent behavior, performance, and maintainability across the iVisit app.

---

## Phase 1: Audit & Inventory

### 1.1 Current FAB Implementations

Let's identify all existing FAB usage patterns:

```bash
# Search for inline FAB implementations
find . -name "*.jsx" -exec grep -l "FloatingActionButton\|FAB\|float.*action" {} \;
```

### 1.2 Expected Findings

Based on codebase analysis, anticipate these FAB patterns:

| Component | Current Implementation | Intended Migration |
|-----------|----------------------|-------------------|
| **ProfileScreen** | Inline save FAB | Global save pattern |
| **MedicalProfileScreen** | Inline save FAB | Global save pattern |
| **EmergencyContacts** | Inline add FAB | Global add pattern |
| **RequestModal** | Inline selection FABs | Global selection pattern |
| **SettingsScreen** | Inline toggle FABs | Global settings pattern |

---

## Phase 2: Enhanced FAB Context

### 2.1 Extended Context API

```javascript
// Enhanced FAB configuration schema
const FAB_CONFIG_SCHEMA = {
  // Core properties (existing)
  icon: 'string',           // Ionicons/Fontisto name
  visible: 'boolean',       // Visibility state
  onPress: 'function',      // Action handler
  
  // Enhanced properties (new)
  style: 'primary|success|emergency|warning',  // Visual style
  haptic: 'light|medium|heavy|success|error',  // Haptic feedback
  priority: 'number',       // 1-10, higher wins conflicts
  animation: 'subtle|prominent|pulse|bounce',  // Animation variant
  disabled: 'boolean',      // Disabled state
  loading: 'boolean',      // Loading state
  badge: 'string|number',   // Optional badge
  position: 'default|top-right|bottom-left',    // Position variant
};
```

### 2.2 Style System Implementation

```javascript
// Enhanced styles for FAB variants
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

// Animation presets
const FAB_ANIMATIONS = {
  subtle: {
    duration: 180,
    easing: Easing.out(Easing.quad),
  },
  prominent: {
    duration: 300,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  },
  pulse: {
    duration: 1000,
    easing: Easing.inOut(Easing.quad),
    repeat: true,
  },
  bounce: {
    duration: 600,
    easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
  },
};
```

### 2.3 Priority-Based Conflict Resolution

```javascript
// Enhanced FAB context with priority system
export function FABProvider({ children }) {
  const [registrations, setRegistrations] = useState(new Map());
  
  const registerFAB = useCallback((id, config) => {
    setRegistrations(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { ...config, id });
      return newMap;
    });
  }, []);
  
  const unregisterFAB = useCallback((id) => {
    setRegistrations(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);
  
  // Resolve conflicts by priority
  const activeFAB = useMemo(() => {
    const visibleFABs = Array.from(registrations.values())
      .filter(fab => fab.visible && !fab.disabled);
    
    if (visibleFABs.length === 0) return null;
    
    // Sort by priority (highest first)
    visibleFABs.sort((a, b) => (b.priority || 5) - (a.priority || 5));
    
    return visibleFABs[0];
  }, [registrations]);
  
  return (
    <FABContext.Provider value={{ registerFAB, unregisterFAB, activeFAB }}>
      {children}
    </FABContext.Provider>
  );
}
```

---

## Phase 3: Migration Strategy

### 3.1 Migration Priority Matrix

| Priority | Component | Current Implementation | Migration Complexity | Business Impact |
|----------|-----------|----------------------|---------------------|-----------------|
| **1** | RequestAmbulanceFAB | Inline with advanced features | **High** | Critical - Emergency flow |
| **2** | RequestBedFAB | Inline with advanced features | **High** | Critical - Bed booking flow |
| **3** | ProfileScreen | Inline save FAB | Medium | High - User data |
| **4** | MedicalProfileScreen | Inline save FAB | Medium | High - Medical data |
| **5** | EmergencyContacts | Inline add FAB (if exists) | Low | Medium - Safety feature |
| **6** | SettingsScreen | Inline toggle FABs (if exists) | Medium | Medium - User preferences |

### 3.2 Enhanced Migration Requirements

**Critical Discovery:** Request modal FABs require enhanced global system:

#### **Advanced Features Needed:**
- **Dynamic text labels** (not just icons)
- **Sub-text descriptions** for context
- **Loading states** with ActivityIndicator
- **Mode-aware styling** (request vs dispatched)
- **Complex icon switching** (Ionicons + Fontisto)
- **Enhanced animations** (spring animations)

### 3.3 Migration Pattern Implementation

#### Pattern 1: Request Modal FABs (Priority 1-2)
```javascript
// Before: RequestAmbulanceFAB
<RequestAmbulanceFAB
  onPress={handleSubmitRequest}
  isLoading={isRequesting}
  isActive={!!selectedAmbulanceType}
  selectedAmbulanceType={selectedAmbulanceType}
  mode="request"
  requestData={requestData}
/>

// After: Global FAB registration
useFocusEffect(
  useCallback(() => {
    registerFAB('ambulance-request', {
      icon: 'medical',
      label: selectedAmbulanceType ? `Request ${selectedAmbulanceType.name}` : 'Select Ambulance',
      subText: isRequesting ? '' : 'Tap to confirm',
      visible: !!selectedAmbulanceType,
      onPress: handleSubmitRequest,
      isLoading: isRequesting,
      mode: 'request',
      style: 'emergency',
      haptic: 'heavy',
      priority: 10,
      animation: 'prominent',
    });
  }, [registerFAB, selectedAmbulanceType, isRequesting, handleSubmitRequest])
);
```

#### Pattern 2: Save Actions (Priority 3-4)
```javascript
// Before: Inline FAB
const ProfileScreen = () => {
  const [hasChanges, setHasChanges] = useState(false);
  
  return (
    <View>
      {/* Profile content */}
      {hasChanges && (
        <FloatingActionButton
          icon="checkmark"
          onPress={handleSave}
          style={styles.saveFAB}
        />
      )}
    </View>
  );
};

// After: Global FAB registration
const ProfileScreen = () => {
  const { registerFAB } = useFAB();
  const [hasChanges, setHasChanges] = useState(false);
  
  // Register FAB on mount, update on changes
  useFocusEffect(
    useCallback(() => {
      registerFAB('profile-save', {
        icon: 'checkmark',
        visible: hasChanges,
        onPress: handleSave,
        style: 'success',
        haptic: 'success',
        priority: 8,
      });
    }, [registerFAB, hasChanges, handleSave])
  );
  
  return <View>{/* Profile content */}</View>;
};
```

#### Pattern 2: Add Actions
```javascript
// Emergency Contacts Example
const EmergencyContactsScreen = () => {
  const { registerFAB } = useFAB();
  
  useFocusEffect(
    useCallback(() => {
      registerFAB('emergency-contact-add', {
        icon: 'person-add',
        visible: true,
        onPress: () => setShowAddContact(true),
        style: 'primary',
        haptic: 'light',
        priority: 7,
      });
    }, [registerFAB])
  );
  
  return <View>{/* Contacts list */}</View>;
};
```

#### Pattern 3: Emergency Actions
```javascript
// Emergency Request Modal Example
const EmergencyRequestModal = ({ onAmbulanceSelect, onBedSelect }) => {
  const { registerFAB } = useFAB();
  const [selectedType, setSelectedType] = useState(null);
  
  useFocusEffect(
    useCallback(() => {
      if (selectedType === 'ambulance') {
        registerFAB('ambulance-select', {
          icon: 'medical',
          visible: true,
          onPress: onAmbulanceSelect,
          style: 'emergency',
          haptic: 'heavy',
          priority: 10, // Highest priority
          animation: 'pulse',
        });
      } else if (selectedType === 'bed') {
        registerFAB('bed-select', {
          icon: 'bed-patient',
          visible: true,
          onPress: onBedSelect,
          style: 'primary',
          haptic: 'medium',
          priority: 10,
        });
      } else {
        registerFAB('emergency-prompt', {
          icon: 'help',
          visible: true,
          onPress: () => setShowTypeSelection(true),
          style: 'warning',
          haptic: 'medium',
          priority: 9,
        });
      }
    }, [registerFAB, selectedType, onAmbulanceSelect, onBedSelect])
  );
  
  return <View>{/* Request modal content */}</View>;
};
```

---

## Phase 4: Enhanced Global FAB Component

### 4.1 Component Architecture

```javascript
// Enhanced GlobalFAB with style variants and animations
const GlobalFAB = () => {
  const { activeFAB } = useFAB();
  const { translateY, TAB_BAR_HEIGHT } = useTabBarVisibility();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const visibilityAnim = useRef(new Animated.Value(activeFAB?.visible ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Style variant
  const fabStyle = useMemo(() => 
    FAB_STYLES[activeFAB?.style || 'primary'], 
    [activeFAB?.style]
  );
  
  // Animation variant
  const animationConfig = useMemo(() =>
    FAB_ANIMATIONS[activeFAB?.animation || 'subtle'],
    [activeFAB?.animation]
  );
  
  // Pulse animation for emergency style
  useEffect(() => {
    if (activeFAB?.animation === 'pulse') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [activeFAB?.animation, pulseAnim]);
  
  // Visibility animation
  useEffect(() => {
    Animated.timing(visibilityAnim, {
      toValue: activeFAB?.visible ? 1 : 0,
      ...animationConfig,
      useNativeDriver: true,
    }).start();
  }, [activeFAB?.visible, animationConfig, visibilityAnim]);
  
  // Press handlers with haptic feedback
  const handlePress = useCallback(() => {
    if (activeFAB?.disabled || activeFAB?.loading) return;
    
    // Haptic feedback based on type
    if (activeFAB?.haptic) {
      Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle[activeFAB.haptic.toUpperCase()]
      );
    }
    
    // Execute action
    activeFAB?.onPress?.();
  }, [activeFAB]);
  
  if (!activeFAB) return null;
  
  return (
    <Animated.View
      style={[
        styles.container,
        fabStyle,
        {
          bottom: getBottomOffset(),
          right: 20,
          opacity: visibilityAnim,
          transform: [
            { translateY: getVisibilitySlide() },
            { translateY: getTabBarTranslate() },
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
          ],
        },
      ]}
      pointerEvents={activeFAB?.visible ? 'auto' : 'none'}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.button}
        disabled={activeFAB?.disabled || activeFAB?.loading}
      >
        {activeFAB?.loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <FABIcon 
            name={activeFAB?.icon} 
            size={26} 
            color="#FFFFFF" 
          />
        )}
        
        {activeFAB?.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFAB.badge}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};
```

### 4.2 Icon Component

```javascript
// Unified icon component for FAB
const FABIcon = ({ name, size, color }) => {
  // Fontisto icons (bed-patient, etc.)
  if (FONTISTO_ICONS.includes(name)) {
    return <Fontisto name={name} size={size} color={color} />;
  }
  
  // Default to Ionicons
  return <Ionicons name={name} size={size} color={color} />;
};
```

---

## Phase 5: Testing & Validation

### 5.1 Test Scenarios

```javascript
// Test suite for global FAB
describe('GlobalFAB', () => {
  test('priority-based conflict resolution', () => {
    // Register multiple FABs with different priorities
    // Verify highest priority FAB is visible
  });
  
  test('style variant application', () => {
    // Test each style variant (primary, success, emergency, warning)
    // Verify correct colors and shadows
  });
  
  test('animation variants', () => {
    // Test subtle, prominent, pulse, bounce animations
    // Verify performance and visual correctness
  });
  
  test('haptic feedback', () => {
    // Test different haptic patterns
    // Verify appropriate feedback for each action type
  });
  
  test('accessibility', () => {
    // Test screen reader compatibility
    // Verify proper accessibility labels
  });
});
```

### 5.2 Performance Testing

```javascript
// Performance benchmarks
const FAB_PERFORMANCE_TESTS = {
  'registration_speed': 'FAB registration < 16ms',
  'animation_fps': 'FAB animations maintain 60fps',
  'memory_usage': 'FAB memory usage < 1MB',
  'bundle_size': 'Global FAB < 50KB gzipped',
};
```

---

## Implementation Timeline

### Week 1: Foundation
- **Day 1-2**: Complete audit of existing FAB implementations
- **Day 3-4**: Implement enhanced FAB context with priority system
- **Day 5**: Create enhanced GlobalFAB component with style variants

### Week 2: Migration
- **Day 1-2**: Migrate critical screens (Profile, MedicalProfile)
- **Day 3-4**: Migrate emergency-related screens
- **Day 5**: Test and validate migration

### Week 3: Polish & Launch
- **Day 1-2**: Migrate remaining screens
- **Day 3**: Comprehensive testing and bug fixes
- **Day 4-5**: Performance optimization and documentation

---

## Success Metrics

### Technical Metrics
- **Code Reduction**: 30% reduction in FAB-related code
- **Bundle Size**: 15% reduction in total bundle size
- **Performance**: < 16ms FAB registration time
- **Memory**: < 1MB FAB memory usage

### UX Metrics
- **Consistency**: 100% FAB behavior consistency
- **Task Completion**: 10% improvement in save task completion
- **Error Reduction**: 50% reduction in FAB-related user errors

---

## Rollback Plan

### If Issues Arise:
1. **Feature Flag**: Implement feature flag for global FAB
2. **Gradual Rollback**: Disable global FAB per-screen
3. **Full Rollback**: Revert to inline FAB implementations
4. **Monitoring**: Track error rates and performance metrics

---

## Conclusion

The global FAB implementation will significantly improve the consistency, maintainability, and user experience of the iVisit app. By following this phased approach, we can ensure a smooth migration while maintaining app stability and performance.

The enhanced FAB system provides:
- **Unified behavior** across all screens
- **Advanced styling** for different action types
- **Performance optimizations** through centralized state management
- **Extensibility** for future FAB enhancements

This investment in core UX infrastructure will pay dividends throughout the app's lifecycle.

---

*Document Version: 1.0*  
*Last Updated: 2026-01-12*  
*Implementation Owner: Frontend Team*
