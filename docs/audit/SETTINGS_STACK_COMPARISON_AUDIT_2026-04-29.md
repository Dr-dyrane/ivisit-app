# Settings Stack Comparison Audit (2026-04-29)

Status: Pre-pass comparison baseline  
Reference surfaces: `Payment`, `Emergency Contacts`, `Profile`

## Scope

Audit `SettingsScreen` against the current stack-screen contract:

- thin route
- dedicated screen model
- orchestrator-owned header and viewport decisions
- stage base for shell and motion
- wide-screen dead-space strategy
- utility-copy and typography discipline

## Current Shape

Current entry path:

- `app/(user)/(stacks)/settings.js`
- `screens/SettingsScreen.jsx`
- `components/settings/SettingsCard.jsx`

`SettingsScreen.jsx` is still a route-owned monolith. It currently owns:

- header setup
- scroll wiring
- motion boot
- theme switching
- preferences mutations
- password/payment/support navigation
- logout action
- all section grouping and inline spacing

## Comparison Against Reference Stack Screens

### 1. Route Ownership

`Payment`, `Emergency Contacts`, and `Profile` now use:

- thin route
- orchestrator
- stage base
- screen model

`Settings` does not. The route file still owns the entire screen lifecycle and most interaction logic.

### 2. Wide-Screen Behavior

Reference stack screens now convert MD+/desktop space into:

- left identity/context island
- center task surface
- optional right context island on XL

`Settings` currently just renders the compact grouped-list composition in a single column with fixed horizontal padding. It has no wide-screen shell grammar and no use of dead canvas.

### 3. Surface Grammar

What already aligns:

- grouped row grammar already borrows from mini-profile
- the screen is naturally utility-oriented, so it fits the calmer stack-screen direction

What is still missing:

- settings-specific content/theme tokens
- shell ownership split
- viewport-aware spacing and width caps
- settings-specific context surface for wide layouts

### 4. Side-Effect Discipline

Current route-level side effects inside `SettingsScreen.jsx`:

- `useFocusEffect` for header state
- animation boot
- preference toggles
- logout flow

This is still the older pattern. The route has too many responsibilities, and the update path is not isolated in a model/controller layer.

### 5. Copy and Typography

Current header copy is legacy:

- title: `Settings`
- subtitle: `PREFERENCES`

That subtitle casing is now behind the newer contract. The current screen also has no formal content tokens, so typography and copy tone are effectively implicit.

### 6. Modal / Side-Effect Surface Contract

`Settings` is lighter than `Payment` or `Emergency Contacts`, but it still needs the same contract:

- side-effect surfaces must use shared viewport config
- compact uses simpler posture
- wide screens must not stretch temporary surfaces

This matters most for any future password/help/privacy surfaces that remain inside the settings ecosystem.

## Strengths to Preserve

- grouped row interaction model is already close to the mini-profile blade grammar
- theme toggle and preference toggles are understandable
- password/payment/support rows are clearly task-oriented
- the screen is smaller and more structurally regular than the old profile route, so the pass should be lower-risk

## Main Gaps

1. `SettingsScreen.jsx` still owns too much orchestration and surface composition.
2. The screen has no payment/emergency/profile-style wide-screen treatment.
3. Copy, spacing, and section composition are still implicit instead of tokenized.
4. There is no dedicated settings model that isolates preference mutation, routing, and logout flows.

## Recommended Target Shape

- `screens/SettingsScreen.jsx` becomes composition-only
- `components/settings/SettingsScreenOrchestrator.jsx` owns header wiring and variant selection
- `components/settings/SettingsStageBase.jsx` owns shell, motion, scroll wiring, and viewport config
- `hooks/settings/useSettingsScreenModel.js` owns:
  - theme mode actions
  - preferences toggles
  - password/payment/support routing
  - logout action
- `components/settings/SettingsWideLayout.jsx` converts desktop dead space into context islands
- `components/settings/settingsScreen.content.js`
- `components/settings/settingsScreen.theme.js`

## Shape Recommendation

Recommended shape: Hybrid Pattern B

Reason:

- `Settings` is still one structural list surface across variants
- layout differences are mostly shell and context, not a full per-variant content rewrite
- viewport config plus one wide layout split is likely enough

## Risks to Watch in Implementation

- preference toggles must keep immediate visual feedback
- logout must remain deterministic
- existing mini-profile row grammar should survive the shell rewrite
- compact/mobile should stay simpler than wide, not become a shrunk desktop layout
- section ordering and current navigation affordances must not regress

## Exit Conditions for the Pass

- route becomes thin
- screen model/orchestrator/stage base split lands
- grouped row grammar remains intact
- wide-screen dead space becomes context islands
- copy and typography match the newer utility-surface doctrine
- documentation updates land in the same pass
