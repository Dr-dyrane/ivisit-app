# Application Context & Architecture State

## Current Session State (Date: 2026-01-13)

### 1. Architecture & Backend State (Supabase Integrated)
We have successfully transitioned from a local-first architecture to a **Supabase-backed Hybrid Architecture**:
*   ✅ **Auth Layer**: Fully integrated with Supabase Auth (Login, Signup, Password Reset, OTP). `checkUserExists` mock has been removed.
*   ✅ **Profile Layer**: Connected to `public.profiles` and `public.medical_profiles` tables.
*   ✅ **Emergency Layer**: Real-time `emergency_requests` table with Supabase Subscriptions for live updates.
*   ✅ **Visits Layer**: Visits are synced with `public.visits` table.
*   ✅ **Notifications**: Universal notification system with Real-time updates, Haptics, and Sound (Task 7623).

### 2. Recent Implementation (Notifications & Real-time)
A major update has been applied to the Notification system:
*   **Universal Dispatcher**: `notificationDispatcher.js` now handles Auth, Visits, and Emergency events.
*   **Real-time**: `useNotificationsData` and `useVisitsData` use Supabase Realtime for optimistic updates (INSERT/UPDATE/DELETE).
*   **Haptics & Sound**: Integrated `hapticService` and `soundService` for feedback based on priority.
*   **Settings**: Added "Notification Sounds" toggle in Settings.

### 3. Service Layer Status
The service layer now prioritizes Supabase but maintains some local caching strategies:
*   **Auth Service**: Syncs session to `AsyncStorage` for offline persistence.
*   **Medical Profile**: Fetches from Supabase, falls back to local cache.
*   **Emergency Service**: Uses Supabase for critical request lifecycle, with local fallback.
*   **Visits Service**: Syncs with Supabase `visits` table.

### 4. Current Flow Focus (Production Readiness)
We have completed the **Production Readiness Audit** (2026-01-13) and cleared the app for App Store submission:
1.  **App Store Compliance**:
    *   Added strictly enforced "Usage Descriptions" (Privacy strings) for Location and Contacts in `app.json`.
    *   Hidden "Coming Soon" features (Apple Login) to prevent binary rejection.
    *   Removed debug UI artifacts (Mock OTPs, Seed buttons) from production views.
    *   Verified "Delete Account" flow exists and functions.
2.  **Identity & Configuration**:
    *   Standardized App Name: "iVisit".
    *   Verified Bundle ID: `com.dyrane.ivisit`.
    *   Cleaned up `app.json` configuration (removed hardcoded API placeholders).
3.  **Visual Polish**:
    *   Implemented "Identity Artifacts" (Premium Membership Pill) in Profile.
    *   Refined Avatar badges across headers and map sheets.
    *   Enforced "Calm Over Contrast" manifesto by reducing badge noise.

### 5. Next Steps (Immediate Launch)
To prepare for the next release:
1.  **Submission**: Build and submit via `eas submit` or manual upload.
2.  **Provider Discovery (Next Feature)**:
    *   Model "Providers" and "Clinics" separately.
    *   Improve Discovery UX (Specialty-first).
    *   Make booking realistic (Slots, Confirmation).
3.  **Polishing**: Ensure "More" screens (Medical Profile, Contacts) are fully polished and consistent.
