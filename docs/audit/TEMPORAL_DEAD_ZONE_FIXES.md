# Temporal Dead Zone Errors - Fixed Issues

## Pattern Summary
Multiple temporal dead zone errors occurred across components where variables were being used before declaration.

## Fixed Issues

### 1. userLocation Temporal Dead Zone
**File**: `components/map/FullScreenEmergencyMap.jsx`
**Issue**: `userLocation` used in `initialRegion` useMemo (line 83) before declaration from `useMapLocation()` hook (line 105)
**Fix**: Moved `useMapLocation()` hook call before `initialRegion` useMemo

### 2. sheetPhase Temporal Dead Zone  
**File**: `components/emergency/EmergencyBottomSheet.jsx`
**Issue**: `sheetPhase` used in `isBelowHalf` calculation (line 86) before useState declaration (line 89)
**Fix**: Moved `const [sheetPhase, setSheetPhase] = useState("half");` before usage

### 3. routeHospitalIdResolved Temporal Dead Zone
**File**: `components/map/FullScreenEmergencyMap.jsx`
**Issue**: `routeHospitalIdResolved` used in `shouldShowHospitalLabels` (line 114) before declaration (line 126)
**Fix**: Moved variable declaration before its usage

### 4. handleUpdateProfile Temporal Dead Zone
**File**: `screens/ProfileScreen.jsx`
**Issue**: `handleUpdateProfile` used in `useFocusEffect` callback (lines 112, 125) before function declaration (line 242)
**Fix**: Moved function declaration to after state declarations, before derived state and effects

### 5. handleSubmitRequest Temporal Dead Zone
**File**: `components/emergency/EmergencyRequestModal.jsx`
**Issue**: `handleSubmitRequest` used in `useEffect` callback (lines 105, 119, 162) before function declaration (line 291)
**Fix**: Moved function declaration to after state declarations, before derived state and effects

### 6. stableHasChanges & isSaving Temporal Dead Zone
**File**: `screens/MedicalProfileScreen.jsx`
**Issue**: `stableHasChanges` and `isSaving` used in `useEffect` callbacks before state declarations
**Fix**: Moved both state declarations before their usage in useEffect

### 7. handleSave & localProfile Temporal Dead Zone
**File**: `screens/MedicalProfileScreen.jsx`
**Issue**: `handleSave` function and `localProfile` state used in useEffect before their declarations
**Fix**: Moved both function and state declarations before their usage in useEffect

## Prevention Strategy

### ✅ Best Practices for Variable Declaration Order

1. **Hooks First**: Always call all hooks at the top of the component
2. **State Variables**: Declare all useState variables
3. **Event Handlers**: Declare function handlers after state
4. **Derived Variables**: Declare variables that depend on hooks/state
5. **Effects**: Use useEffect and other effects last
6. **Conditional Logic**: Use variables in conditionals after declaration

### ✅ Recommended Declaration Order

```jsx
const Component = () => {
  // 1. All hooks (useState, useEffect, useContext, etc.)
  const [state, setState] = useState();
  const { data } = useHook();
  const ref = useRef();
  
  // 2. Event handlers (functions that update state)
  const handleClick = () => {
    setState(newState);
  };
  
  // 3. Derived variables from hooks/state
  const derived = data?.value;
  const computed = state + derived;
  
  // 4. Conditional logic using derived variables
  const shouldShow = computed > 0;
  
  // 5. Effects and callbacks
  useEffect(() => {
    // Use derived variables here
  }, [derived]);
  
  return <View />;
};
```

### ❌ Common Anti-Patterns to Avoid

```jsx
// BAD - Variable used before declaration
const bad = () => {
  const show = derived > 0; // ❌ Error: derived not defined
  const [state, setState] = useState();
  const { data } = useHook();
  const derived = data?.value; // Declared after usage
  
  return <View />;
};

// BAD - Event handler used before declaration
const alsoBad = () => {
  useEffect(() => {
    handleClick(); // ❌ Error: handleClick not defined
  }, [handleClick]);
  
  const handleClick = () => {
    // Handler logic
  };
  
  return <View />;
};
```

## Files Affected
- `components/map/FullScreenEmergencyMap.jsx` (2 fixes)
- `components/emergency/EmergencyBottomSheet.jsx` (1 fix)
- `screens/ProfileScreen.jsx` (1 fix)
- `components/emergency/EmergencyRequestModal.jsx` (1 fix)
- `screens/MedicalProfileScreen.jsx` (2 fixes)

## Testing Notes
- All temporal dead zone errors were occurring on web platform
- iOS/Android were not affected due to different bundling/execution
- Errors manifested as "Cannot access 'X' before initialization"

## Future Prevention
1. **ESLint Rules**: Consider adding rules to detect temporal dead zone issues
2. **Code Review**: Check variable declaration order in React components
3. **Testing**: Test web platform specifically for these issues
4. **Linting**: Run linters before committing changes
5. **Component Structure**: Follow consistent declaration order pattern across all components
