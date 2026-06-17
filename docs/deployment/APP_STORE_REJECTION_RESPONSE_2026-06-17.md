---
status: active
owner: platform
last_updated: 2026-06-17
---

# App Store Rejection Response

This guide tracks the June 17, 2026 App Review rejection for the first iOS submission and the local recovery plan before resubmission. Do not resubmit from App Store Connect until every gate in this file is either fixed or explicitly answered in Review Notes.

## Review Record

- App Store app: `iVisit.`
- App Store Connect Apple ID: `6779888632`
- Bundle ID: `com.dyrane.ivisit`
- Submission ID: `1b3155e9-e81c-4a4b-b731-5c35900eee19`
- Review date: June 17, 2026
- Reviewed version/build: `1.0 (5)` / app runtime `1.0.6`
- Review device: iPad Air 11-inch (M3), iPadOS 26.5
- Reviewer screenshot: `C:\Users\Dyrane\Downloads\Screenshot-0617-094535.png`

## Issues From Apple

### 1. Sign in with Apple failed

Apple reported Guideline 2.1(a), App Completeness, because tapping Sign in with Apple displayed:

```text
Apple sign-in failed. Try email instead.
```

Local remediation:

- iOS now attempts native Sign in with Apple through `expo-apple-authentication`.
- Native Apple credentials are exchanged with Supabase through `signInWithIdToken`.
- Non-iOS surfaces and recovery fallback can still use Supabase OAuth.
- The iOS entitlement remains enabled through `ios.usesAppleSignIn: true` and the `expo-apple-authentication` config plugin.

Backend configuration status and required shape:

- Supabase Apple provider must include the native client ID `com.dyrane.ivisit`.
- Apple Developer Services ID `com.dyrane.ivisit.web` exists as `iVisit Supabase Auth`.
- The Services ID is configured under primary App ID `T585U2AQ58.com.dyrane.ivisit`.
- The Services ID domain must be `dlwtcmhdzoklveihuhjf.supabase.co`.
- The Services ID return URL must be `https://dlwtcmhdzoklveihuhjf.supabase.co/auth/v1/callback`.
- Supabase Apple client IDs should be ordered as `com.dyrane.ivisit.web,com.dyrane.ivisit`.

Why the order matters:

- `com.dyrane.ivisit.web` is the Apple Services ID for browser OAuth, Expo web, Android/browser fallback, and Supabase redirect testing.
- `com.dyrane.ivisit` is the native iOS bundle ID for TestFlight/App Review token exchange.
- If browser OAuth uses `client_id=com.dyrane.ivisit`, Apple returns `invalid_request: Invalid client id or web redirect url`.
- Keeping both IDs covers the native App Review path and the web/OAuth fallback path.

Validation target:

- Install a fresh App Store/TestFlight-style iOS build on iPad.
- Start from the guest map path.
- Open the mini profile/auth sheet.
- Tap Continue with Apple.
- Confirm no red error appears, a Supabase session is created, and the user returns to the interrupted flow.
- Optional web fallback test: from web/Expo OAuth, confirm the Apple authorize URL uses `client_id=com.dyrane.ivisit.web`, not `com.dyrane.ivisit`.

### 2. Individual Apple Developer account is not acceptable

Apple reported Guideline 5.1.1(ix), Legal - Privacy - Data Collection and Storage. Because iVisit handles highly sensitive healthcare/emergency/location data, Apple requires submission from an Apple Developer Program organization account, not an individual account.

This is not fixable in app code.

Required external remediation:

- Convert the current Apple Developer membership to an organization account, or enroll a new organization account for the legal entity.
- The likely legal entity should match store/legal materials, for example `iVisit Media Inc.` if that is the operating company.
- After organization approval, either keep the existing app under the converted team or transfer the app to the organization team.
- Do not resubmit to App Review from the individual account unless Apple Developer Support explicitly resolves this requirement.

This blocker remains open until Apple Developer account status is organization.

### 3. PassKit / Apple Pay information needed

Apple reported that the binary includes the PassKit framework, but reviewers could not verify an Apple Pay integration.

Cause found locally:

- The app uses `@stripe/stripe-react-native` for card/payment support.
- `app.config.js` previously configured `merchantIdentifier: "merchant.com.ivisit"`, which caused EAS/Apple credentials to enable Apple Pay Payment Processing even though no visible Apple Pay UI is exposed in this release.

Local remediation:

- Removed the Stripe `merchantIdentifier` from `app.config.js`.
- Kept the Stripe plugin so existing card/payment surfaces remain available.
- Future Apple Pay work must add a visible Apple Pay button/path, confirm merchant setup in Stripe and Apple Developer, and update Review Notes with the exact navigation path before re-enabling the merchant identifier.

Review Notes answer if Apple still asks:

```text
iVisit does not expose Apple Pay in this version. Payments in this build use Stripe card/payment flows and non-card options where available. Apple Pay is not presented as a user-facing payment method in version 1.0.6.
```

### 4. Emergency services information needed

Apple asked:

```text
Can emergency services actually receive and handle distress calls, and receive the user's location from the app?
```

Use a bounded, truthful answer. Do not imply 911/local government emergency dispatch integration unless it is live and contracted.

Recommended answer:

```text
iVisit does not place calls to public emergency services such as 911 or a local government emergency number.

The app can collect a user's pickup/location context and create an iVisit emergency/provider request record for configured iVisit provider and dispatch workflows. In the review/staging build, these flows use staging/demo provider data and should not be treated as a live emergency-service guarantee.

Production availability of ambulance response, provider handling, hospital capacity, payments, and location handoff depends on partner coverage and live operational status. The app tells users that in a life-threatening emergency they should contact local emergency services immediately.
```

## Resubmission Gates

Do not resubmit until:

- Apple Developer account is converted to or replaced by an organization account.
- Supabase Apple provider includes `com.dyrane.ivisit.web,com.dyrane.ivisit`.
- Apple Services ID `com.dyrane.ivisit.web` is saved with the Supabase callback URL.
- A fresh iOS build made after removing the Stripe merchant identifier is uploaded.
- Sign in with Apple is tested on iPad or a device class close to the review device.
- Review Notes include the emergency-services answer and the Apple Pay/no-Apple-Pay clarification.
- The build selected in App Store Connect is the new fixed build, not rejected build 5.

## Local Verification Commands

Run from `C:\Users\Dyrane\Documents\GitHub\ivisit-app`:

```powershell
npx expo config --type introspect
npx expo export --platform ios --output-dir tmp\ota-ios-export-check
git diff --check
powershell -ExecutionPolicy Bypass -File scripts\fix-mojibake.ps1 -CheckOnly
```

Expected config results:

- `com.apple.developer.applesignin` is present with `Default`.
- `com.apple.developer.in-app-payments` is absent until Apple Pay is intentionally shipped.

## Fixed Build Tracking

Rejected build:

- iOS version/build: `1.0.6 (5)`
- Submission ID: `1b3155e9-e81c-4a4b-b731-5c35900eee19`

Build 6:

- EAS build ID: `e50d27db-5175-4565-8cc2-94fd4deeedd3`
- Archive URL: `https://expo.dev/artifacts/eas/-jaw5y3ipHXR8CFiAxocwBzPr0oMDR_a2ZuCugzDpp0.ipa`
- Local archive: `artifacts/eas-builds/ios-staging-1.0.6-build-6/ivisit-ios-staging-1.0.6-build-6.ipa`
- Status: contains Apple sign-in code recovery, but was created before the Apple Pay merchant identifier removal. Do not use this as the final resubmission build if PassKit remains a review concern.

Next build:

- EAS build ID: `1692b4c1-6d37-451f-bb23-a50d54adb092`
- iOS version/build: `1.0.6 (7)`
- Logs: `https://expo.dev/accounts/dyrane/projects/ivisit/builds/1692b4c1-6d37-451f-bb23-a50d54adb092`
- Archive URL: `https://expo.dev/artifacts/eas/CSE9S-v3BoAqLEdgKY8QioO-mk9POx_G0R5-Ie40-qA.ipa`
- Status at last doc update: finished.
- Created after this document and the `app.config.js` Apple Pay entitlement fix.
- Confirm Apple sign-in entitlement remains and Apple Pay entitlement is absent.
- Upload only after the organization-account plan is resolved or Apple explicitly allows review to continue.

## Review Notes Draft For Next Submission

```text
iVisit helps users find nearby healthcare providers, request ambulance-style assistance, and coordinate care flows from a map-first experience.

Sign-in is not required to review the primary experience. From launch, reviewers can enter the map, explore nearby care, inspect hospital/provider discovery surfaces, and start the guided request flow as a guest.

Optional deeper review access:
Email: support@ivisit.ng
Code: 123456

Sign in with Apple is available from the mini profile/auth sheet and uses native iOS Sign in with Apple.

iVisit does not expose Apple Pay in this version. Payments in this build use Stripe card/payment flows and non-card options where available. Apple Pay is not presented as a user-facing payment method in version 1.0.6.

iVisit does not place calls to public emergency services such as 911 or a local government emergency number. The app can collect a user's pickup/location context and create an iVisit emergency/provider request record for configured iVisit provider and dispatch workflows. In the review/staging build, these flows use staging/demo provider data and should not be treated as a live emergency-service guarantee.

Production availability of ambulance response, provider handling, hospital capacity, payments, and location handoff depends on partner coverage and live operational status. In a life-threatening emergency, users should contact local emergency services immediately.
```
