# Application Context & Architecture State

## Current Session State (Date: 2026-01-09)

### 1. Architecture Refactoring (Completed)
We have successfully transitioned to a strict **3-Layer Architecture**:
1.  **UI Components**: Pure presentation, consume **Custom Hooks**. No direct service or API calls.
2.  **Custom Hooks**: Handle state, side effects, and call **Services**.
    *   *Query Hooks*: Fetch data (e.g., `useMedicalProfile`, `useEmergencyContacts`).
    *   *Mutation Hooks*: Modify data (e.g., `useUpdateProfile`, `useEmergencyRequests`, `useLogin`).
3.  **Service Layer**: Stateless logic, communicates with **Supabase** and **Local Storage**.

**Status**:
*   ⚠️ **`api/` Folder**: Present but currently empty/unused (migration artifact).
*   ✅ **`hooks/` Folder**: REORGANIZED into domain modules (`auth`, `user`, `emergency`).
*   ✅ **Direct Service Calls in UI**: ELIMINATED (Refactored all violations in Auth, Profile, and Emergency screens).

### 2. New Hooks Inventory (Modularized)
Hooks are now organized by domain in `hooks/`:

#### 🔐 `hooks/auth/` (Authentication & Session)
*   `useLogin` (Password & OTP)
*   `useSocialAuth` (OAuth wrapper)
*   `useSignup` (Registration flow)
*   `useChangePassword` / `useCreatePassword` / `useResetPassword` / `useForgotPassword`
*   `useProfileCompletion` (Draft saving)

#### 👤 `hooks/user/` (User Data)
*   `useUpdateProfile` (Profile updates)
*   `useImageUpload` (Image handling)
*   `useMedicalProfile` (Fetch/Update medical data)

#### 🚑 `hooks/emergency/` (Emergency Services)
*   `useEmergencyContacts` (CRUD for contacts)
*   `useEmergencyRequests` (Create/Cancel requests)
*   `useEmergencySheetController` (UI logic for bottom sheet)

### 3. Service Layer Status (Hybrid Strategy)
The app uses a hybrid offline-first strategy:
-   **Auth Service**: Syncs session to `AsyncStorage`.
-   **Image Service**: Uploads to Supabase Storage, returns public URLs.
-   **Emergency Service**: Manages critical request lifecycle.
-   **Registration Context**: Now correctly uses `authService` for pending registration checks.

### 4. Current Flow Focus (Verification)
We are currently verifying the end-to-end user journey:
1.  **WelcomeScreen**: Entry point.
2.  **Onboarding**: Feature introduction.
3.  **SignupScreen**: Method Selection -> OTP -> Profile -> Password.
4.  **Home (Tabs)**:
    *   **Emergency Tab**: Map, Bottom Sheet, Request Modal (now using real hooks).
    *   **Profile Tab**: Medical Profile, Emergency Contacts (now using real hooks).

### 5. Next Steps
-   **Manual Verification**: Confirm the Welcome -> Signup flow and Emergency Request flow run smoothly on the device.
-   **Bug Fixing**: Address any UI glitches or logical errors found during verification.
