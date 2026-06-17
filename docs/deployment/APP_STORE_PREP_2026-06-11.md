---
status: living
owner: platform
last_updated: 2026-06-17
---

# App Store Preparation

This runbook prepares `ivisit-app` for the first Apple App Store/TestFlight path while preserving the Android/Google Play release lane.

## Current Repo State

Verified on `main` at release-prep time:

- App name: `iVisit`
- App Store Connect display name: `iVisit.` because `iVisit` was unavailable/taken in App Store Connect. Google Play also uses `iVisit.`.
- App Store Connect Apple ID: `6779888632`
- Expo slug: `ivisit`
- Scheme: `ivisit`
- Version: `1.0.6`
- Runtime version policy: `appVersion`
- EAS project ID: `a3777b70-b973-4b3b-ba59-ed32bf5662e0`
- iOS bundle identifier: `com.dyrane.ivisit`
- iOS tablet support: enabled
- Export compliance flag: `ITSAppUsesNonExemptEncryption: false`
- Stripe merchant identifier in app config: not enabled for this release. Apple Pay must stay disabled until a visible Apple Pay surface is implemented and review notes identify where to test it.

Current iOS permission strings in `app.config.js`:

- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSLocationWhenInUseUsageDescription`
- `NSContactsUsageDescription`

Current native/plugin surfaces that matter for App Review:

- Location: hospital discovery, emergency dispatch position, tracking/recovery flows.
- Camera/photo library: profile/insurance image capture and upload.
- Contacts: emergency contact import.
- Social login: Apple, Google, and X buttons are present in the shared auth row. iOS uses native Sign in with Apple through `expo-apple-authentication`; web and non-iOS fall back to Supabase OAuth.
- Stripe: card/payment support. Apple Pay is not exposed in this release.
- Expo Updates: production OTA channel uses runtime version `1.0.6`.

## Apple Account Setup

Complete these in Apple Developer and App Store Connect before the first iOS build/submit:

1. Enroll or activate the Apple Developer Program membership. Status: account available as of 2026-06-12; App Store Connect setup is next.
2. Confirm the legal entity, seller name, tax, banking, and agreements are ready for paid or payment-linked flows.
3. Create or reserve the App Store Connect app:
   - Platform: iOS
   - Name: `iVisit.` if `iVisit` remains unavailable.
   - Primary language: English (U.S.) unless changed deliberately.
   - Bundle ID: `com.dyrane.ivisit`
   - SKU: `ivisit-ios-001` or another stable internal SKU.
   - User access: add the Expo/EAS submitter account if different from the Apple account owner.
4. Create App Store Connect API credentials for EAS Submit, or be ready to use interactive Apple login:
   - API Key ID
   - Issuer ID
   - private key file path
5. Create/verify Apple Pay merchant ID only if Apple Pay will be exposed in the iOS build:
   - Merchant ID: `merchant.com.ivisit`
   - Connect it to the Stripe Apple Pay setup.
   - Do not show Apple Pay UI until the merchant ID is active and Stripe confirms it.
   - Do not add `merchantIdentifier` back to `app.config.js` until Apple Pay is visible and reviewable.
6. Configure Sign in with Apple before iOS review if any third-party/social login remains visible:
   - Apple Developer App ID `com.dyrane.ivisit` has Sign in with Apple enabled as the primary App ID.
   - Supabase Apple auth provider enabled.
   - Supabase Apple client IDs include both Apple auth lanes: `com.dyrane.ivisit.web,com.dyrane.ivisit`.
   - `com.dyrane.ivisit` is the native iOS bundle ID used by TestFlight/App Review.
   - `com.dyrane.ivisit.web` is the Apple Services ID used by browser OAuth, Expo web, Android/browser fallback, and Supabase redirect testing.
   - The Services ID should be named `iVisit Supabase Auth`, linked to primary App ID `T585U2AQ58.com.dyrane.ivisit`, and configured with domain `dlwtcmhdzoklveihuhjf.supabase.co`.
   - The Services ID return URL must be `https://dlwtcmhdzoklveihuhjf.supabase.co/auth/v1/callback`.
   - Store the Apple client secret in Supabase and regenerate it before Apple's six-month expiration.
   - Supabase redirect allow-list still includes app/web redirects used by `useSocialAuth` and `oauthService`.

## App Store Connect Metadata

Prepare these before upload or before submitting the first build for review:

- App category: Medical, Health & Fitness, or Navigation must be chosen deliberately. If in doubt, prefer the category that matches the submitted store copy and App Review explanation.
- Product page name should remain `iVisit.` unless the plain `iVisit` name becomes available.
- Subtitle: short, non-alarmist outcome copy.
- Promotional text: explain production launch without making emergency-response guarantees the system cannot legally support everywhere.
- Description: include emergency help, hospital discovery, location, payment, and follow-up care as product capabilities with bounded wording.
- Keywords: avoid competitor names, unverifiable medical claims, and emergency-service guarantees.
- Support URL: `https://www.ivisit.ng` support route or a stable support page.
- Marketing URL: `https://www.ivisit.ng`
- Privacy Policy URL: public privacy route on `ivisit` marketing site.
- Screenshots: iPhone first; iPad only if tablet support remains enabled.
- Sign-in required: `No` for the main review path because `/map` exploration is guest-friendly. Provide optional demo credentials in review notes only for deeper commit/payment flow inspection.
- Review notes: explain the guest-first map path, then include optional demo/reviewer credentials for commitment flows.

Suggested review note baseline:

```text
iVisit helps users find nearby healthcare providers, request ambulance-style assistance, and coordinate care flows from a map-first experience.

Sign-in is not required to review the primary experience. From launch, reviewers can enter the map, explore nearby care, inspect the hospital/provider discovery surfaces, and start the guided request flow as a guest.

Optional deeper review access for commitment/payment handoff:
Email: support@ivisit.ng
Code: 123456

Emergency/provider flows in review environments may use demo or staging data and should not be treated as a live emergency-service guarantee.
```

## Privacy Nutrition Label Draft

Apple requires privacy practice disclosures in App Store Connect. This is not legal advice; confirm against the live data map before submission.

Likely collected data categories:

- Contact Info: name, email, phone number.
- Location: precise/current location for nearby care and emergency dispatch positioning.
- Health or fitness adjacent information: emergency request details, care intent, symptoms/triage context if submitted by the user.
- Financial Info: payment method/payment status through Stripe; avoid claiming raw card storage in iVisit if Stripe owns card handling.
- User Content: profile images, insurance images/documents if captured.
- Identifiers: user ID, device/session identifiers from Supabase/Expo/analytics if present.
- Usage Data and Diagnostics: app interactions, logs, crashes, performance diagnostics if enabled.

Likely linked to user:

- Account/profile data.
- Emergency requests, visit/payment records, saved locations, and emergency contacts.

Tracking posture:

- Do not enable App Tracking Transparency or declare cross-app tracking unless the app or third-party SDKs track users across apps/sites for advertising or data broker purposes.
- If any analytics/ads SDK is added later, re-audit this section before submission.

## Export Compliance

`app.config.js` currently sets:

```js
ITSAppUsesNonExemptEncryption: false
```

That is usually consistent with apps that use standard OS/platform HTTPS/TLS rather than custom non-exempt encryption, but App Store Connect still asks export compliance questions. Answer from the actual implementation and any third-party SDK behavior at submission time.

## Build Commands

First local config check:

```bash
npx expo config --type public
```

First iOS staging build for TestFlight/App Review:

```bash
npx eas build --platform ios --profile staging
```

First iOS submit after App Store Connect is ready:

```bash
npx eas submit --platform ios --profile staging
```

Use `staging` for the first iOS/TestFlight review build because the reviewer OTP path depends on the staging client flags:

```text
EXPO_PUBLIC_REVIEW_DEMO_AUTH_ENABLED=true
EXPO_PUBLIC_REVIEW_DEMO_AUTH_EMAIL=support@ivisit.ng
```

Those flags allow `support@ivisit.ng` plus code `123456` to call the deployed `review-demo-auth` Edge Function, which exchanges the static review code for a real short-lived Supabase OTP.

If using API-key submit automation, add the EAS submit fields only after the Apple key exists. Do not commit private `.p8` keys.

Example shape:

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "APP_STORE_CONNECT_APP_ID",
        "ascApiKeyPath": "./private/AuthKey_XXXXXXXXXX.p8",
        "ascApiKeyIssuerId": "ISSUER_ID",
        "ascApiKeyId": "KEY_ID"
      }
    }
  }
}
```

## Pre-Build Checks

Run these before the first iOS production build:

```bash
git status --short
npm run build:web
npm run hardening:emergency-requests-surface-field-guard
npm run hardening:contract-drift-guard
npm run hardening:governance-guards
powershell -ExecutionPolicy Bypass -File scripts/fix-mojibake.ps1 -CheckOnly
```

Known non-code checks to resolve or explicitly waive:

- `npm run hardening:cleanup-dry-run-guard`
- `npm run hardening:runtime-data-integrity`
- `npm audit --omit=dev --audit-level=critical`

## App Review Risk Notes

- Apple login is a hard review gate if Google, X, or any equivalent third-party login is offered for the primary account. Do not submit iOS with visible Google/X login and broken or unconfigured Apple login.
- App Store Connect sign-in required should be `No` unless the public `/map` guest path is removed. Optional demo credentials belong in Review Notes, not the required sign-in fields.
- Emergency wording must be bounded. Do not imply guaranteed ambulance dispatch, guaranteed bed availability, or replacement of local emergency numbers unless backend/provider coverage proves it for the selected country.
- Location permission copy should match the actual user-facing need: nearby hospitals and exact emergency-position handoff.
- If contacts import is optional, the UI must make that clear before the permission prompt.
- If camera/photo is for insurance/profile documents, permission copy should stay specific and not mention unrelated scanning flows unless still present.
- If Apple Pay is not ready, hide Apple Pay affordances and leave card/cash/wallet paths intact.
- If tablet support stays enabled, screenshots and layout QA should include iPad/tablet posture.

## Open Items

- Create the App Store Connect app record for `com.dyrane.ivisit`. Status: created as `iVisit.` with Apple ID `6779888632`.
- Configure and verify Sign in with Apple in Apple Developer and Supabase Auth.
- Confirm App Store Connect team access from the Expo/EAS submitter account.
- Confirm whether first iOS release target is TestFlight-only or direct App Store review. Default path should be TestFlight first.
- Confirm app category and age rating.
- Confirm public privacy policy URL on the `ivisit` marketing site.
- Confirm support URL and review contact.
- Confirm Apple Pay merchant activation with Stripe before exposing Apple Pay.
- Produce iPhone screenshots from a review-safe build.
- Decide whether to keep version `1.0.6` for iOS parity or bump to `1.0.7` for a clean first App Store runtime.

## Immediate Next Sequence

Use this sequence now that the Apple Developer account exists:

1. In App Store Connect, create the iOS app record:
   - Name: `iVisit.`
   - Bundle ID: `com.dyrane.ivisit`
   - SKU: `ivisit-ios-001`
   - Primary language: English (U.S.)
2. In Apple Developer, confirm the bundle identifier exists or let EAS create it during credential setup.
3. In the repo, run:

```bash
npx eas build --platform ios --profile staging
```

4. Let EAS manage credentials unless there is a reason to import existing certificates/profiles.
5. When the build finishes, submit it to TestFlight:

```bash
npx eas submit --platform ios --profile staging
```

6. Complete App Store Connect metadata, privacy nutrition labels, age rating, screenshots, and review notes before requesting external TestFlight review or App Store review.

## Sign In With Apple Gate

The app currently renders social auth through:

- `components/auth/SocialAuthRow.jsx`
- `components/auth/SocialAuthButton.jsx`
- `hooks/auth/useSocialAuth.js`
- `services/auth/oauthService.js`

Apple is already listed in the UI provider row. iOS now takes the native Apple path first:

- `app.config.js` sets `ios.usesAppleSignIn: true`.
- `app.config.js` includes the `expo-apple-authentication` config plugin.
- `hooks/auth/useSocialAuth.js` sends iOS Apple taps to `authService.signInWithNativeApple()`.
- `services/auth/oauthService.js` exchanges the native Apple identity token with Supabase via `supabase.auth.signInWithIdToken({ provider: "apple" })`.
- Apple full name/email metadata is captured only when Apple provides it, usually first authorization.

Review readiness still depends on end-to-end provider configuration, not button presence. Before TestFlight external review or App Store review:

1. Enable Sign in with Apple for the native App ID `com.dyrane.ivisit`.
2. Confirm App Store Connect uses the same bundle ID.
3. Enable the Apple provider in Supabase Auth.
4. Add both IDs to Supabase Apple client IDs in this order: `com.dyrane.ivisit.web,com.dyrane.ivisit`.
5. Keep the Apple Services ID `com.dyrane.ivisit.web` configured with domain `dlwtcmhdzoklveihuhjf.supabase.co` and return URL `https://dlwtcmhdzoklveihuhjf.supabase.co/auth/v1/callback`.
6. Runtime-test iOS login on a real TestFlight or development build:
   - Apple login from normal login screen.
   - Apple login from signup screen.
   - Apple login from guest/emergency auth handoff surfaces where Google login appears.
   - Cancel/dismiss path does not show a scary error.
   - Successful login reaches the same profile/session state as Google/email login.
7. Optional web/OAuth fallback test:
   - Trigger Apple login from browser/Expo web.
   - Confirm the Apple authorize URL uses `client_id=com.dyrane.ivisit.web`.
   - `client_id=com.dyrane.ivisit` in a browser URL is wrong and will produce `invalid_request: Invalid client id or web redirect url`.

If Apple provider setup is blocked, hide all third-party social login buttons on iOS until Apple login is working. Email/phone login may remain available.
