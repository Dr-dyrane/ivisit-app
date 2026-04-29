# Auth Workflow Map

This map shows the runtime path for login, OTP, registration, and the deprecated profile-setup fallback route.

## Entry Points

- `app/(auth)/login.js` -> `screens/LoginScreen.jsx` -> `components/login/LoginInputModal.jsx`
- `app/(auth)/signup.js` -> `screens/SignupScreen.jsx` -> `components/register/AuthInputModal.jsx`
- Deprecated fallback only: `app/(user)/(stacks)/complete-profile.js` -> `screens/CompleteProfileScreen.jsx`

## Runtime Chain

1. UI collects credential/contact input.
2. Hook layer runs validation and orchestration:
   - `hooks/auth/useLogin.js`
   - `hooks/auth/useSignup.js`
3. Service layer executes Supabase calls:
   - `services/authService.js`
   - `services/auth/oauthService.js` (social auth path)
4. Session and user snapshot are persisted in auth context:
   - `contexts/AuthContext.jsx`
   - Storage via `database` (`AUTH_TOKEN`, `CURRENT_USER`)

## Supabase Touchpoints

### Auth API (Supabase Auth)

- `supabase.auth.signInWithPassword`
- `supabase.auth.signInWithOtp`
- `supabase.auth.verifyOtp`
- `supabase.auth.signUp`
- `supabase.auth.updateUser`
- `supabase.auth.getSession`
- `supabase.auth.signOut`

### Tables

- `public.profiles` (read/update profile parity for mobile auth state)
- `public.preferences` (auto-created on user creation)
- `public.medical_profiles` (auto-created on user creation)
- `public.patient_wallets` (auto-created on user creation)

### RPCs

- `delete_user` (called from `authService.deleteUser`)

## Trigger and Automation Dependencies

- `public.handle_new_user()` in `20260219000900_automations.sql`
  - Trigger: `on_auth_user_created` on `auth.users`
  - Creates: `profiles`, `preferences`, `medical_profiles`, `patient_wallets`
- `public.sync_doctor_record_from_profile()` keeps `doctors` aligned when profile role/provider_type change.

## Role and Permission Boundaries

- Initial role is derived in `handle_new_user` (defaults to `patient`).
- Profile writes are scoped to authenticated user context plus RLS.
- `delete_user` is RPC-mediated, not direct table deletion from client.

## State and Failure Notes

- Auth context defends against stale refresh tokens and clears local auth state on expiry.
- `app/(user)/_layout.js` now enforces authentication only. It does not force-redirect incomplete profiles into `complete-profile`.
- Emergency / commit-details auth may set `PROFILE_COMPLETION_DEFERRED`; the deferred flag now clears once the account has a working phone number on file.
- Username is auto-derived from the auth email when missing via `authService.ensureDefaultUsernameForProfile`, so username is no longer a user-blocking setup requirement.
- Registration can persist pending data locally via:
  - `authService.savePendingRegistration`
  - `authService.getPendingRegistration`
  - `authService.clearPendingRegistration`
- Login and signup hooks return structured `{ success, error }` results to avoid silent failures.

## Related Docs

- [login.md](./login.md)
- [register.md](./register.md)
- [REGISTRATION_UI_UX.md](./REGISTRATION_UI_UX.md)
- [../../../supabase/docs/REFERENCE.md](../../../supabase/docs/REFERENCE.md)
- [../../../supabase/docs/API_REFERENCE.md](../../../supabase/docs/API_REFERENCE.md)
