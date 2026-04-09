# iVisit — Master Reference Flow (v1)

> Status: Active reference  
> Last Updated: 2026-04-07  
> Scope: `ivisit-app` patient emergency flow  
> Purpose: lock the map-first, state-driven emergency journey for design, product, and engineering alignment.

Related references:

- [workflow_map.md](./workflow_map.md)
- [ambulance_and_bed_booking.md](./ambulance_and_bed_booking.md)
- [EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](./EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [../../WELCOME_AND_INTAKE_FLOW_MAP.md](../../WELCOME_AND_INTAKE_FLOW_MAP.md)
- [../../EMERGENCY_SCREEN_DOSSIER.md](../../EMERGENCY_SCREEN_DOSSIER.md)
- [../../EMERGENCY_INTEGRATION_AUDIT.md](../../EMERGENCY_INTEGRATION_AUDIT.md)
- [../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md](../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)

---

# 0. Core Philosophy (LOCK THIS)

iVisit is not meant to feel like a multi-screen emergency wizard.

It is:

- **Map = constant reality layer**
- **Bottom sheet = state + action**
- **Header = orientation + system status**

The user experience should feel like:

> **persistent map + state transitions in place**

Important clarification:

- from the **user's point of view**, there should be no confusing page-jump feeling
- internally, routes and state containers may still exist for implementation
- the map should remain the spatial anchor throughout the urgent journey

---

# 1. Global UX Rules

## Always true

- map never disappears
- user keeps location context
- progress is visible through state, route, and motion
- actions feel immediate, not form-heavy
- copy stays short, calm, and truthful

## Never do

- login before intent
- payment before clarity
- blank loading states
- feature explanations before action
- marketplace-style browsing in the ambulance path

## Truthfulness rule

Only show hard operational claims when the system can truly support them.

Use truthful language such as:

- `Estimated arrival`
- `Recommended hospital`
- `Estimated cost`
- `Deposit may apply`

---

# 2. App Entry Logic

```text
IF active request exists
→ Resume active state (tracking / reservation)

ELSE
→ Show idle map state
```

---

# 3. Welcome State

Purpose: start the system instantly.

### Current implementation note (2026-04-08)

- `/(auth)/request-help` is the active orchestration shell for the first idle map state
- welcome now pre-warms location, normalized place label, and nearby hospitals in the background
- the first `request-help` surface should behave like a **map-first dashboard**, not a blank intake form

### Runtime doctrine locked from current implementation review

- [WelcomeScreen.jsx](../../../screens/WelcomeScreen.jsx) may pre-warm emergency discovery, but it must not silently trigger demo bootstrap.
- [GlobalLocationContext.jsx](../../../contexts/GlobalLocationContext.jsx) is the single owner of initial device location and normalized place label.
- [EmergencyContext.jsx](../../../contexts/EmergencyContext.jsx) should consume that app-owned location and nearby hospitals, not run a competing first-load location lookup.
- explicit demo backfill belongs to the intake flow in [RequestAmbulanceScreen.jsx](../../../screens/RequestAmbulanceScreen.jsx), where coverage quality is known and the user has already entered emergency intent.

```text
[ Animated visual ]

Get help now
Fast help nearby

[ Continue ]
```

No:

- onboarding
- long explanations
- forced authentication
- sign-in prompt on the first screen

Session restore path after entry:

```text
Open app
→ Welcome
→ Map

→ Tap profile / header icon
→ Activity sheet

→ Continue with phone
→ OTP
→ session restored

→ visits / history appear
```

## 3.1 Cross-Platform Native Entry Rules (LOCK THIS)

These rules apply across **iOS, Android, and web**:

- same emotional hierarchy on every platform: quiet brand, one live-system visual, one headline, one reassurance line, one dominant CTA
- default welcome copy stays locked to:
  - `Get help now`
  - `Fast help nearby`
  - `Continue`
- motion should be barely felt, not theatrical
- web should feel like native product chrome, not a marketing landing page
- avoid borders, promo chips, secondary CTAs, or busy utility chrome on first launch
- minimal does not mean tiny: secondary text still needs immediate readability under stress

---

# 4. First-Time vs Returning Idle State

## 4.1 First-Time User

### Header

```text
iVisit
Ready to help
```

### Bottom Sheet

```text
[ Animated visual ]

Get help now
Fast help nearby

[ Continue ]
```

### Behavior

- one dominant urgent CTA
- subtle motion makes the surface feel like a live system, not a poster
- one light reassurance line supports the headline without adding cognitive load
- auth/session restore starts from the profile or header entry after the map opens

## 4.2 Returning User (Idle State)

### Header

- minimal
- avatar if available

### Bottom Sheet

```text
[ Animated visual ]

Get help now
Fast help nearby

[ Continue ]
```

### Behavior

- no extra hints
- no explanations
- identity and session restore live under the profile/header activity sheet once inside the product

---

# 5. Header System (Global)

The header is a **state indicator**, not a navigation hub.

## States

### Idle (first-time)

```text
iVisit
Ready to help
```

### Idle (returning)

- minimal logo or avatar

### Searching

```text
Finding nearby care…
```

### Active dispatch

```text
Ambulance on the way
```

### Bed reserved

```text
Bed confirmed
```

## Header Right Action

- avatar or menu icon
- opens a **utility sheet**

### Utility Sheet Includes

- Activity (Visits)
- Profile
- Payment methods
- Settings
- Support

This remains secondary, not the default surface.

---

# 6. Map Layer (Persistent)

The map is always visible and communicates:

- user location
- nearby hospitals
- routes
- system activity

### Map behaviors

- zoom = system thinking
- route drawing = progress
- pulsing markers = live state
- responder movement or pulse = execution/tracking proof

---

# 7. Bottom Sheet System

Use one primary sheet system with multiple states.

## Snap Levels

1. collapsed
2. mid (default)
3. expanded (details / commit)

Rule:

- the sheet changes state
- the map remains the anchor

---

# 8. Core Intents (v1 scope)

The first screen should lead with one urgent CTA only:

```text
Continue
```

After that CTA, the next state reveals the two real care intents:

```text
🚑 Ambulance
🏥 Book bed
```

---

# 9. Shared Search Engine

Both intents use the same hospital-search foundation:

```ts
searchHospitals({ location, intent })
```

Difference:

- **Ambulance** → system recommends/selects the best default option
- **Bed** → user chooses from available hospitals

---

# 10. Ambulance Flow (System-Led)

## Step 1 — Tap Ambulance

### Map

- shows candidate hospitals
- may show faint route options

### Sheet

```text
Finding fastest team…
```

---

## Step 2 — System recommends hospital

### Map

- locks the likely route
- highlights the recommended destination

### Sheet

```text
Estimated arrival ~6 min

Hemet Valley Medical Center

Estimated cost: $153.75

[ Continue ]
```

Rules:

- no auth yet
- this is a **review / continue** moment, not final dispatch
- avoid a fake early irreversible CTA like `Confirm & dispatch`

---

## Step 3 — Commit Phase begins

User taps `Continue`.

---

# 11. Bed Flow (User-Led)

## Step 1 — Tap Book bed

### Map

- shows multiple hospitals

### Sheet

```text
Nearby hospitals

Hemet Valley — Beds available
Riverside — Limited
```

---

## Step 2 — Select hospital

### Map

- zooms to the selected hospital

### Sheet

```text
Hemet Valley Medical Center

Beds available

Deposit: $50

[ Continue ]
```

---

## Step 3 — Commit Phase begins

---

# 12. Commit Phase (Shared Pattern)

This is where:

- triage or transport detail is finalized
- identity is captured last
- payment is prepared immediately after identity
- the real-world action is triggered

## Core rule

There is **one irreversible commit moment only**.

That means:

- early CTAs should say `Continue`
- the final commit CTA triggers the actual dispatch or reservation
- payment is the final release gate, not an early blocker

## Current implementation constraint

The new intake/runtime is already feasible on top of the current app shell, but one seam is still legacy:

- [RequestAmbulanceScreen.jsx](../../../screens/RequestAmbulanceScreen.jsx) already persists intake state and mounts the modern intake shell through [EmergencyIntakeOrchestrator.jsx](../../../components/emergency/intake/EmergencyIntakeOrchestrator.jsx).
- choose-location and choose-hospital already live in shared stage families.
- after intake, the screen still flips into [EmergencyRequestModal.jsx](../../../components/emergency/EmergencyRequestModal.jsx) through `showLegacyFlow`.
- that modal still mixes selection, identity, payment, waiting, and dispatch assumptions in one large legacy surface.

So the architectural target is:

- keep the current intake shell
- replace the `showLegacyFlow -> EmergencyRequestModal` handoff with a dedicated **commit phase stage family**
- reuse backend services and request orchestration; do not rewrite the backend just to achieve the new Apple Maps-style flow

---

# 13. Triage And Transport Detail (Pre-Auth)

This detail belongs **before auth**.

The user should first finish the operational choices that affect the request:

- ambulance path:
  - what is happening
  - ambulance/support level if needed
- bed path:
  - whether transport is needed

Rule:

- auth should be the **last measure before payment**
- do not interrupt triage or transport detail with identity capture
- by the time auth appears, the user should already know what they are asking the system to do

---

# 14. Identity (Authentication Layer)

## UX framing

Do not say:

- `Sign up`
- `Register`

Use:

```text
Add patient details
```

## Inputs

```text
Name
Phone number
```

OTP verification happens here if required to commit.

Rule:

- auth should confirm identity quickly
- auth should happen **after triage / transport detail and immediately before payment**
- auth must **resume the same flow**, not restart the journey

## Current v1 auth decision

- use **email OTP** as the commit-time identity mechanism
- still collect **phone number** as patient/contact data
- do not force Google auth in the emergency commit path
- do not route emergency users into email/password account-thinking

This keeps the flow aligned with the product rule:

- no auth before intent
- no payment before clarity
- one continuous emergency surface instead of a sign-up detour

## Reuse strategy for implementation

Do not rewrite the emergency commit flow from scratch.

- reuse the stage-family pattern already used by:
  - [EmergencyChooseLocationStageBase.jsx](../../../components/emergency/intake/views/chooseLocation/EmergencyChooseLocationStageBase.jsx)
  - [EmergencyChooseHospitalStageBase.jsx](../../../components/emergency/intake/views/chooseHospital/EmergencyChooseHospitalStageBase.jsx)
  - [EmergencyChooseResourceStageBase.jsx](../../../components/emergency/requestModal/views/chooseResource/EmergencyChooseResourceStageBase.jsx)
- reuse OTP-first auth primitives already in the app:
  - [AuthInputModal.jsx](../../../components/register/AuthInputModal.jsx)
  - [SmartContactInput.jsx](../../../components/auth/SmartContactInput.jsx)
  - [OTPInputCard.jsx](../../../components/register/OTPInputCard.jsx)
- copy and adapt those surfaces into an emergency-specific commit family rather than extending the legacy modal further

---

# 15. Optional Triage (Ambulance)

```text
What’s happening?

• Chest pain
• Breathing issue
• Injury
• Other
```

Rules:

- fast tap
- skippable
- no friction
- keep it before identity and before final payment in v1 unless triage must change the recommendation itself

---

# 16. Ambulance Type (Conditional)

If only one option exists:

- do not show selection

If multiple options exist:

- recommend one
- allow override
- keep the naming plain English

Examples:

- `Standard ambulance`
- `Ambulance with extra support`
- `Critical care ambulance`

If the choice does not truly help the user decide, keep it hidden.

---

# 17. Payment Flow

## Core rule

Payment is the **commit trigger**.

It happens only after:

- hospital is known
- ETA is known
- cost is known
- triage / transport detail is complete
- identity has just been verified

## Ambulance Payment

```text
Pay & send ambulance

$153.75 will be charged
Ambulance will be sent immediately

[ Pay & send ambulance ]
```

## Bed Payment

```text
Reserve bed

$50 deposit required
Secures your admission

[ Pay & reserve ]
```

---

# 18. Execution Phase

## Ambulance

### Map

- route active
- ambulance movement or pulse

### Sheet

```text
Ambulance on the way

Estimated arrival ~6 min
```

## Bed

### Sheet

```text
Bed reserved

Proceed to hospital
```

---

# 18. Tracking Phase

Map remains primary.

### Ambulance

- live route
- ETA updates
- responder progress

### Bed

- hospital stays pinned
- directions remain available

---

# 19. Activity / Visits System

Accessed from the header utility sheet and surfaced on entry only when a real resumable state exists.

```text
Resume Visit
```

Otherwise, the default quiet line remains:

```text
Already using iVisit? Sign in
```

## Not a main tab

## Structure

### Active

- Ambulance in progress
- Pending request

### Past

- Previous visits

## Behavior

When tapped:

- restore map context
- restore the right bottom-sheet state
- do not create a disorienting navigation jump

---

# 20. Default App States

## 1. Idle

- map
- base sheet
- one dominant emergency CTA
- `Already using iVisit? Sign in` as the default quiet returning-user path
- `Resume Visit` appears only when the app can truthfully restore an active or resumable case

## 2. Commit

- optional triage
- optional transport detail
- patient details
- email OTP verification
- payment release

## 3. Active

- tracking or reservation state

## 4. History recall

- restored via Activity sheet

---

# 21. Final System Flow

## Ambulance

```text
Welcome
→ Idle map
→ Ambulance
→ System recommends hospital
→ Show ETA + estimated cost
→ Continue
→ Optional What happened?
→ Ambulance type (if needed)
→ Add patient details
→ Verify identity
→ Pay & send ambulance
→ Dispatch triggered
→ Tracking
```

## Bed

```text
Welcome
→ Idle map
→ Book bed
→ Show hospitals
→ Select hospital
→ Continue
→ Optional transport
→ Add patient details
→ Verify identity
→ Pay & reserve
→ Reservation confirmed
```

---

# 22. Final Product Definition

iVisit is:

> a real-time emergency coordination system  
> built on a persistent map  
> with state-driven interaction

It should feel like:

- Uber (decisive)
- Apple Maps (calm, spatial)
- healthcare (trust-driven)

---

# 23. One-Line Summary

> The map shows reality  
> The sheet guides action  
> The header confirms state  
> The user commits only when ready
