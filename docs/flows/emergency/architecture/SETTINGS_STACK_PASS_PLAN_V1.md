# Settings Stack Pass Plan (v1)

> Status: Implemented on 2026-04-29; keep as pre-pass plan reference
> Scope: `SettingsScreen` stack route
> Purpose: Bring `Settings` into the same stack-screen contract now used by `Payment`, `Emergency Contacts`, and `Profile`

## Summary

`SettingsScreen` is the next stack-owned utility route to modernize.

The current screen already has a useful grouped-row grammar, but it still lives in the older route-owned shape. This pass should preserve the compact mini-profile-like row language while upgrading:

- ownership split
- wide-screen composition
- tokenized copy/theme
- viewport-aware shell behavior

## Goals

1. Make the route thin.
2. Move orchestration into a dedicated settings screen model + orchestrator.
3. Reuse the shared stack viewport contract instead of keeping a mobile-only shell.
4. Keep compact/mobile simple.
5. Turn MD+/desktop dead space into context islands rather than stretching the list.

## Current Files

- `app/(user)/(stacks)/settings.js`
- `screens/SettingsScreen.jsx`
- `components/settings/SettingsCard.jsx`

## Target File Shape

### Route and Screen

- `app/(user)/(stacks)/settings.js`
- `screens/SettingsScreen.jsx`

### New Settings Stack Surface Files

- `components/settings/SettingsScreenOrchestrator.jsx`
- `components/settings/SettingsStageBase.jsx`
- `components/settings/SettingsWideLayout.jsx`
- `components/settings/SettingsContextPane.jsx`
- `components/settings/SettingsActionIsland.jsx`
- `components/settings/SettingsSectionList.jsx`
- `components/settings/settingsScreen.content.js`
- `components/settings/settingsScreen.theme.js`
- `components/settings/settingsSidebarLayout.js`

### Hook / Model

- `hooks/settings/useSettingsScreenModel.js`

## Ownership Split

### Route

`screens/SettingsScreen.jsx`

- composition only
- mounts orchestrator

### Screen model

`useSettingsScreenModel.js`

Owns:

- theme mode toggle
- preferences toggles
- route actions for payment / support
- logout action
- grouped row data
- derived labels for context surfaces

### Orchestrator

`SettingsScreenOrchestrator.jsx`

Owns:

- header wiring
- viewport variant resolution
- layout inset wiring for wide header placement
- compact vs wide render choice

### Stage base

`SettingsStageBase.jsx`

Owns:

- shell
- motion boot
- scroll wiring
- stack viewport config consumption
- responsive metrics handoff

## UI Direction

### Compact / Mobile

Keep the surface simple:

- no extra explanatory hero
- grouped settings blades first
- short header copy only
- no duplicate context panels

### Wide / Desktop

Follow the newer stack pattern:

- left context island
- center grouped-list surface
- optional right action/status island on XL

Do not stretch the grouped settings list across the whole page.

## Copy Direction

Use utility-surface copy:

- short task title
- short subtitle or none if unnecessary
- no all-caps header subtitle
- no repeated explanatory body text

Likely title/subtitle direction:

- `Settings`
- optional quiet subtitle such as `Preferences`

## Section Model

Convert the inline repeated groups into a section data model. Proposed sections:

1. Appearance
2. Notifications
3. Privacy
4. Account
5. Support
6. Session

Each section should be represented as data from the screen model, not hand-built inline inside the route.

## Interaction Rules

- toggles keep immediate visible response
- row presses keep haptic feedback
- logout remains deterministic
- navigation rows preserve existing destinations
- disabled rows remain visually obvious and truthful

## Wide-Screen Context Candidates

### Left context island

- current theme mode
- notifications summary
- privacy sharing summary

### Right action island

- account actions
- payment shortcut
- support shortcut

The exact content should stay concise and avoid duplicating every row.

## Risks

1. Over-explaining the screen on mobile.
2. Replacing the existing grouped-row grammar instead of preserving it.
3. Stretching the center list instead of using a bounded surface on wide screens.
4. Regressing toggle behavior while moving logic into the screen model.
5. Leaving route-owned side effects behind after the split.

## Verification Checklist

- compact/mobile uses the grouped settings blades without extra clutter
- wide screens show bounded center surface plus context islands
- theme toggle still works immediately
- notification/privacy toggles still persist correctly
- payment/support routes still open correctly
- logout still exits deterministically
- header copy and typography match the updated utility-surface doctrine

## Deprecation Note

`change-password` and `create-password` are no longer active stack-screen targets.

Reason:

- patient app entry is OTP-first and social-login compatible
- password management is no longer surfaced in `Settings` or `Profile`
- those two routes remain fallback-only legacy auth surfaces, not pages this stack pass should keep expanding

## Documentation Sync Required

Update in the implementation pass:

- `docs/README.md`
- `docs/INDEX.md`
- `docs/flows/README.md`
- `docs/flows/emergency/architecture/README.md`
- `docs/flows/emergency/architecture/STACK_SCREENS_PASS_V1.md`
- new implementation checkpoint audit

## Read Order

1. `docs/flows/emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md`
2. `docs/flows/emergency/architecture/STACK_SCREENS_PASS_V1.md`
3. `docs/audit/SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md`
4. this document
