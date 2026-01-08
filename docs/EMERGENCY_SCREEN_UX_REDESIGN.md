# 📋 Emergency Screen UX Redesign - Implementation Plan

> **Date Created:** January 8, 2026  
> **Status:** In Progress  
> **Goal:** Transform Emergency/Bed Booking screen to Apple Maps-style interface

---

## Overview

Transform the Emergency/Bed Booking screen from a tab-based (Map/List toggle) layout to an **Apple Maps-style interface** with:
- Full-screen map as background
- Draggable bottom sheet overlay
- Sticky selectors
- Live map feedback on hospital selection

---

## 🎨 Visual Layout Specification

```
┌─────────────────────────────────────┐
│ ░░░░░░ Status Bar (blur) ░░░░░░░░░ │ ← Safe area with blur overlay
├─────────────────────────────────────┤
│                                     │
│         🏥        🏥                │
│                                     │
│              📍 You                 │ ← Full-screen map (no padding)
│     🏥                 🏥           │
│                                     │
│                                     │
├══════════════════════════════════════┤ ← Drag handle
│         ═══════════════             │ ← Pill indicator
│                                     │
│ ┌─────────────┐ ┌─────────────┐     │
│ │  Premium ✓  │ │  Standard   │     │ ← STICKY: Service Type
│ └─────────────┘ └─────────────┘     │   (or Specialty pills)
│                                     │
│ ─────────────────────────────────── │
│                                     │
│  NEARBY SERVICES (4)                │ ← Scrollable content
│                                     │
│ ┌───────────────────────────────┐   │
│ │ 🏥 City General Hospital      │   │
│ │ ⭐ 4.8  •  0.5 km  •  3 min   │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ 🏥 St. Mary's Medical         │   │
│ │ ⭐ 4.9  •  0.8 km  •  5 min   │   │ ← Hospital cards
│ └───────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
│         [Tab Bar]          [FAB]    │ ← Always visible above sheet
└─────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Dependencies

**Required Installation:**
```bash
npx expo install @gorhom/bottom-sheet react-native-reanimated
```

> Note: `react-native-gesture-handler` is already installed (v2.28.0)

### 2. Component Architecture

| Component | Purpose |
|-----------|---------|
| `EmergencyScreen.jsx` | Main screen - orchestrates map + sheet |
| `FullScreenEmergencyMap.jsx` | New - Map spans full screen with enhanced POIs |
| `EmergencyBottomSheet.jsx` | New - Draggable sheet with snap points |
| `ServiceTypeSelector.jsx` | Existing - Minor style tweaks |
| `SpecialtySelector.jsx` | Existing - Works as-is |
| `HospitalCard.jsx` | Existing - Add compact variant |

### 3. Bottom Sheet Snap Points

| Snap Point | Height | Use Case |
|------------|--------|----------|
| `15%` | ~120px | Collapsed - max map visibility |
| `50%` | ~400px | Default - map + selector + 1-2 cards visible |
| `85%` | ~680px | Expanded - full list scroll |

### 4. Integration with Existing Systems

| System | Integration |
|--------|-------------|
| **Tab Bar** | Sheet respects `TAB_BAR_HEIGHT`, doesn't overlap |
| **FAB** | Positioned above tab bar (existing behavior preserved) |
| **Header** | Remove `ScrollAwareHeader` usage - map takes over |
| **EmergencyContext** | Continue using for mode toggle, hospital data |
| **Haptics** | Maintain existing feedback patterns |

### 5. Map Enhancements

**Current map styling hides most POIs. New styling will:**
- Show important buildings and landmarks
- Display more road names
- Keep medical facilities highlighted (red)
- Maintain dark/light mode compatibility
- Add subtle building footprints

---

## 📱 Behavior Specifications

### Sheet Gestures
- **Drag up**: Expand sheet, reveal more hospitals
- **Drag down**: Collapse sheet, show more map
- **Tap hospital**: Zoom map to location + highlight marker

### Map Interactions
- **Tap marker**: Select hospital + scroll to card in list
- **Pinch zoom**: Standard map zoom (preserved)
- **Pan**: Standard map pan (preserved)

### FAB Behavior
- Remains anchored 16px above tab bar
- Toggles between Emergency/Bed Booking mode
- Hidden when in stack screens (existing behavior)

---

## 🎯 Key UX Improvements

| Before | After |
|--------|-------|
| Tab toggle confuses users | Single unified view |
| Map OR list visible | Map always visible |
| Static map view | Live feedback on selection |
| Basic map styling | Detailed landmarks visible |
| Scroll entire screen | Scroll only hospital list |

---

## 📁 Files to Create/Modify

### New Files
1. `components/emergency/EmergencyBottomSheet.jsx`
2. `components/map/FullScreenEmergencyMap.jsx`

### Modified Files
1. `screens/EmergencyScreen.jsx` - Major refactor
2. `components/map/EmergencyMap.jsx` - Update map styles for more detail
3. `components/emergency/HospitalCard.jsx` - Add compact mode (optional)

### No Changes Needed
- `components/emergency/ServiceTypeSelector.jsx`
- `components/emergency/SpecialtySelector.jsx`
- `components/navigation/GlobalFAB.jsx`
- `components/navigation/AnimatedTabBar.jsx`
- `contexts/EmergencyContext.jsx`
- `contexts/FABContext.jsx`

---

## ⚠️ Risk Considerations

1. **Reanimated v2/v3 compatibility** - Need to verify with existing Expo version
2. **Performance** - Full-screen map + bottom sheet + list = ensure 60fps
3. **Tab bar overlap** - Must calculate exact heights to prevent overlap
4. **Gesture conflicts** - Map pan vs sheet drag - use `simultaneousHandlers`

---

## ✅ Implementation Checklist

- [ ] 1. Install `@gorhom/bottom-sheet` and `react-native-reanimated`
- [ ] 2. Create `EmergencyBottomSheet` component with snap points
- [ ] 3. Create `FullScreenEmergencyMap` component with enhanced styling
- [ ] 4. Refactor `EmergencyScreen` with new layout
- [ ] 5. Add live map zoom feedback on hospital selection
- [ ] 6. Verify FAB and Tab Bar integration
- [ ] 7. Test on iOS and Android, dark/light mode

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    EmergencyScreen                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              FullScreenEmergencyMap                   │  │
│  │         (absolute, fills entire screen)               │  │
│  │                                                       │  │
│  │   • Edge-to-edge, no padding/margin                   │  │
│  │   • Extends behind status bar (blur overlay)          │  │
│  │   • Enhanced POI visibility                           │  │
│  │   • Responds to hospital selection (zoom)             │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              EmergencyBottomSheet                     │  │
│  │         (@gorhom/bottom-sheet)                        │  │
│  │                                                       │  │
│  │   ├── Handle Indicator (drag pill)                    │  │
│  │   │                                                   │  │
│  │   ├── STICKY HEADER ─────────────────────────────     │  │
│  │   │   └── ServiceTypeSelector / SpecialtySelector     │  │
│  │   │                                                   │  │
│  │   └── SCROLLABLE CONTENT ────────────────────────     │  │
│  │       ├── Call 911 Button (emergency mode)            │  │
│  │       ├── Section Header ("NEARBY SERVICES")          │  │
│  │       └── HospitalCard list (mapped)                  │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  AnimatedTabBar                              GlobalFAB  ││
│  │  (always visible, floats above sheet)                   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 References

- [Apple Maps HIG](https://developer.apple.com/design/human-interface-guidelines/maps)
- [@gorhom/bottom-sheet docs](https://gorhom.github.io/react-native-bottom-sheet/)
- [Uber app UX patterns](https://www.uber.com/blog/uber-design/)

---

*This document serves as the implementation guide for the Emergency Screen UX redesign. Update checklist items as tasks are completed.*

