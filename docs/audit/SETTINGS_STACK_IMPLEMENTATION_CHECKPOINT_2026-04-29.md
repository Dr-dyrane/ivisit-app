# Settings Stack Implementation Checkpoint (2026-04-29)

Status: Code implemented  
Verification state: Runtime/device matrix still pending

## Scope

`SettingsScreen` stack-surface modernization against the current payment + emergency-contacts + profile stack contract.

## What Landed

- `screens/SettingsScreen.jsx` is now a thin route that only mounts `SettingsScreenOrchestrator`.
- `components/settings/SettingsScreenOrchestrator.jsx` now owns header wiring, focus refresh, and compact vs wide composition.
- `components/settings/SettingsStageBase.jsx` now owns gradient shell, motion boot, scroll wiring, and `stackViewportConfig.js` consumption.
- `hooks/settings/useSettingsScreenModel.js` now owns:
  - theme toggle behavior
  - preferences toggles
  - payment / support routing
  - logout orchestration
  - section row data and derived summaries
- `components/settings/SettingsWideLayout.jsx` now uses:
  - left context island
  - center grouped settings surface
  - XL right action island
- `components/settings/SettingsSectionList.jsx` preserves the grouped mini-profile-style row grammar while removing the route-owned inline repetition.
- `components/settings/settingsScreen.content.js`, `settingsScreen.theme.js`, and `settingsSidebarLayout.js` now hold copy, theme, and wide-layout geometry explicitly.

## Preserved Behavior

- theme mode toggle still flips immediately
- notification and privacy toggles still update through `PreferencesContext`
- payments row still opens the payment stack route
- help and contact support still resolve through the support route
- logout still clears the session and returns to `/(auth)`

## Auth Contract Note

`change-password` and `create-password` are now treated as deprecated fallback-only auth routes.

They are no longer surfaced from `Settings`, because the patient app entry path is OTP-first and social-login compatible rather than password-led.

## Surface Outcome

- compact/mobile stays blade-only with no extra explanatory hero
- MD+/desktop no longer stretches the compact list across the full canvas
- dead wide-screen space now becomes context/action islands instead of a wider form
- copy and typography now follow the calmer utility-surface contract

## Remaining Verification

Still needed before calling this fully closed:

- seven-width visual matrix: `375, 430, 744, 1024, 1280, 1440, 1920`
- runtime smoke for:
  - theme toggle
  - notification/privacy toggle persistence
  - payment route handoff
  - help/support route handoff
  - logout behavior
