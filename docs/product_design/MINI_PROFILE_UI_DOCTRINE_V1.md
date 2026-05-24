# Mini Profile UI Doctrine - Design System Migration Guide

## Overview

This document establishes the new UI design doctrine based on the mini profile component system. This doctrine has been successfully adopted by the Profile Screen and Settings Screen, and should be applied to other pages throughout the app.

## Core Philosophy

**Refined, Subtle, Consistent**

The mini profile design system prioritizes:
- Muted, category-specific color tones over bold primary colors
- Larger touch targets for accessibility (56 minHeight, 38 orbSize)
- Lighter typography (fontWeight 500 instead of 900)
- Shared container grouping with dividers
- No explanatory copy (subtitles) - headings are self-explanatory
- No section headings - items grouped logically

---

## Mini Profile Design System

### Location
`components/emergency/miniProfile/miniProfile.model.js`

### Color System

#### getMiniProfileColors(isDarkMode)

Returns the base color palette:

```javascript
{
  text: isDarkMode ? "#F8FAFC" : "#101827",           // Primary text
  muted: isDarkMode ? "#A7B1C2" : "#687386",          // Secondary text
  subtle: isDarkMode ? "#5C6B7F" : "#9CA3AF",         // Very subtle text
  card: isDarkMode ? "rgba(255,255,255,0.065)" : "rgba(15,23,42,0.055)",  // Card background
  cardStrong: isDarkMode ? "rgba(255,255,255,0.082)" : "rgba(15,23,42,0.07)",
  divider: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",   // Hairline dividers
  badge: isDarkMode ? "#86100E" : "#FEF2F2",         // Badge background
  badgeText: isDarkMode ? "#FFFFFF" : "#86100E",      // Badge text
  dangerText: isDarkMode ? "#FCA5A5" : "#DC2626",    // Destructive action text
}
```

**Key Characteristics:**
- All colors use rgba with low opacity for subtle appearance
- Card backgrounds are very muted (5-8% opacity)
- Dividers are hairlines (8% opacity)
- Text colors are desaturated, not pure black/white

#### getMiniProfileTones(isDarkMode)

Returns category-specific color tones:

```javascript
{
  care: {
    bg: isDarkMode ? "rgba(134,16,14,0.22)" : "rgba(134,16,14,0.11)",
    icon: isDarkMode ? "#FCA5A5" : "#DC2626",
  },
  profile: {
    bg: isDarkMode ? "rgba(248,113,113,0.18)" : "rgba(248,113,113,0.14)",
    icon: isDarkMode ? "#FCA5A5" : "#EF4444",
  },
  payment: {
    bg: isDarkMode ? "rgba(56,189,248,0.18)" : "rgba(14,165,233,0.13)",
    icon: isDarkMode ? "#7DD3FC" : "#0EA5E9",
  },
  contacts: {
    bg: isDarkMode ? "rgba(168,162,158,0.18)" : "rgba(120,113,108,0.14)",
    icon: isDarkMode ? "#D6D3D1" : "#78716C",
  },
  system: {
    bg: isDarkMode ? "rgba(148,163,184,0.18)" : "rgba(71,85,105,0.14)",
    icon: isDarkMode ? "#CBD5E1" : "#475569",
  },
  map: {
    bg: isDarkMode ? "rgba(34,197,94,0.18)" : "rgba(22,163,74,0.13)",
    icon: isDarkMode ? "#86EFAC" : "#22C55E",
  },
  destructive: {
    bg: isDarkMode ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.14)",
    icon: isDarkMode ? "#FCA5A5" : "#EF4444",
  },
}
```

**Usage:**
- Apply `tone` prop to cards based on category
- `tone.bg` for icon orb background
- `tone.icon` for icon color
- Category mapping:
  - `care`: Emergency/medical related
  - `profile`: Personal information
  - `payment`: Billing/payments
  - `contacts`: Emergency contacts
  - `system`: General app settings
  - `map`: Location/map related
  - `destructive`: Delete/sign out actions

### Layout System

#### getMiniProfileLayout(options)

Returns layout metrics:

```javascript
{
  groups: {
    radius: 28,           // Group container border radius
    gap: 16,              // Gap between groups
  },
  row: {
    minHeight: 56,        // Minimum row height
    paddingLeft: 16,      // Left padding
    paddingRight: 12,     // Right padding
    orbSize: 38,          // Icon orb size
    orbGap: 16,           // Gap between orb and content
    iconSize: 23,         // Icon size
    labelSize: 17,        // Label font size
    labelLineHeight: 22,  // Label line height
    labelWeight: "500",   // Label font weight
    contentGap: 10,       // Gap between label and right elements
    chevronSize: 17,      // Chevron icon size
    badgeMinHeight: 20,   // Badge minimum height
    badgePaddingHorizontal: 8,  // Badge horizontal padding
    badgeSize: 11,        // Badge font size
    badgeLineHeight: 16,  // Badge line height
    badgeWeight: "600",   // Badge font weight
  },
}
```

**Key Characteristics:**
- Larger touch targets (56 minHeight vs typical 44)
- Larger icons (23 vs typical 18)
- Lighter font weight (500 vs typical 900)
- Consistent spacing (16, 12, 10)

---

## Component Architecture

### MiniProfileShortcutGroup (Source of Truth)

**Location:** `components/emergency/miniProfile/MiniProfileShortcutGroup.jsx`

**Structure:**
```javascript
<MiniProfileShortcutGroup
  rows={[
    {
      key: "unique-id",
      label: "Action Label",
      icon: "icon-name",
      tone: miniProfileTones.category,
      badge: null | number,
      onPress: () => {},
    },
  ]}
  colors={miniProfileColors}
  layout={layout}
/>
```

**Key Implementation Details:**
1. **Group Container:** Single View with shared background and border radius
2. **Row Structure:** 
   - TouchableOpacity with paddingLeft, paddingRight
   - Orb (icon container) with marginRight
   - Content View (flex: 1) with divider (borderBottom)
   - Text label with numberOfLines={1}
   - Right elements (badge + chevron) in rowRight View
3. **Divider Placement:** On content View only, not on orb
4. **Divider Behavior:** Hairline width, except on last row (isLast prop)

### SettingsGroup (Adaptation for Settings)

**Location:** `components/settings/SettingsCard.jsx`

**Structure:**
```javascript
<SettingsGroup>
  <SettingsCard
    iconName="icon-name"
    title="Action Label"
    tone="category"
    isLast={true | false}
    onPress={() => {}}
    rightElement={<SettingsToggle | SettingsChevron />}
  />
</SettingsGroup>
```

**Key Differences from MiniProfileShortcutGroup:**
- Uses SettingsCard component instead of MiniProfileShortcutRow
- SettingsCard accepts rightElement prop (toggle/chevron)
- No badge support (settings don't need badges)
- Same grouping structure and divider behavior

### SettingsCard

**Props:**
- `iconName`: Ionicons icon name
- `title`: Action label (no subtitle)
- `tone`: Category tone (system, care, profile, payment, contacts, destructive)
- `isLast`: Boolean to remove divider on last row
- `onPress`: Press handler
- `rightElement`: SettingsToggle or SettingsChevron
- `destructive`: Boolean for destructive actions
- `disabled`: Boolean for disabled state

**Implementation:**
```javascript
<TouchableOpacity
  style={{
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.row.minHeight,
    paddingLeft: layout.row.paddingLeft,
    paddingRight: layout.row.paddingRight,
  }}
>
  {/* Orb */}
  <View style={{ width: layout.row.orbSize, height: layout.row.orbSize, ... }}>
    <Ionicons name={iconName} size={layout.row.iconSize} color={toneColors.icon} />
  </View>
  
  {/* Content with divider */}
  <View style={{
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: layout.row.minHeight,
    borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
    borderBottomColor: miniProfileColors.divider,
  }}>
    <Text style={{ fontSize: layout.row.labelSize, fontWeight: layout.row.labelWeight, ... }}>
      {title}
    </Text>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
      {rightElement}
    </View>
  </View>
</TouchableOpacity>
```

### SettingsToggle

**Props:**
- `value`: Boolean state
- `onToggle`: Toggle handler
- `disabled`: Boolean for disabled state

**Implementation:**
```javascript
<View style={{
  width: 40,
  height: 22,
  borderRadius: 11,
  backgroundColor: value ? COLORS.brandPrimary : "#D1D5DB",
}}>
  <View style={{
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    position: "absolute",
    left: value ? 22 : 2,
  }} />
</View>
```

**Key Characteristics:**
- Smaller than typical toggles (40x22 vs 52x30)
- No shadow (subtle appearance)
- BrandPrimary color when active

### SettingsChevron

**Implementation:**
```javascript
<Ionicons
  name="chevron-forward"
  size={layout.row.chevronSize}
  color={miniProfileColors.subtle}
/>
```

**Key Characteristics:**
- Simple icon, no background container
- Uses subtle color from mini profile colors
- Size from layout tokens (17)

---

## Adoption History

### Profile Screen Adoption

**Before:** Legacy profile screen with inconsistent styling, bold colors, individual cards

**After:** Adopted MiniProfileShortcutGroup directly

**Implementation:**
```javascript
// ProfileActionList.jsx
import MiniProfileShortcutGroup from "../../emergency/miniProfile/MiniProfileShortcutGroup";
import {
  getMiniProfileColors,
  getMiniProfileLayout,
  getMiniProfileTones,
} from "../../emergency/miniProfile/miniProfile.model";

const miniProfileColors = getMiniProfileColors(isDarkMode);
const miniProfileTones = getMiniProfileTones(isDarkMode);
const layout = getMiniProfileLayout({ content: { paddingHorizontal: 12 } });

const actionGroups = [
  [{ key: "personal-info", label: "Personal Information", icon: "person", tone: miniProfileTones.profile, ... }],
  [{ key: "emergency-contacts", label: "Emergency Contacts", icon: "people", tone: miniProfileTones.contacts, ... }],
  // ...
];

return (
  <View style={{ gap: 16 }}>
    {actionGroups.map((rows, groupIndex) => (
      <MiniProfileShortcutGroup
        key={`group-${groupIndex}`}
        rows={rows}
        colors={miniProfileColors}
        layout={layout}
      />
    ))}
  </View>
);
```

**Key Decisions:**
- Used MiniProfileShortcutGroup directly (no custom component)
- Passed data in expected format (rows array with tone, icon, label, onPress)
- Group spacing: 16
- Container paddingHorizontal: 12

### Settings Screen Adoption

**Before:** Legacy settings screen with individual cards, bold colors, subtitles, section headings

**After:** Created SettingsGroup and SettingsCard components adapted from mini profile

**Implementation:**
```javascript
// SettingsCard.jsx
export function SettingsGroup({ children, style }) {
  const miniProfileColors = getMiniProfileColors(isDarkMode);
  const layout = getMiniProfileLayout({});
  
  return (
    <View style={{
      backgroundColor: miniProfileColors.card,
      borderRadius: layout.groups.radius,
      overflow: "hidden",
    }}>
      {children}
    </View>
  );
}

export function SettingsCard({ iconName, title, tone, isLast, onPress, rightElement, ... }) {
  const miniProfileColors = getMiniProfileColors(isDarkMode);
  const miniProfileTones = getMiniProfileTones(isDarkMode);
  const layout = getMiniProfileLayout({});
  
  // Implementation matches MiniProfileShortcutRow structure
  // Padding on TouchableOpacity, divider on content View
}
```

**Key Decisions:**
- Created custom SettingsGroup instead of using MiniProfileShortcutGroup
- SettingsCard adapted from MiniProfileShortcutRow
- Added support for toggles (rightElement prop)
- Removed badge support (not needed for settings)
- Same layout tokens and color system
- Group spacing: 16
- Container paddingHorizontal: 12

---

## Migration Path from Legacy Screens

### Step 1: Analyze Current Screen

**Identify:**
- Current card structure (individual cards vs grouped)
- Color usage (bold vs muted)
- Typography (fontWeight 900 vs 500)
- Touch targets (small vs large)
- Subtitles/section headings (present vs absent)
- Divider behavior (none vs hairlines)

### Step 2: Import Mini Profile System

```javascript
import {
  getMiniProfileColors,
  getMiniProfileLayout,
  getMiniProfileTones,
} from "../emergency/miniProfile/miniProfile.model";
```

### Step 3: Choose Adoption Strategy

**Option A: Direct Use (like Profile Screen)**
- Use MiniProfileShortcutGroup directly
- Format data as rows array
- Best for: Lists with badges, navigation actions

**Option B: Adapted Components (like Settings Screen)**
- Create custom Group and Card components
- Adapt from MiniProfileShortcutGroup structure
- Best for: Settings, forms, custom interactions

### Step 4: Implement Group Structure

```javascript
const miniProfileColors = getMiniProfileColors(isDarkMode);
const miniProfileTones = getMiniProfileTones(isDarkMode);
const layout = getMiniProfileLayout({});

// Group items logically
const groups = [
  [item1, item2],  // Related items in same group
  [item3],         // Single item can be alone
];
```

### Step 5: Apply Category Tones

Map items to appropriate tones:
- `care`: Emergency/medical
- `profile`: Personal information
- `payment`: Billing/payments
- `contacts`: Emergency contacts
- `system`: General settings
- `map`: Location/map
- `destructive`: Delete/sign out

### Step 6: Remove Noise

- Remove all subtitles (explanatory copy)
- Remove section headings (self-explanatory)
- Remove bold colors (use muted tones)
- Reduce font weight to 500
- Increase touch targets to 56 minHeight

### Step 7: Implement Divider Structure

**Critical:**
- Padding on TouchableOpacity (paddingLeft, paddingRight)
- Divider on content View only (not orb)
- Content View has flex: 1
- Divider is hairline width
- Remove divider on last row (isLast prop)

### Step 8: Test and Refine

- Verify divider placement (should not span orb)
- Verify divider touches right edge
- Verify touch targets are accessible
- Verify category tones are appropriate
- Verify spacing is consistent

---

## Best Practices for Other Pages

### When to Apply This Doctrine

**Apply to:**
- Lists of actions/settings
- Navigation menus
- Profile-related screens
- Settings screens
- Any list with icons and labels

**Do NOT apply to:**
- Content-heavy screens (articles, details)
- Forms with inputs (use InputModal design system)
- Tables/grids
- Media galleries
- Dashboard widgets

### Component Reuse

**Reuse SettingsGroup/SettingsCard for:**
- Any settings-like interface
- Lists with toggles/chevrons
- Preference screens
- Configuration screens

**Create New Components for:**
- Lists with badges (use MiniProfileShortcutGroup)
- Lists with custom right elements
- Lists with different interaction patterns

### Tone Mapping Guidelines

**care:** Emergency, medical, health-related
**profile:** Personal information, account details
**payment:** Billing, payments, insurance
**contacts:** Emergency contacts, people
**system:** General app settings, preferences
**map:** Location, maps, navigation
**destructive:** Delete, sign out, irreversible actions

### Spacing Guidelines

- Group gap: 16
- Container paddingHorizontal: 12
- Row minHeight: 56
- Orb size: 38
- Orb gap: 16
- Content gap: 10

### Typography Guidelines

- Label size: 17
- Label weight: 500
- Label line height: 22
- Letter spacing: -0.12
- numberOfLines: 1 (truncate if needed)

### Divider Guidelines

- Width: StyleSheet.hairlineWidth
- Color: miniProfileColors.divider
- Placement: On content View only
- Behavior: Remove on last row (isLast prop)

### Accessibility Guidelines

- Minimum touch target: 56x56 (row minHeight)
- Icon size: 23 (minimum 21 for accessibility)
- Contrast: Ensure text colors meet WCAG AA
- Haptic feedback: On press

---

## Common Pitfalls

### Pitfall 1: Divider on Entire Row

**Wrong:**
```javascript
<TouchableOpacity style={{ borderBottomWidth: StyleSheet.hairlineWidth, ... }}>
  {/* Orb and content */}
</TouchableOpacity>
```

**Right:**
```javascript
<TouchableOpacity style={{ paddingLeft: 16, paddingRight: 12, ... }}>
  <View style={{ orb, ... }} />
  <View style={{ flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, ... }}>
    {/* Content */}
  </View>
</TouchableOpacity>
```

### Pitfall 2: Bold Colors

**Wrong:**
```javascript
backgroundColor: COLORS.brandPrimary  // Too bold
```

**Right:**
```javascript
backgroundColor: miniProfileTones.care.bg  // Muted tone
```

### Pitfall 3: Subtitles

**Wrong:**
```javascript
<SettingsCard
  title="Dark Mode"
  subtitle="Tap to toggle theme"  // Unnecessary noise
/>
```

**Right:**
```javascript
<SettingsCard
  title="Dark Mode"  // Self-explanatory
/>
```

### Pitfall 4: Section Headings

**Wrong:**
```javascript
<SettingsSectionHeading title="Notifications" />
<SettingsCard ... />
```

**Right:**
```javascript
<SettingsGroup>
  <SettingsCard title="All Notifications" />
  <SettingsCard title="Appointment Reminders" />
</SettingsGroup>
```

### Pitfall 5: Wrong Font Weight

**Wrong:**
```javascript
fontWeight: "900"  // Too bold
```

**Right:**
```javascript
fontWeight: "500"  // Lighter, refined
```

### Pitfall 6: Small Touch Targets

**Wrong:**
```javascript
minHeight: 44  // Too small
```

**Right:**
```javascript
minHeight: 56  // Accessible
```

---

## Summary

The mini profile UI doctrine establishes a refined, subtle design system that:

1. **Uses muted category-specific tones** instead of bold primary colors
2. **Groups items in shared containers** with dividers
3. **Removes noise** (subtitles, section headings)
4. **Increases touch targets** for accessibility
5. **Lightens typography** (fontWeight 500)
6. **Places dividers strategically** (content only, not orb)

This doctrine has been successfully adopted by:
- Profile Screen (direct use of MiniProfileShortcutGroup)
- Settings Screen (adapted SettingsGroup/SettingsCard)

Apply this doctrine to other pages by:
1. Importing mini profile system
2. Choosing adoption strategy (direct or adapted)
3. Implementing group structure
4. Applying category tones
5. Removing noise
6. Following divider structure guidelines

**Result:** A cohesive, refined UI voice across the app.
