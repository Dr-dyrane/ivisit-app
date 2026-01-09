# iVisit App Architecture - Checkpoint Refactor

**Version**: 1.1  
**Date**: 2026-01-09  
**Status**: Implementation Phase (Local-first)  
**Goal**: Ship a complete iVisit MVP on local storage, with clean service boundaries so Supabase later is a swap (not a rewrite).

---

## **1. Core Philosophy**

### **Three Layers**

```
┌─────────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (Screens, Components, Animations)            │
│ - Expo Router (file-based navigation)                            │
│ - React Native components                                        │
│ - Animated API (60fps scroll, transitions)                       │
│ - Context Providers (UI state)                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ BUSINESS LOGIC LAYER (Hooks, Context, Services)                 │
│ - Custom hooks (useLogin, useProfile, etc.)                      │
│ - Context providers (Auth, Theme, UI state)                      │
│ - Query/mutation wrappers                                        │
│ - Error handling & toast notifications                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DATA ACCESS LAYER (AsyncStorage DB, API Services)               │
│ - `database.js` - Low-level AsyncStorage abstraction             │
│ - `services/` - Collection-specific CRUD logic                   │
│ - Error classes for typed exceptions                             │
│ - (Future) HTTP client for real backend API                      │
└─────────────────────────────────────────────────────────────────┘
```

### **Why This Structure**

- ✅ **Separation of concerns** - Each layer has one responsibility
- ✅ **Testability** - Easy to mock services and test logic independently
- ✅ **Scalability** - Replace AsyncStorage with HTTP client without touching UI
- ✅ **Maintainability** - Clear data flow, predictable patterns
- ✅ **Backend-ready** - Services are already the right abstraction for API endpoints
- ✅ **Local-first product velocity** - We can ship flows before backend integration

---

## **2. Data Layer (AsyncStorage as Database)**

### **Current Structure (in this repo)**

```
database/
├── db.js                 ← Low-level AsyncStorage wrapper + CRUD helpers
├── keys.js               ← StorageKeys whitelist (single source of truth)
└── index.js              ← Main export: database, StorageKeys, errors

services/
├── authService.js        ← Auth + user model operations (local-first)
├── profileCompletionService.js
└── ... (next: preferences, visits, contacts, medical)

api/
├── auth.js               ← UI-facing wrappers around services
├── profileCompletion.js  ← Completion draft wrappers
└── ... (next: preferences, visits, contacts, medical)
```

### **How It Works**

#### **1. database (Generic Layer)**

```javascript
import { database, StorageKeys } from "../database";

// Low-level operations
await database.write(StorageKeys.USERS, users);
await database.read(StorageKeys.USERS, []);
const user = await database.findOne(StorageKeys.USERS, (u) => u.id === "123");
const users = await database.query(StorageKeys.USERS, (u) => u.status === "active");
```

**Features:**
- Generic CRUD: `read`, `write`, `delete`
- Querying: `findOne`, `query`
- Collections: `createOne`, `updateOne`, `deleteOne`
- Error handling with `DatabaseError` (typed exceptions)
- Timeout protection (5s default)
- Validation (key whitelist)

#### **2. services (Domain Layer)**

```javascript
import { authService } from "../services/authService";

// Business logic operations
const result = await authService.register({ email, username, password });
const user = result.data.user;
```

**Each service:**
- Wraps database operations
- Adds validation & business rules
- Provides domain-specific methods
- Returns typed errors

#### **3. api/* (UI Contract Layer)**

Screens/components should call `api/*` functions (or hooks that call them), not the database directly.

```javascript
import { updateUserAPI } from "../api/auth";

await updateUserAPI({ fullName, username });
```

---

## **3. Scroll-Aware Components (UI Pattern)**

### **Pattern: Apple-Style Navigation**

Two parallel contexts handle scroll-aware UI:

```
┌─────────────────────────────────────┐
│ TabBarVisibilityContext (Existing)   │
├─────────────────────────────────────┤
│ • trackScroll(event)                 │
│ • showTabBar() / hideTabBar()        │
│ • Animated.Value for translateY      │
│ • 250ms animation duration           │
│ • 5px debounce threshold             │
│ • Always show near top (< 50px)      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ScrollAwareHeaderContext (NEW)       │
├─────────────────────────────────────┤
│ • Parallel to TabBarVisibility       │
│ • Controls header opacity + translateY │
│ • Title fades in/out with scroll     │
│ • Same thresholds & timing           │
│ • Blur effect for content visibility │
└─────────────────────────────────────┘
```

### **Usage in Screen**

```javascript
// EmergencyScreen.jsx (Example)
import { useTabBarVisibility } from '@/contexts/TabBarVisibilityContext';
import { useScrollAwareHeader } from '@/contexts/ScrollAwareHeaderContext';
import ScrollAwareHeader from '@/components/headers/ScrollAwareHeader';

export default function EmergencyScreen() {
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const { handleScroll: handleHeaderScroll } = useScrollAwareHeader();

  const handleScroll = (event) => {
    handleTabBarScroll(event);
    handleHeaderScroll(event);  // Both triggered by same scroll event
  };

  return (
    <>
      <ScrollAwareHeader
        title="Ambulance Call"
        subtitle="EMERGENCY"
        icon={<Icon />}
      />
      <ScrollView onScroll={handleScroll} scrollEventThrottle={16}>
        {/* Content */}
      </ScrollView>
    </>
  );
}
```

### **Key Props for ScrollAwareHeader**

```javascript
<ScrollAwareHeader
  title="Screen Title"           // Main heading
  subtitle="CATEGORY"            // Uppercase label
  icon={<IconComponent />}       // Badge icon
  backgroundColor="#86100E"      // Icon bg color
  badge={count}                  // Optional badge number
  onBadgePress={callback}        // Badge tap handler
/>
```

---

## **4. Hook Pattern (Business Logic)**

### **Query Hooks (Data Fetching)**

```javascript
// hooks/queries/useProfile.js
export function useProfile(userId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const user = await userService.getUserById(userId);
        setData(user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [userId]);

  return { data, loading, error };
}
```

### **Mutation Hooks (Data Modification)**

```javascript
// hooks/mutations/useUpdateProfile.js
export function useUpdateProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const mutate = async (userId, updates) => {
    setLoading(true);
    try {
      const updated = await userService.updateUser(userId, updates);
      showToast('Profile updated!', 'success');
      return updated;
    } catch (err) {
      setError(err);
      showToast(err.message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
```

---

## **5. Context Providers (State Management)**

### **Existing Contexts (Keep These)**

| Context | Purpose | State |
|---------|---------|-------|
| `AuthContext` | User auth & login | user, token, loading |
| `ThemeContext` | Dark/light mode | isDarkMode |
| `EmergencyContext` | Hospital selection | selectedHospital, mode, viewMode |
| `ToastContext` | Notifications | toastMessages |
| `TabBarVisibilityContext` | Bottom nav scroll | translateY, handleScroll |

### **Contexts We Add Only When Needed**

| Context | Purpose | State |
|---------|---------|-------|
| `ScrollAwareHeaderContext` | Header scroll-aware | headerOpacity, titleOpacity, headerTranslateY |
| `VisitsContext` | Visits state (already present) | visits, selectedVisit, filters |

---

## **6. Current Milestones**

### **Phase 3 (Complete) — Profile completion gate**
- Enforces required profile fields before accessing tabs.
- Persists completion draft so user can resume after restart.
- Uses service/API wrappers (no direct storage calls from UI).

### **Phase 4 (Next) — Local-first feature completion**
- Implement full CRUD + persistence for:
  - Preferences (Theme, notifications, privacy) via `StorageKeys.PREFERENCES` / `StorageKeys.THEME`
  - Emergency contacts via `StorageKeys.EMERGENCY_CONTACTS`
  - Medical profile/history (new storage key + service)
  - Visits end-to-end via `StorageKeys.VISITS`
- Standardize all screens to the same patterns:
  - Scroll-aware header + tab bar behavior
  - Loading/empty/error states
  - Predictable navigation and no redirect loops

### **After Phase 4 — Emergency patient POV completion**
- Ensure the SOS journey is complete from patient POV:
  - Request → confirm → live status → add to visit history
  - Uses persisted emergency contacts + medical profile where applicable

**Rule**: Context = UI state only. Data fetching goes in hooks.

---

## **6. Refactor Roadmap**

### **Phase 1: Core Modularization (Days 1-2)**

```
✅ Create database.js (generic layer)
✅ Create services (userService, visitService)
✅ Create ScrollAwareHeaderContext
✅ Create ScrollAwareHeader component
📋 Create query hooks (useProfile, useVisits)
📋 Create mutation hooks (useUpdateProfile, useLogin)
```

### **Phase 2: Screen Migration (Days 3-5)**

```
📋 EmergencyScreen - Add ScrollAwareHeader + header hook
📋 ProfileScreen - Add ScrollAwareHeader + query/mutation hooks
📋 VisitsScreen - Add ScrollAwareHeader + visits hook
📋 MoreScreen - Add ScrollAwareHeader
📋 NotificationsScreen - Add ScrollAwareHeader
```

### **Phase 3: Auth Refactor (Days 6-7)**

```
📋 Replace userStore.js calls with userService
📋 Update AuthContext to use userService
📋 Update login/signup flows with userService
```

### **Phase 4: Backend Integration (Days 8+)**

```
📋 Create http-client.js (axios wrapper)
📋 Create env-specific API endpoints
📋 Update services to call backend instead of AsyncStorage
📋 No UI changes needed (services abstract data source)
```

---

## **7. File Structure (Target State)**

```
app/
├── (auth)/
├── (user)/
│   └── (tabs)/
└── _layout.js

api/
├── database.js                 ← AsyncStorage abstraction
├── http-client.js              ← (Future) HTTP client
├── auth.js                      ← (Keep existing)
└── services/
    ├── userService.js
    ├── visitService.js
    ├── hospitalService.js
    ├── emergencyContactService.js
    └── index.js

contexts/
├── AuthContext.jsx
├── ThemeContext.jsx
├── TabBarVisibilityContext.jsx
├── ScrollAwareHeaderContext.jsx ← NEW
├── EmergencyContext.jsx
├── ToastContext.jsx
├── VisitsContext.jsx
└── ... (others)

hooks/
├── queries/
│   ├── useProfile.js            ← NEW
│   ├── useVisits.js
│   └── useHospitals.js
├── mutations/
│   ├── useUpdateProfile.js      ← NEW
│   ├── useCreateVisit.js
│   └── ... (existing)
└── validators/

components/
├── headers/
│   ├── ScrollAwareHeader.jsx    ← NEW
│   └── useScrollAwareHeader.js
├── ... (existing)
└── ...

screens/
├── EmergencyScreen.jsx
├── ProfileScreen.jsx
├── VisitsScreen.jsx
├── MoreScreen.jsx
├── NotificationsScreen.jsx
└── ... (existing)

docs/
├── ARCHITECTURE.md              ← This file
├── CONTEXT_REVIEW.md
└── QUICK_START.md
```

---

## **8. Migration Examples**

### **Before (userStore + monolithic)**

```javascript
// screens/ProfileScreen.jsx
useEffect(() => {
  const fetch = async () => {
    try {
      const { data } = await getCurrentUserAPI();
      setFullName(data.fullName);
      setEmail(data.email);
      // ... 10 more setStates
    } catch (e) {
      showToast(e.message);
    }
  };
  fetch();
}, []);
```

### **After (Service + Hook)**

```javascript
// hooks/queries/useProfile.js
export function useProfile(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.getUserById(userId)
      .then(setUser)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [userId]);

  return { user, loading };
}

// screens/ProfileScreen.jsx
const { user, loading } = useProfile(userId);

if (loading) return <LoadingSpinner />;

return (
  <Input value={user.fullName} />
  // ...
);
```

---

## **9. Error Handling Pattern**

### **Typed Errors**

```javascript
import { DatabaseError } from '@/api/database';

try {
  await userService.createUser({ email, password });
} catch (error) {
  if (error.code === 'USER_EXISTS') {
    showToast('Email already registered');
  } else if (error.code === 'VALIDATION_ERROR') {
    showToast('Check your inputs');
  } else {
    showToast('Unexpected error');
  }
}
```

---

## **10. Backend Integration Checklist**

When connecting to real API:

- [ ] Create `api/http-client.js` (axios wrapper with auth interceptors)
- [ ] Create `.env.example` with `API_URL`
- [ ] Update `userService.js` to call HTTP endpoints
- [ ] Update `visitService.js` to call HTTP endpoints
- [ ] Add error mapping (HTTP status codes → DatabaseError codes)
- [ ] Test auth flow end-to-end
- [ ] Add request/response logging
- [ ] Test offline error handling
- [ ] Update error messages for production

---

## **11. Testing Strategy**

### **Unit Tests**

```javascript
// __tests__/api/userService.test.js
describe('userService', () => {
  it('should create user', async () => {
    const user = await userService.createUser({
      email: 'test@example.com',
      password: 'pass123',
      username: 'testuser',
    });
    expect(user.id).toBeDefined();
  });

  it('should throw if email exists', async () => {
    await expect(
      userService.createUser({
        email: 'existing@example.com',
        password: 'pass123',
        username: 'newuser',
      })
    ).rejects.toThrow('EMAIL_EXISTS');
  });
});
```

### **Integration Tests**

```javascript
// Test full auth flow
describe('Auth Flow', () => {
  it('should signup, login, and logout', async () => {
    const newUser = await userService.createUser({...});
    const loggedIn = await userService.loginUser(newUser.email, 'pass123');
    expect(loggedIn.token).toBeDefined();
  });
});
```

---

## **Summary**

| Aspect | Before | After |
|--------|--------|-------|
| Data access | Scattered in screens | Centralized services |
| Error handling | Strings only | Typed errors |
| Testability | Hard | Easy |
| Backend migration | Would break everything | 1 file change |
| Scroll UI | Static headers | Apple-style |
| Code reuse | Low | High |

This architecture scales from local AsyncStorage → backend HTTP seamlessly.
