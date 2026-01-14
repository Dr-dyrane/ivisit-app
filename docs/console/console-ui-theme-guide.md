# iVisit Console UI Theme & Component Guide

## Overview
This document outlines the complete design system, color scheme, and reusable component patterns for the iVisit console version. The mobile app uses a sophisticated dark/light theme system with emergency-focused branding.

## 🎨 Color System

### Primary Brand Colors
```javascript
// constants/colors.js
brandPrimary: "#86100E",  // iVisit red (emergency / attention)
brandSecondary: "#B71C1C", // Slightly darker red for accents / hover / borders
```

### Background Colors
```javascript
bgDark: "#0B0F1A",      // Deep black/blue-ish for dark mode
bgDarkAlt: "#121826",    // Slightly lighter for cards / inputs
bgLight: "#FFFFFF",      // Pure white for light mode
bgLightAlt: "#F5F5F5",   // Slightly gray for cards / inputs
```

### Text Colors
```javascript
textPrimary: "#1A1A1A",     // Almost black for main text (light mode)
textMuted: "#7E7E7E",       // Gray for secondary / helper text
textLight: "#FFFFFF",       // White for dark mode main text
textMutedDark: "#B0B0B0",   // Gray for dark mode secondary text
```

### Status Colors
```javascript
success: "#B71C1C",    // Uses red family for consistency
error: "#C62828",      // Red error
warning: "#B71C1C",    // Reuse dark red
info: "#86100E",       // Info also uses brand red
```

### Tailwind Extended Colors
```javascript
// Primary (Deep Red)
primary: {
  DEFAULT: "#86100E",
  dark: "#5c0a09",
  foreground: "#ffffff",
  foregroundDark: "#f8d7da"
}

// Secondary (Soft Blue-Gray)
secondary: {
  DEFAULT: "#e2e8f0",
  dark: "#1e293b",
  foreground: "#1e293b",
  foregroundDark: "#e2e8f0"
}

// Accent (Reddish Pink)
accent: {
  DEFAULT: "#e0f2fe",
  dark: "#1A73E8",
  500: "#f43f5e", // Primary accent color
  // ... 50-950 scale
}

// Card Backgrounds
card: {
  DEFAULT: "#ffffff",
  dark: "#0D121D",
  foreground: "#1e293b",
  foregroundDark: "#e5e7eb"
}
```

## 🏗️ Design Principles

### Border Radius System
- **xl**: 16px (larger cards)
- **lg**: 12px (standard cards)
- **md**: 10px (medium components)
- **sm**: 8px (small components)
- **full**: 9999px (pill-shaped buttons & badges)

### Typography
- **Font Family**: Inter var, sans-serif
- **Font Weights**: 900 (headings), 800 (subheadings), 700 (emphasis), 600 (body), 500 (muted)
- **Letter Spacing**: Negative for headings (-1.2 to -0.5), positive for labels (1.5-2)

### Shadow System
- **Cards**: shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 20
- **Active Elements**: shadowColor: COLORS.brandPrimary, shadowOpacity: 0.3-0.4
- **Subtle**: shadowOpacity: 0.03-0.08

## 🧩 Reusable Component Patterns

### 1. Card Components

#### Base Card Structure
```jsx
const BaseCard = ({ children, isSelected, isDarkMode }) => {
  const activeBG = isSelected
    ? isDarkMode ? COLORS.brandPrimary + "20" : COLORS.brandPrimary + "15"
    : isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: activeBG,
        shadowColor: isSelected ? COLORS.brandPrimary : "#000",
        shadowOpacity: isDarkMode ? 0.2 : 0.08,
        elevation: isSelected ? 10 : 2,
      }
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 36,        // Large rounded corners
    padding: 24,            // Generous padding
    marginBottom: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
  }
});
```

#### Hospital Card Pattern
```jsx
// Key features: Image overlay, badges, stats pills, action buttons
<View style={styles.imageContainer}>
  <Image source={{ uri: hospitalImage }} style={styles.image} />
  <View style={styles.priceBadge}>
    <Text style={styles.priceText}>{price}</Text>
  </View>
  {verified && (
    <View style={styles.verifiedBadge}>
      <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
      <Text style={styles.verifiedText}>VERIFIED</Text>
    </View>
  )}
</View>

// Stats Pills
<View style={styles.pillRow}>
  <View style={styles.statPill}>
    <Ionicons name="location" size={12} color={COLORS.brandPrimary} />
    <Text style={styles.statText}>{distance}</Text>
  </View>
  <View style={styles.statPill}>
    <Ionicons name="time" size={12} color={COLORS.brandPrimary} />
    <Text style={styles.statText}>{waitTime}</Text>
  </View>
</View>
```

### 2. Login/Auth Components

#### Social Auth Button
```jsx
const SocialAuthButton = ({ provider }) => {
  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[
        styles.socialButton,
        {
          backgroundColor: isDarkMode ? "#121826" : "#F3E7E7",
          transform: [{ scale }]
        }
      ]}>
        <Ionicons name={icon} size={24} color={isDarkMode ? "#FFF" : "#1F2937"} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  socialButton: {
    width: width * 0.23,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  }
});
```

#### Contact Selection Card
```jsx
const ContactButton = ({ type, icon, label, description }) => {
  return (
    <Pressable style={styles.contactCard}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={28} color="white" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={18} color={mutedColor} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  contactCard: {
    backgroundColor: colors.card,
    borderRadius: 36,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    backgroundColor: COLORS.brandPrimary,
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
  }
});
```

### 3. Input Components

#### Themed Input Field
```jsx
const Input = ({ label, placeholder, icon, ...props }) => {
  const colors = {
    bg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    activeBG: isDarkMode ? "#1E293B" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    muted: isDarkMode ? "#94A3B8" : "#64748B",
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.muted }]}>
          {label.toUpperCase()}
        </Text>
      )}
      <View style={[
        styles.inputContainer,
        {
          backgroundColor: isFocused ? colors.activeBG : colors.bg,
          shadowColor: isFocused ? COLORS.brandPrimary : "#000",
          shadowOpacity: isFocused ? 0.15 : 0.03,
        }
      ]}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={22} 
            color={isFocused ? COLORS.brandPrimary : colors.muted} 
          />
        )}
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholderTextColor={colors.muted}
          selectionColor={COLORS.brandPrimary}
          {...props}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 20 },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  }
});
```

### 4. Emergency/Trip Components

#### Trip Summary Card Pattern
```jsx
const TripSummaryCard = ({ status, eta, driverInfo, actions }) => {
  return (
    <View style={styles.card}>
      {/* Header Island */}
      <View style={styles.headerIsland}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.editorialSubtitle, { color: COLORS.brandPrimary }]}>
            STATUS
          </Text>
          <Text style={[styles.editorialTitle, { color: textColor }]}>
            {status.toUpperCase()}
          </Text>
        </View>
        <View style={styles.etaBadge}>
          <Text style={styles.etaValue}>{eta}</Text>
          <Text style={styles.etaUnit}>MIN</Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={styles.vitalTrack}>
        <View style={[styles.vitalFill, { width: `${progress * 100}%` }]} />
        <View style={[styles.vitalPlow, { left: `${progress * 100}%` }]} />
      </View>

      {/* Identity Widget */}
      <View style={styles.identityWidget}>
        <View style={styles.squircleAvatar}>
          <Ionicons name="person" size={24} color={COLORS.brandPrimary} />
        </View>
        <View style={styles.identityText}>
          <Text style={styles.nameText}>{driverName}</Text>
          <Text style={styles.metaText}>{rating} ★ • {vehicle}</Text>
        </View>
      </View>

      {/* Action Grid */}
      <View style={styles.actionGrid}>
        <Pressable style={styles.iconAction}>
          <Ionicons name="call" size={22} color={COLORS.brandPrimary} />
        </Pressable>
        <Pressable style={styles.cancelAction}>
          <Text style={styles.cancelActionText}>CANCEL</Text>
        </Pressable>
        <Pressable style={styles.completeAction}>
          <Text style={styles.completeActionText}>COMPLETE</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 36,
    padding: 24,
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  headerIsland: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editorialSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  editorialTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  etaBadge: {
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
    minWidth: 65,
  },
  vitalTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    marginBottom: 24,
    position: 'relative',
  },
  identityWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 20,
  },
  squircleAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandPrimary + '15',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  iconAction: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.brandPrimary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeAction: {
    flex: 1.5,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
```

### 5. Emergency Call Card

#### Call 911 Card Pattern
```jsx
const Call911Card = ({ message }) => {
  return (
    <Animated.View style={styles.container}>
      <View style={styles.iconWrapper}>
        <LinearGradient
          colors={[COLORS.brandPrimary, "#991B1B"]}
          style={styles.iconContainer}
        >
          <Fontisto name="ambulance" size={28} color="#FFFFFF" />
        </LinearGradient>
      </View>

      <Text style={[styles.title, { color: textColor }]}>
        Emergency Services Needed?
      </Text>
      <Text style={[styles.message, { color: mutedColor }]}>
        {message}
      </Text>

      <Pressable style={styles.callButton}>
        <Ionicons name="call" size={22} color="#FFFFFF" />
        <Text style={styles.callButtonText}>Call 911</Text>
      </Pressable>

      <Text style={[styles.disclaimer, { color: mutedColor }]}>
        For life-threatening emergencies, call 911 immediately
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 30,
    padding: 28,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 20,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    gap: 10,
    width: "100%",
    backgroundColor: COLORS.brandPrimary,
  }
});
```

## 🎯 Key UI Patterns for Console

### 1. Badge System
```jsx
const Badge = ({ text, variant = "primary" }) => {
  const variants = {
    primary: { bg: COLORS.brandPrimary, text: "#FFFFFF" },
    success: { bg: "rgba(16, 185, 129, 0.95)", text: "#FFFFFF" },
    muted: { bg: COLORS.brandPrimary + "10", text: COLORS.brandPrimary },
  };

  return (
    <View style={[
      styles.badge,
      { backgroundColor: variants[variant].bg }
    ]}>
      <Text style={[styles.badgeText, { color: variants[variant].text }]}>
        {text}
      </Text>
    </View>
  );
};
```

### 2. Action Button System
```jsx
const ActionButton = ({ variant = "primary", size = "medium", ...props }) => {
  const variants = {
    primary: {
      backgroundColor: COLORS.brandPrimary,
      textColor: "#FFFFFF",
      shadowColor: COLORS.brandPrimary,
    },
    secondary: {
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9",
      textColor: isDarkMode ? "#FFFFFF" : "#64748B",
    },
    ghost: {
      backgroundColor: "transparent",
      textColor: COLORS.brandPrimary,
    }
  };

  const sizes = {
    small: { height: 44, paddingHorizontal: 20, borderRadius: 22 },
    medium: { height: 56, paddingHorizontal: 24, borderRadius: 20 },
    large: { height: 64, paddingHorizontal: 32, borderRadius: 24 },
  };

  return (
    <Pressable style={[
      styles.button,
      sizes[size],
      variants[variant]
    ]}>
      <Text style={[styles.buttonText, { color: variants[variant].textColor }]}>
        {children}
      </Text>
    </Pressable>
  );
};
```

### 3. Progress Indicators
```jsx
const ProgressBar = ({ progress, color = COLORS.brandPrimary }) => (
  <View style={styles.track}>
    <View style={[
      styles.fill,
      { width: `${progress * 100}%`, backgroundColor: color }
    ]} />
    <View style={[
      styles.thumb,
      { left: `${progress * 100}%`, backgroundColor: color }
    ]} />
  </View>
);

const styles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: COLORS.brandPrimary,
    shadowOpacity: 0.5,
    shadowRadius: 5,
  }
});
```

## 🌙 Dark Mode Implementation

### Theme Context Pattern
```jsx
const useThemeColors = () => {
  const { isDarkMode } = useTheme();
  
  return {
    background: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
    card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
    text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
    muted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
    border: isDarkMode ? "#2A2A2A" : "#E0E0E0",
  };
};
```

## 📱 Responsive Considerations

### Breakpoint System
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

### Console-Specific Adaptations
1. **Hover States**: Add hover effects for mouse interactions
2. **Keyboard Navigation**: Implement tab navigation and focus states
3. **Larger Touch Targets**: Increase minimum click areas to 44px
4. **Density Controls**: Allow users to adjust spacing and information density

## 🚀 Implementation Recommendations

### For Console Development:
1. **CSS Variables**: Use CSS custom properties for theme switching
2. **Component Library**: Build reusable components following the patterns above
3. **Design Tokens**: Store all design values (colors, spacing, typography) as tokens
4. **State Management**: Implement consistent loading, error, and success states
5. **Accessibility**: Ensure WCAG AA compliance with proper contrast ratios

### CSS Implementation Example:
```css
:root {
  --brand-primary: #86100E;
  --brand-secondary: #B71C1C;
  --bg-dark: #0B0F1A;
  --bg-light: #FFFFFF;
  --text-primary: #1A1A1A;
  --text-light: #FFFFFF;
  --border-radius-xl: 16px;
  --border-radius-lg: 12px;
  --border-radius-full: 9999px;
}

[data-theme="dark"] {
  --background: var(--bg-dark);
  --text: var(--text-light);
  --card: var(--bg-dark-alt);
}

[data-theme="light"] {
  --background: var(--bg-light);
  --text: var(--text-primary);
  --card: var(--bg-light-alt);
}

.card {
  background: var(--card);
  border-radius: var(--border-radius-xl);
  padding: 24px;
  box-shadow: 0 12px 20px rgba(134, 16, 14, 0.15);
}

.btn-primary {
  background: var(--brand-primary);
  color: white;
  border-radius: var(--border-radius-lg);
  padding: 16px 24px;
  font-weight: 900;
  box-shadow: 0 8px 12px rgba(134, 16, 14, 0.3);
}
```

This guide provides a comprehensive foundation for building the console version of iVisit while maintaining design consistency with the mobile app.
