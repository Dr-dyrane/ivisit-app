# Quick Start: Scroll-Aware Headers + API Services

**Goal:** Get your first scroll-aware header working in 30 minutes

---

## **Step 1: Add Provider to _layout.js** (5 min)

```javascript
// app/_layout.js

import { ScrollAwareHeaderProvider } from '../contexts/ScrollAwareHeaderContext';
import { TabBarVisibilityProvider } from '../contexts/TabBarVisibilityContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <TabBarVisibilityProvider>
          <ScrollAwareHeaderProvider>
            <EmergencyProvider>
              <ToastProvider>
                {/* Your layout */}
              </ToastProvider>
            </EmergencyProvider>
          </ScrollAwareHeaderProvider>
        </TabBarVisibilityProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

---

## **Step 2: Update EmergencyScreen** (10 min)

**Before:**
```javascript
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";

export default function EmergencyScreen() {
  const { handleScroll } = useTabBarVisibility();
  
  return (
    <LinearGradient ...>
      {/* Static header - only animates on mount */}
      <Animated.View style={{ opacity: fadeAnim, ... }}>
        {/* Header content */}
      </Animated.View>
      
      <ScrollView onScroll={handleScroll}>
        {/* Content */}
      </ScrollView>
    </LinearGradient>
  );
}
```

**After:**
```javascript
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import ScrollAwareHeader from "../components/headers/ScrollAwareHeader";
import { Ionicons } from "@expo/vector-icons";

export default function EmergencyScreen() {
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const { handleScroll: handleHeaderScroll } = useScrollAwareHeader();
  
  // Combine both scroll handlers
  const handleScroll = useCallback((event) => {
    handleTabBarScroll(event);
    handleHeaderScroll(event);
  }, [handleTabBarScroll, handleHeaderScroll]);

  return (
    <LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
      {/* NEW: Scroll-aware header */}
      <ScrollAwareHeader
        title={mode === "emergency" ? "Ambulance Call" : "Reserve Bed"}
        subtitle={mode === "emergency" ? "EMERGENCY" : "BOOK BED"}
        icon={
          mode === "emergency" ? (
            <Ionicons name="medical" size={26} color="#FFFFFF" />
          ) : (
            <Fontisto name="bed-patient" size={22} color="#FFFFFF" />
          )
        }
        backgroundColor={COLORS.brandPrimary}
      />

      {/* REST OF CONTENT - Remove the old animated header */}
      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {/* Your existing content */}
      </ScrollView>
    </LinearGradient>
  );
}
```

---

## **Step 3: Test on One Screen First** (5 min)

```bash
npm install --legacy-peer-deps  # If needed
expo start --android  # or --ios
```

**Check:**
- ✅ Header appears on screen
- ✅ Scroll down → header hides smoothly
- ✅ Scroll up → header appears smoothly
- ✅ Tab bar also hides/shows together
- ✅ At top of screen, header always visible

---

## **Step 4: Apply to All Tab Screens** (10 min)

Repeat Step 2 for:
- `ProfileScreen`
- `VisitsScreen`
- `MoreScreen`
- `NotificationsScreen`

**Different header for each:**

```javascript
// ProfileScreen
<ScrollAwareHeader
  title="Profile"
  subtitle="YOUR ACCOUNT"
  icon={<Ionicons name="person" size={26} color="#FFFFFF" />}
  backgroundColor={COLORS.brandPrimary}
/>

// VisitsScreen
<ScrollAwareHeader
  title="Medical Visits"
  subtitle="YOUR APPOINTMENTS"
  icon={<Ionicons name="calendar" size={26} color="#FFFFFF" />}
  backgroundColor={COLORS.brandPrimary}
  badge={visitCount}
/>

// NotificationsScreen
<ScrollAwareHeader
  title="Notifications"
  subtitle="ALERTS & UPDATES"
  icon={<Ionicons name="notifications" size={26} color="#FFFFFF" />}
  backgroundColor={COLORS.brandPrimary}
  badge={unreadCount}
/>
```

---

## **Step 5: Add API Services (Optional, For Later)**

When ready to refactor data fetching:

```javascript
// hooks/queries/useProfile.js
import { userService } from '@/api/services';
import { useAuth } from '@/contexts/AuthContext';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const userData = await userService.getUserById(user.id);
        setProfile(userData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetch();
  }, [user.id]);

  return { profile, loading, error };
}

// Usage in ProfileScreen
const { profile, loading } = useProfile();

if (loading) return <LoadingSpinner />;

return (
  <Input value={profile.fullName} placeholder="Full Name" />
  // ...
);
```

---

## **Done! ✅**

You now have:

1. ✅ Scroll-aware headers on all screens
2. ✅ Matching Apple UX pattern
3. ✅ Tab bar + header animate together
4. ✅ Content visible behind header when scrolling
5. ✅ Foundation for API services

Next: Start migrating data fetching to `userService` and other services when ready.

---

## **Troubleshooting**

### **Header doesn't hide on scroll**

Check:
```javascript
<ScrollView
  scrollEventThrottle={16}   // ← Must be 16 or less
  onScroll={handleScroll}     // ← Passing correct handler
>
```

### **Header hides immediately**

Check threshold in `ScrollAwareHeaderContext`:
```javascript
if (currentScrollY < 50) {  // Only hide after 50px scroll
  showHeader();
  return;
}
```

### **Animation feels sluggish**

Check:
```javascript
Animated.timing(headerOpacity, {
  useNativeDriver: true,  // ← Must be true!
  duration: 250,           // ← Apple standard
})
```

### **Header stuck in middle state**

Check animation guards:
```javascript
if (isHidden.current || isAnimating.current) return;
```

---

## **Next: Read These**

1. **`docs/ARCHITECTURE.md`** - Full system design
2. **`docs/CONTEXT_REVIEW.md`** - Deep dive on your patterns vs Apple
3. **`.zencoder/rules/repo.md`** - Project overview

This is your checkpoint for taking iVisit to production-grade.
