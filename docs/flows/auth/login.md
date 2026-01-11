Absolutely. Let's build a **comprehensive documentation / README** for your login flow that aligns with your registration flow, incorporates toast notifications consistently, and clearly describes each part of the logic, including social login. I’ll break it down **section by section** so it’s clear for developers, designers, or future maintainers.

---

# 📄 iVisit Login Flow — Documentation

## Overview

The **Login system** is designed to be consistent with the iVisit **Registration flow** while maintaining:

* **Seamless API integration**
* **Persistent authentication** (via the `database/` layer)
* **Social login support** (Apple, Google, X)
* **Animated UI for user engagement**
* **Toast notifications** for user feedback

This system ensures that both **email/phone login** and **social login** provide a smooth and secure experience.

---

## Architecture

```
AuthProvider
│
├─ useAuth()          → Custom hook to access auth context
│
├─ login(userData)    → Email/phone login logic
├─ logout()           → Clear user data
├─ syncUserData()     → Refreshes user info from API
└─ loading state      → Displays spinner while checking auth

Screens:
SignupScreen
│
├─ SignUpMethodCard  → Email/Phone login triggers modal
├─ SocialAuthRow     → Layout for social auth buttons
│   └─ SocialAuthButton → Handles animation, toast, and dispatch
└─ AuthInputModal     → Captures credentials for email/phone login
```

---

## 1. AuthProvider

**File:** `contexts/AuthContext.jsx`

**Purpose:**

* Manages user authentication state globally
* Provides methods for login, logout, and syncing user data
* Exposes `useAuth()` for consuming components

**Key Points:**

* `user` — Stores authenticated user info
* `token` — Stores authentication token
* `loading` — Controls spinner during async operations

**Example Use:**

```jsx
const { user, login, logout, loading } = useAuth();

if (loading) return <Spinner />;

console.log(user.email);
```

---

### 1.1 Login Function

**Signature:** `login(userData)`

**Steps:**

1. Store user info in state (`setUser`)
2. Store token in state and persist via the `database/` layer if available
3. Optionally show toast for **success**

```jsx
import Toast from "react-native-toast-message";

const login = async (userData) => {
  try {
    setUser(userData);
    await database.write(StorageKeys.CURRENT_USER, userData);

    if (userData.token) {
      setToken(userData.token);
      await database.write(StorageKeys.AUTH_TOKEN, userData.token);
    }

    Toast.show({
      type: "success",
      text1: "Logged in successfully",
    });

    return true;
  } catch (err) {
    console.error(err);
    Toast.show({
      type: "error",
      text1: "Login failed",
      text2: err.message,
    });
    return false;
  }
};
```

---

### 1.2 Logout Function

**Signature:** `logout()`

**Steps:**

1. Clear `user` and `token` from state
2. Remove persisted session entries via the `database/` layer
3. Optionally show toast for **logout**

```jsx
const logout = async () => {
  try {
    setUser(null);
    setToken(null);
    await database.delete(StorageKeys.CURRENT_USER);
    await database.delete(StorageKeys.AUTH_TOKEN);

    Toast.show({
      type: "info",
      text1: "Logged out successfully",
    });

    return { success: true };
  } catch (err) {
    Toast.show({
      type: "error",
      text1: "Logout failed",
      text2: err.message,
    });
    return { success: false };
  }
};
```

---

### 1.3 syncUserData()

**Purpose:** Fetch latest user info from API using stored token

```jsx
const syncUserData = async () => {
  try {
    const storedToken = await database.read(StorageKeys.AUTH_TOKEN, null);
    if (!storedToken) return;

    const { data: userData } = await authService.getCurrentUser();
    if (userData) {
      setUser(userData);
      setToken(storedToken);
      await database.write(StorageKeys.CURRENT_USER, userData);
    }
  } catch (err) {
    console.error("Error syncing user data:", err);
  } finally {
    setLoading(false);
  }
};
```

---

## 2. Social Login

**Components:**

* `SocialAuthRow` — Layout for all social login buttons
* `SocialAuthButton` — Individual provider button with animations

**Behavior:**

1. Pressing button triggers animation + haptic feedback
2. Social login dispatch (`socialSignUp`) is called
3. Toasts are shown for **success/failure**

**Example Social Auth Button Implementation:**

```jsx
const handlePress = async () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  Animated.sequence([...]).start();

  try {
    await socialSignUp(provider, mockProfile);

    Toast.show({
      type: "success",
      text1: `${provider} login successful`,
    });
  } catch (err) {
    Toast.show({
      type: "error",
      text1: `${provider} login failed`,
      text2: err.message,
    });
  }
};
```

**Notes:**

* Mock profile is only for development/testing
* Replace with real provider data in production
* Toast consistency ensures **social login matches email/phone login UX**

---

## 3. SignupScreen Integration

* Uses **animated entry** for both login methods
* Calls `AuthInputModal` for email/phone login
* Calls `SocialAuthRow` for social login
* Shows **legal & location notices**
* Uses `LinearGradient` background for visual polish

```jsx
<AuthInputModal
  visible={modalVisible}
  type={authType}
  onClose={() => setModalVisible(false)}
/>
```

---

## 4. Toast Integration

* All login types (email/phone & social) **must trigger toast**
* Types used:

  * `success` → Login/Registration success
  * `error` → Login failure or API error
  * `info` → Logout

```jsx
import Toast from "react-native-toast-message";

// At app root
<Toast position="top" />
```

---

## 5. Developer Notes / Best Practices

1. Always use `useAuth()` hook inside an `AuthProvider`
2. Persist `token` securely for auto-login
3. Sync user data on app start (`useEffect`)
4. Social login should be **mocked in dev** and replaced with provider SDKs in production
5. Use **toast messages** consistently across all authentication flows

---

## 6. Suggested Improvements / TODOs

* Replace `mockProfile` with actual provider SDK response
* Add **error parsing** for API failures to show user-friendly messages
* Ensure **token refresh** workflow for long-lived sessions
* Unit tests for:

  * `login()` success/failure
  * `logout()` success/failure
  * `syncUserData()` with missing or expired token
* Accessibility check for animations, haptics, and colors

---