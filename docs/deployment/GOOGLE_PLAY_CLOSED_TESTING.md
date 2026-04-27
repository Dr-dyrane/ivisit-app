# Google Play Closed Testing

## Reviewer Access

Use this only for Google Play closed testing / app review.

- Email: `support@ivisit.ng`
- Code: `123456`
- App build profile: `staging`
- Supabase project: `dlwtcmhdzoklveihuhjf`
- Supabase Edge Function: `review-demo-auth`

## Flow

1. Open the app from the closed testing build.
2. Start the emergency map flow.
3. Choose transport and continue into `COMMIT_DETAILS`.
4. Enter `support@ivisit.ng`.
5. Enter code `123456`.
6. Continue the emergency request flow.

## Guardrails

- `support@ivisit.ng` must stay a `patient` profile.
- Do not use admin/personal Gmail accounts for Play review.
- The static review code is accepted only by `review-demo-auth`.
- The client never stores the static code as a login bypass.
- The Edge Function exchanges the static code for a real short-lived Supabase OTP, then the app verifies normally.

## Required Runtime Flags

Client build flag, enabled in `eas.json` for `staging`:

```text
EXPO_PUBLIC_REVIEW_DEMO_AUTH_ENABLED=true
EXPO_PUBLIC_REVIEW_DEMO_AUTH_EMAIL=support@ivisit.ng
```

Supabase Edge Function secrets:

```text
REVIEW_DEMO_AUTH_ENABLED=true
REVIEW_DEMO_AUTH_EMAIL=support@ivisit.ng
REVIEW_DEMO_AUTH_OTP=123456
```

## If The Code Changes

Update both places together:

1. Supabase secret `REVIEW_DEMO_AUTH_OTP`.
2. Google Play Console reviewer instructions.
3. This document and the emergency flow docs.

Deploy / update commands:

```bash
npx supabase secrets set REVIEW_DEMO_AUTH_ENABLED=true REVIEW_DEMO_AUTH_EMAIL=support@ivisit.ng REVIEW_DEMO_AUTH_OTP=123456 --project-ref dlwtcmhdzoklveihuhjf
npx supabase functions deploy review-demo-auth --project-ref dlwtcmhdzoklveihuhjf
```

---

## OTA Update Procedure (Staging Channel)

Use this checklist every time you push a code update that needs to reach Google reviewers or staging testers.

### Full rebuild required (native changes, new deps, version bump)

1. Bump `version` in `app.config.js` (e.g. `1.0.4` → `1.0.5`).
   - **This is the `runtimeVersion`.** `eas.json` policy is `appVersion`, so the runtime version equals `version`. Without bumping this, old OTAs and new OTAs share the same runtime key and Expo will serve whichever matches its own SDK fingerprint — usually the old one.
2. Commit and push to `main`.
3. Run the native build:
   ```bash
   eas build --profile staging --platform android
   ```
4. Wait for the build to finish, then publish the OTA (step below).

### OTA-only update (JS/asset changes, no native changes)

Only safe when `version` has **not** changed since the last build on this channel.

1. Ensure you are on `main` (`git checkout main`).
2. Publish:
   ```bash
   eas update --channel staging --message "<description>"
   ```
3. Note the `Update group ID` from the output.
4. Update `ivisit/src/constants/appLinks.ts` — both `ANDROID_PREVIEW_UPDATE_URL` and `IOS_PREVIEW_UPDATE_URL` — with:
   ```
   exp://u.expo.dev/a3777b70-b973-4b3b-ba59-ed32bf5662e0/group/<NEW_GROUP_ID>
   ```
5. Commit and push the website:
   ```bash
   git add -A && git commit -m "chore(appLinks): update staging exp:// to OTA group <ID>"
   git push origin main
   ```

### After a full rebuild — publish matching OTA

After the native build finishes, the new build has a **new fingerprint**. Publish a fresh OTA so the build receives it on first load:

```bash
eas update --channel staging --message "OTA vX.Y.Z — clean runtime for staging build versionCode <N>"
```

Then update `appLinks.ts` with the new group ID (same as OTA-only step 4–5 above).

---

## Post-Mortem: OTA Runtime Mismatch (2026-04-27)

**Symptom:** Clicking the `exp://` link in Expo Go (via the iVisit website "Try Native Preview" modal) always opened an old build from 2 months ago, even after publishing new OTAs.

**Root cause (3 compounding issues):**

1. **`runtimeVersion` was never bumped.** `app.config.js` `version` stayed at `1.0.4` across every build and OTA for months. All updates — old and new — shared the same runtime key `1.0.4`. Expo Go matched the OTA whose fingerprint fit its own SDK, which was the oldest compatible one.

2. **New native build had a different fingerprint than the published OTA.** We published an OTA (`4281bce7`) *before* the new native build (`5e17ca81`) finished. The OTA fingerprint matched the old build's native layer, not the new one. Even with the right group ID, the new build wouldn't receive it.

3. **`PreviewBridge.tsx` was hardcoded to `'production'`** — `getAppDownloadLinks('production')` — so the "Open iVisit" button in the modal was always sending users to the production `exp://` link regardless of `appLinks.ts` updates.

**Fixes applied:**

- Bumped `version` to `1.0.5` in `app.config.js` — new clean runtime key.
- Built staging again (versionCode `23`, build `b631dbc0`).
- Published OTA **after** the build finished — group `239408e5`, runtime `1.0.5`.
- Updated `appLinks.ts` preview URLs to group `239408e5`.
- Fixed `PreviewBridge.tsx` to use `getAppDownloadLinks('preview')`.

**Rules going forward:**

1. **Always bump `version` when doing a new native build.** Even minor JS-only cycles should get a version bump if the native fingerprint has changed since the last OTA.
2. **Always publish the OTA *after* the native build completes**, not before — so both share the same fingerprint.
3. **Always update `appLinks.ts` immediately after publishing the OTA** — do not wait.
4. **Never hardcode `'production'`** in any component that is meant to show staging/preview links. Use the `environment` parameter from `getAppDownloadLinks`.
5. **Check `eas update:list --branch staging`** to verify the latest OTA's `Runtime Version` matches the installed build before reporting "it's not working".
