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

### 4. Current Flow Focus (Verification)
We are currently in the **Verification Phase** of the recently completed features:
1.  **Notification Actions**: Verify Login, Signup, Visit updates, and Emergency alerts trigger correct notifications.
2.  **Real-time Sync**: Verify updates appear instantly across devices.
3.  **Haptics & Sound**: Verify physical feedback patterns (requires device).

### 5. Next Steps (Immediate Launch)
To prepare for the next release:
1.  **Manual Verification**: Complete the [Testing Checklist](../.zenflow/tasks/new-task-7623/plan.md#testing-results) for Notifications.
2.  **Provider Discovery (Next Feature)**:
    *   Model "Providers" and "Clinics" separately.
    *   Improve Discovery UX (Specialty-first).
    *   Make booking realistic (Slots, Confirmation).
3.  **Polishing**: Ensure "More" screens (Medical Profile, Contacts) are fully polished and consistent.
