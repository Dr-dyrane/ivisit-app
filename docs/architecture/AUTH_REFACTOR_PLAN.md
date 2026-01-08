# 📄 iVisit Authentication & API Layer Refactoring Plan

> **Status:** 🟡 In Progress  
> **Created:** 2026-01-08  
> **Last Updated:** 2026-01-08

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Problems](#current-problems)
3. [Target Architecture](#target-architecture)
4. [File Structure](#file-structure)
5. [Data Flow](#data-flow)
6. [Migration Steps](#migration-steps)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)
8. [Login Flow](#login-flow)
9. [Register Flow](#register-flow)

---

## Overview

### Goal
Refactor the authentication layer to follow a clean, layered architecture that:
- Separates concerns properly (UI → Context → Hook → Service → Database)
- Makes it easy to swap AsyncStorage for Supabase later
- Handles all edge cases gracefully
- Provides consistent error handling

### Principles

1. **All API calls go through the same layered structure:**
   ```
   UI → Context → Hook → API → Service → Database
   ```

2. **Layer Responsibilities:**
   - **UI:** Only handles presentation, input, animation, and validation
   - **Context:** Stores state, triggers service calls, manages steps
   - **Hook:** Convenience hooks to simplify service calls
   - **API Layer:** Fetch wrapper, endpoint paths, headers, auth token
   - **Service Layer:** Business logic, calls APIs, handles response formatting
   - **Database:** Abstracted behind services → can swap for Supabase later

3. **Login and Register have separate contexts** but share API & service layer

4. **Error handling:** Each step tracks `error` state with structured errors `{ code, message, metadata }`

---

## Current Problems

| Issue | Location | Problem |
|-------|----------|---------|
| Mixed Storage Keys | `userStore.js` uses `"users"`, `"token"` (no prefix) while `database.js` uses `@ivisit_` prefix | Data fragmentation |
| Store bypasses Database | `userStore.js` directly calls `AsyncStorage` instead of using `database.js` | Defeats abstraction |
| API layer too thin | `api/auth.js` just passes through to `userStore` | Should use services |
| No Service layer | Missing `services/authService.js` | Business logic scattered |
| Contexts lack error state | `LoginContext` and `RegistrationContext` don't track `error`, `loading` | UI can't show errors |
| Token management inconsistent | Token in both context AND AsyncStorage with different logic | Race conditions |

---

## Target Architecture

### File Structure

```
src/
├── api/
│   └── client.js            # Fetch wrapper (later Supabase client)
│
├── database/
│   ├── db.js                # AsyncStorage abstraction
│   └── keys.js              # Storage key constants
│
├── services/
│   ├── authService.js       # Auth business logic (login, signup, checkExists)
│   └── imageService.js      # Image storage logic
│
├── contexts/
│   ├── AuthContext.jsx      # Global auth state (user, token, isAuthenticated)
│   ├── LoginContext.jsx     # Login flow state (steps, form data, errors)
│   └── RegistrationContext.jsx # Register flow state
│
├── hooks/
│   └── mutations/
│       ├── useLogin.js      # Calls authService, updates AuthContext
│       └── useSignup.js     # Calls authService, updates AuthContext
│
├── store/                   # ⚠️ TO BE DELETED after migration
│   ├── userStore.js         # → migrated to authService.js
│   └── imageStore.js        # → migrated to imageService.js
│
├── components/
├── screens/
└── constants/
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI LAYER                                │
│  LoginScreen → LoginInputModal → ProfileCard                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CONTEXT LAYER                             │
│  LoginContext ←→ AuthContext ←→ RegistrationContext            │
│  (flow state)    (global auth)   (flow state)                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        HOOK LAYER                               │
│  useLogin.js / useSignup.js / useUpdateUser.js                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                             │
│  authService.js / imageService.js                               │
│  (business logic, validation, formatting)                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│  database/db.js (AsyncStorage abstraction)                      │
│  → Later: Supabase client swap                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Steps

### Phase 1: Database Layer ✅
- [x] `api/database.js` already exists with good abstraction
- [ ] Move to `database/db.js`
- [ ] Extract keys to `database/keys.js`

### Phase 2: Service Layer
- [ ] Create `services/authService.js` using `database/db.js`
- [ ] Create `services/imageService.js` using `database/db.js`
- [ ] Ensure all methods match current `userStore.js` functionality

### Phase 3: API Layer
- [ ] Update `api/auth.js` to call `authService` instead of `userStore`
- [ ] Create `api/client.js` for future Supabase integration

### Phase 4: Context Layer
- [ ] Add `error`, `isLoading` states to `LoginContext`
- [ ] Add `error`, `isLoading` states to `RegistrationContext`
- [ ] Ensure `AuthContext` syncs properly with services

### Phase 5: Hook Layer
- [ ] Update `useLogin.js` to use new service layer
- [ ] Update `useSignup.js` to use new service layer
- [ ] Update other mutation hooks

### Phase 6: Cleanup
- [ ] Verify all screens/components work correctly
- [ ] Remove `store/userStore.js`
- [ ] Remove `store/imageStore.js`
- [ ] Delete `store/` folder

---

## Edge Cases & Error Handling

### Structured Error Format
```javascript
{
  code: 'USER_NOT_FOUND',      // Machine-readable code
  message: 'No account found', // Human-readable message
  metadata: { email: '...' }   // Optional context
}
```

### Error Codes
| Code | Description |
|------|-------------|
| `USER_NOT_FOUND` | No account exists with given credentials |
| `INVALID_PASSWORD` | Password doesn't match |
| `NO_PASSWORD` | Account exists but has no password set |
| `EMAIL_EXISTS` | Email already registered |
| `PHONE_EXISTS` | Phone already registered |
| `INVALID_INPUT` | Missing required fields |
| `NETWORK_ERROR` | Connection failed |
| `TIMEOUT` | Request timed out |

---

## Login Flow

| Step | Component | Context | Service Action | Edge Cases |
|------|-----------|---------|----------------|------------|
| 1 | `LoginAuthMethodCard` | `authMethod` | None | Choose OTP or Password |
| 2 | `LoginContactCard` | `contactType` | `checkAccountExists()` | Check before proceeding |
| 3a | OTP + account exists | `otpEntered` | `loginWithOTP()` | Accept any 6-digit (temp) |
| 3b | OTP + no account | - | Show signup prompt | Redirect or go back |
| 4a | Password + has password | `password` | `loginWithPassword()` | Standard login |
| 4b | Password + no password | - | Suggest OTP or set password | `SET_PASSWORD` flow |
| 4c | Password + no account | - | Show signup prompt | Link to signup |

---

## Register Flow

| Step | Component | Context | Service Action | Edge Cases |
|------|-----------|---------|----------------|------------|
| 1 | `RegisterInputModal` | `contactType` | `checkAccountExists()` | If exists → login flow |
| 2a | Account exists | `contactValue` | `loginWithOTP()` | Skip signup, login |
| 2b | Account doesn't exist | `contactValue` | None | Proceed to form |
| 3 | Registration form | `userDetails` | `registerUser()` | Create user |
| 4 | Post-registration | `session` | `fetchUserProfile()` | Fully logged in |

---

## References

- **Deprecated Code:** See `docs/deprecated/` for original implementations
- **UI/UX Guide:** See `docs/ui_ux_bible.md`
- **Login Docs:** See `docs/login.md`
- **Register Docs:** See `docs/register.md`

