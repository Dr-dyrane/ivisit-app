# Google Signup Flow & Identity Mapping Fix Task

## 🎯 **Objective**
Resolve the issue where new users signing up with Google OAuth experience a redirect loop or "bounce" effect. Fix the underlying database constraint violation in the `id_mappings` table and stabilize the frontend authentication context.

## 📋 **Task Steps**

### **Step 1: Database Trigger Fix**
- Update `public.stamp_entity_display_id()` trigger function.
- **Problem**: Trigger was using `TG_TABLE_NAME` ('profiles') for the `entity_type` field in the `id_mappings` table.
- **Constraint**: `id_mappings.entity_type` have a strict CHECK constraint that does NOT include 'profiles'.
- **Fix**: Map 'profiles' to the specific user role (`patient`, `admin`, `provider`, etc.) before inserting into `id_mappings`.
- **Validation**: Verify that new rows in `id_mappings` for users have `entity_type` matching their role.

### **Step 2: Frontend Auth Stabilization**
- Refactor `AuthContext.jsx` initialization logic.
- **Problem**: Race condition between Google profile creation (DB trigger) and frontend profile fetch.
- **Fix**: 
    - Implement proactive profile creation via `upsert` in the frontend if the trigger is slow.
    - Set `Initializing` to `false` only AFTER profile confirms or creation attempt finishes.
    - Add a robust 8-second initialization timeout for bad networks.
- **Validation**: Ensure `No initial session` logs do not cause a redirect loop during OAuth return.

### **Step 3: Codebase Hygiene**
- Remove redundant authentication components.
- **Action**: Delete `components/common/AuthWrapper.jsx` to ensure `contexts/AuthContext.jsx` is the single source of truth.
- **Validation**: App should build and run without imports pointing to the deleted file.

### **Step 4: Workspace Synchronization**
- Sync migrations and types across repositories.
- **Action**: Run `node supabase/scripts/sync_to_console.js`.
- **Validation**: `ivisit-console/frontend/supabase/migrations/20260219000100_identity.sql` matches the source of truth.

### **Step 5: Universal Skip Strategy**
- Implement "Skip for now" logic for all authentication methods.
- **Threshold**: Skip is allowed once an Identity exists (Profile has been created).
- **Logic**:
    - Users on Step 3 (Organization Details) or higher can defer setup.
    - Profile `onboarding_status` is updated to `'skipped'`.
    - Dashboard detects `'skipped'` status and displays the `IncompleteOnboardingCard`.
- **Validation**: Verify that both Google and Email/Password users can land in the dashboard with a pending organization setup.

## 🔧 **Expected Results**
- New Google signups complete without a page refresh loop.
- The `profiles` and `id_mappings` tables are correctly populated for every new user.
- The `AuthContext` provides a consistent "Loading" state until identity is fully resolved.
- Users can "Skip" organization setup once their account is created.
- Dashboard displays a beautiful reminder for incomplete profiles.

## ✅ **Success Criteria**
- New user can sign up and land on the Dashboard successfully.
- "Skip for now" button appears on Step 3 of the wizard.
- `id_mappings` contains a record for the new user with `entity_type` ∈ `['patient', 'admin', 'provider', ...]`.
- Dashboard shows `IncompleteOnboardingCard` only for users with `onboarding_status = 'skipped'`.
- `npx supabase db push` reports "Remote database is up to date" or applies the fix successfully.

## 🚨 **Critical Fixes Implemented**
1. **Trigger Fix**: Logic added to `stamp_entity_display_id` to handle role-aware entity mapping.
2. **Race Condition Lock**: `AuthContext` now waits for profile resolution before unlocking the UI.
3. **Upsert Pattern**: Frontend uses `upsert` instead of `insert` for profiles to handle DB-trigger/Frontend simultaneous writes.

---
*Created: February 20, 2026*
