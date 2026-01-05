# iVisit — Registration UI/UX & Integration Guide

This document describes the registration flow UI/UX, components, contexts, helper hooks, constants, accessibility and testing guidance so a developer can quickly implement the login flow and add related sub-pages with consistent look & feel.

**Overview**
- Purpose: single, modular, animated, mobile-first registration flow that matches the Welcome → Onboarding UI (brand red, rounded cards, slide/fade motion, haptics).
- High-level steps:
  1. Method selection (email or phone)
  2. Input (phone or email)
  3. OTP verification
  4. Profile setup (name, username, avatar)
  5. Password setup (finalize account)

**Flow (logical)**
- The canonical state container is `RegistrationContext` ([contexts/RegistrationContext.jsx](contexts/RegistrationContext.jsx)). It stores `currentStep` and `registrationData` and exposes: `updateRegistrationData`, `goToStep`, `nextStep`, `previousStep`, `resetRegistration`, `getProgress`.
- Use `useRegistration()` hook to read and mutate the flow from any registration-related component.
- On final step, call the sign-up API and then `AuthContext.login()` to persist user and token.

**Primary Files / Components**
- Modal & orchestration:
  - `components/register/AuthInputModal.jsx` — bottom-sheet style modal that renders one step at a time (phone/email input, OTP, profile, password). Uses `KeyboardAvoidingView` + `ScrollView` and `useSafeAreaInsets`.
- Inputs & subcomponents:
  - `components/register/PhoneInputField.jsx` — country-aware phone input, uses `libphonenumber-js`, `usePhoneValidation` and `useCountryDetection` hooks, opens `components/register/CountryPickerModal.jsx`.
  - `components/register/EmailInputField.jsx` — single-field email input.
  - `components/register/OTPInputCard.jsx` — OTP entry and verification UI (resend/edit UX should be added or extended here).
  - `components/register/ProfileForm.jsx` — modular profile fields (split into single-purpose screens if needed); pre-fills from `registrationData.profile`.
  - `components/register/PasswordInputField.jsx` — final password setup.
- Common UI:
  - `components/ui/SlideButton.jsx` — branded CTA with sliding overlay animation.

**Colors & Theme**
- Centralized color constants file: `constants/colors.js` with `COLORS.brandPrimary`, `brandSecondary`, `bgDark`, `textMuted`, `success`, `error`, etc.
- Use `useTheme()` (`contexts/ThemeContext.jsx`) to detect `isDarkMode` and adapt backgrounds/text.
- All components should import `COLORS` rather than hard-coded colors. (Several were refactored: `SlideButton`, `PhoneInputField`, `ToastContext`.)

**State & Data Shape**
- `registrationData` keys (in `RegistrationContext`) — recommended shape:
  - method: "phone" | "email"
  - countryCode
  - phoneNumber (E.164)
  - email
  - otp
  - profile: { firstName, lastName, username, avatar }
  - password
  - profileComplete: boolean
- Persist only transient registration data in the context. Final user object and token are stored by `AuthContext`/AsyncStorage.

**Hooks & Helper Utilities (important)**
- `useRegistration()` — context hook.
- `useAuth()` — `AuthContext` with `login(user)`, `logout()`, `syncUserData()`.
- `usePhoneValidation(country)` — formatting and E.164 output (libphonenumber-js).
- `useCountryDetection()` — best-effort region detection using `expo-location` or fallback to default country config.
- UX helpers to standardize across components:
  - showShakeAnimation(ref) — small horizontal shake for invalid inputs
  - hapticImpact(type) — wrapper around `expo-haptics` to centralize feedback
  - formatE164(raw, country) — wrapper around `libphonenumber-js`
  - throttleResend(key, cooldownMs) — resend throttling helper

**Animations & Micro-interactions**
- Use spring/timing patterns consistent with Onboarding:
  - Entry: slide + fade (modal uses Animated.spring for translateY and Animated.timing for opacity)
  - Input focus: small scale (1.02)
  - Button: overlay slide on CTA (`SlideButton`) with 450ms overlay animation
  - OTP errors: shake animation (8–10px horizontal)
- Haptics: `expo-haptics` on primary interactions (CTA press, error) — use helper above.

**Keyboard Handling & Safe Areas**
- Use `react-native-safe-area-context`'s `useSafeAreaInsets()` inside the modal to compute `keyboardVerticalOffset` and add `paddingBottom` to the `ScrollView` so active fields remain visible.
- Structure: `KeyboardAvoidingView` -> `ScrollView` (contentContainerStyle: {flexGrow:1, paddingBottom: insets.bottom + X}) -> content.
- Per-step offsets: OTP/profile screens often need larger offsets. If overlap persists on devices, tweak `keyboardVerticalOffset` per `currentStep` (AuthInputModal can compute per-step offset).

**OTP UX Recommendations**
- Provide explicit actions: `Edit number` (navigates back to input step) and `Resend OTP` (shows cooldown, countdown timer, and disabled state). Implement `throttleResend` to prevent abuse.
- Clarify contact: show masked representation (e.g., +234 ••• •1234) and method (`SMS` vs `Email`).
- Auto-focus OTP input when entering step; expose `onVerified` callback to `AuthInputModal` to advance the flow.

**Accessibility & Contrast**
- Ensure CTA text contrast meets WCAG for both light/dark. Use white text on brandPrimary (dark red) or dark text on pale backgrounds.
- Use large, bold labels for CTAs and 44px+ tap targets for interactive items.

**How to Add a Login Flow & Subpages (quick recipe)**
1. Create `screens/LoginScreen.jsx` following the same single-field-per-screen pattern (email/phone → password / OTP as needed).
2. Reuse components: `EmailInputField`, `PhoneInputField`, `OTPInputCard` and `SlideButton` for CTAs.
3. Reuse `AuthContext.login()` on success to persist token and user.
4. Use `AuthProvider` in `app/_layout.js` so screens can call `useAuth()`.
5. Add route under `app/(auth)/login.js` and link from WelcomeScreen or modal close handlers.

**Testing Checklist**
- Visual: confirm brand color used in Welcome → Onboarding → Registration (slide/overlay). Test dark & light modes.
- Keyboard: test on iOS and Android devices for phone input, OTP, and profile screens. Tweak `keyboardVerticalOffset` if needed.
- OTP: verify resend cooldown and edit number flows.
- Persistence: sign-up should call `api/auth` wrapper and then `AuthContext.login()` which writes `token` and `user` keys to AsyncStorage.

**Files to review / adapt when extending**
- [contexts/RegistrationContext.jsx](contexts/RegistrationContext.jsx)
- [components/register/AuthInputModal.jsx](components/register/AuthInputModal.jsx)
- [components/register/PhoneInputField.jsx](components/register/PhoneInputField.jsx)
- [components/register/EmailInputField.jsx](components/register/EmailInputField.jsx)
- [components/register/OTPInputCard.jsx](components/register/OTPInputCard.jsx)
- [components/register/ProfileForm.jsx](components/register/ProfileForm.jsx)
- [components/register/PasswordInputField.jsx](components/register/PasswordInputField.jsx)
- [components/ui/SlideButton.jsx](components/ui/SlideButton.jsx)
- [contexts/ToastContext.jsx](contexts/ToastContext.jsx)
- [constants/colors.js](constants/colors.js)
- [contexts/AuthContext.jsx](contexts/AuthContext.jsx)

**Developer Notes / Best Practices**
- Keep each registration card single-purpose and stateless where possible: read initial value and emit changes via callbacks; persist state to `RegistrationContext` in parent handlers.
- Centralize colors, timings, haptics and validation logic in `constants/` and `hooks/` for re-use.
- Keep API shapes consistent: APIs should return `{ data: ... }` so hooks and components can assume the same response shape.

---

If you want, I can also:
- Add a small `REGISTRATION_CHECKLIST.md` with end-to-end manual test instructions and expected outcomes.
- Auto-audit the repository for remaining hard-coded colors and generate a patch list.

Which follow-up would you like me to do next?