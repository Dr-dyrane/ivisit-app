# Profile Stack Comparison Audit (2026-04-29)

Status: Active baseline  
Scope: `screens/ProfileScreen.jsx` compared against the current stack reference surfaces:

- `PaymentScreen`
- `EmergencyContactsScreen`

## Purpose

This audit records where the current `ProfileScreen` still diverges from the stack-screen doctrine that now exists in code and docs after the payment and emergency-contacts passes.

It is a planning baseline, not an implementation log.

## Reference Surfaces

The comparison anchors are:

- [`screens/PaymentScreen.jsx`](../../screens/PaymentScreen.jsx)
- [`components/payment/PaymentScreenOrchestrator.jsx`](../../components/payment/PaymentScreenOrchestrator.jsx)
- [`components/payment/PaymentStageBase.jsx`](../../components/payment/PaymentStageBase.jsx)
- [`screens/EmergencyContactsScreen.jsx`](../../screens/EmergencyContactsScreen.jsx)
- [`components/emergency/contacts/EmergencyContactsScreenOrchestrator.jsx`](../../components/emergency/contacts/EmergencyContactsScreenOrchestrator.jsx)
- [`components/emergency/contacts/EmergencyContactsStageBase.jsx`](../../components/emergency/contacts/EmergencyContactsStageBase.jsx)

## Shape Comparison

| Surface            | Route file | Orchestrator | Stage base | Screen model / domain hook | Wide-screen shell |
| ------------------ | ---------- | ------------ | ---------- | -------------------------- | ----------------- |
| Payment            | thin       | yes          | yes        | yes                        | yes               |
| Emergency Contacts | thin       | yes          | yes        | yes                        | yes               |
| Profile            | no         | no           | no         | partial                    | no                |

## Current File Shape

Current line counts:

| File                                                                                                           | Lines |
| -------------------------------------------------------------------------------------------------------------- | ----: |
| [`screens/ProfileScreen.jsx`](../../screens/ProfileScreen.jsx)                                                 |   248 |
| [`hooks/profile/useProfileForm.js`](../../hooks/profile/useProfileForm.js)                                     |   199 |
| [`components/profile/surfaces/ProfileHero.jsx`](../../components/profile/surfaces/ProfileHero.jsx)             |   143 |
| [`components/profile/surfaces/ProfileActionList.jsx`](../../components/profile/surfaces/ProfileActionList.jsx) |   136 |
| [`components/profile/surfaces/ProfileModals.jsx`](../../components/profile/surfaces/ProfileModals.jsx)         |   154 |

Reference comparison:

| File                                                                                                                                                   | Lines |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----: |
| [`screens/PaymentScreen.jsx`](../../screens/PaymentScreen.jsx)                                                                                         |    15 |
| [`components/payment/PaymentScreenOrchestrator.jsx`](../../components/payment/PaymentScreenOrchestrator.jsx)                                           |   201 |
| [`components/payment/PaymentStageBase.jsx`](../../components/payment/PaymentStageBase.jsx)                                                             |   142 |
| [`screens/EmergencyContactsScreen.jsx`](../../screens/EmergencyContactsScreen.jsx)                                                                     |    13 |
| [`components/emergency/contacts/EmergencyContactsScreenOrchestrator.jsx`](../../components/emergency/contacts/EmergencyContactsScreenOrchestrator.jsx) |   216 |
| [`components/emergency/contacts/EmergencyContactsStageBase.jsx`](../../components/emergency/contacts/EmergencyContactsStageBase.jsx)                   |   167 |

## Findings

### 1. Route file is still a live orchestrator

`ProfileScreen.jsx` still owns:

- header registration
- focus sync
- animation setup
- viewport shell
- modal visibility
- direct hook composition
- action wiring

That is the clearest gap versus payment and emergency contacts, where the route files are now thin handoff points.

### 2. No stage base exists

Payment and emergency contacts both have a stage base that owns:

- shell gradient
- animation boot
- scroll handling
- viewport config
- wide-screen posture

Profile currently inlines all of that directly in [`screens/ProfileScreen.jsx`](../../screens/ProfileScreen.jsx).

### 3. Modal ownership is still ad hoc

Profile currently splits modal behavior between:

- [`components/profile/surfaces/ProfileModals.jsx`](../../components/profile/surfaces/ProfileModals.jsx)
- [`components/profile/surfaces/PersonalInfoSheet.jsx`](../../components/profile/surfaces/PersonalInfoSheet.jsx)
- raw `Modal` usage for account deletion

This is behind the newer stack rule where side-effect surfaces consume shared viewport primitives and keep posture decisions explicit.

### 4. Wide-screen behavior is effectively compact-only

There is no payment-style stage shell, no sidebar composition, and no right context island. The current profile layout is a single-column mobile stack stretched onto larger viewports.

This now conflicts with the carry-forward rule captured after payment and emergency contacts:

- dead wide-screen space should become context, not a wider form
- editor/task modals stay centered and bounded

### 5. Domain ownership is only partially extracted

`useProfileForm.js` owns profile editing and media upload well enough for the old screen, but the current profile surface still mixes:

- auth reads
- medical profile reads
- emergency contacts reads
- modal state
- action routing
- shell animation

That is not yet the same composition bar as payment or emergency contacts.

### 6. Typography and hero treatment are older than the current doctrine

Notable legacy traits in the current profile surface:

- hero title uses `900`
- membership pill uses uppercase feature-label treatment
- the hero and identity area still read louder than the calmer stack surfaces now documented

The mini-profile doctrine remains the right visual source, but the current full route has not been re-harmonized with the newer capped-weight stack rules.

### 7. Mini-profile reuse is real, but incomplete

`ProfileActionList.jsx` correctly reuses the mini-profile shortcut grammar. That part should remain a source of truth.

The gap is not the row system; the gap is the route shell around it.

## What Should Be Preserved

The next pass should preserve these strengths:

- mini-profile shortcut group structure in [`ProfileActionList.jsx`](../../components/profile/surfaces/ProfileActionList.jsx)
- `useProfileForm.js` as the seed for a future screen model or domain hook split
- progressive disclosure for editing through `PersonalInfoSheet`
- identity-first ordering already consistent with the mini-profile handoff doctrine

## What Should Change Next

Profile should adopt the same structural anatomy now used by payment and emergency contacts:

- thin route file
- `ProfileScreenOrchestrator`
- `ProfileStageBase`
- `useProfileScreenModel`
- explicit surface content/theme files
- centered width-bounded side-effect forms
- wide-screen context panel instead of a stretched single-column surface

## Decision

`ProfileScreen` is the next correct stack-page pass.

It is close enough to the mini-profile doctrine to reuse its row system, but far enough from payment/emergency-contacts shell discipline that it needs a formal architecture pass instead of incremental styling tweaks.
