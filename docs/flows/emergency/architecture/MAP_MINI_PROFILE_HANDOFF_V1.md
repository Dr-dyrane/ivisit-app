# Map Mini Profile Handoff (v1)

> Status: Locked design handoff for next implementation pass
> Scope: authenticated `/map` control panel
> Priority: high

## Purpose

The mini profile is no longer a legacy overflow menu.

It is the authenticated user's fast control panel on top of the map:

- quick identity confirmation
- grouped shortcut access
- low-friction navigation into true hubs
- no visual or information sprawl

This surface should feel like a calm window over the live map, not like a repackaged "More" page.

## UX Role

The mini profile is the high-frequency shortcut surface in the intent-based map architecture.

It sits between:

- `/map` as the primary runtime surface
- route-owned hubs such as `Profile` and `Settings`

It should answer:

- who am I?
- where do I quickly go next?

It should not become:

- a settings dump
- a notifications center
- a long profile editor
- a second navigation system

## Information Architecture (Refined)

The architecture is now strictly anchored by identity, flowing from the user down to system controls.

Top identity block:
- avatar
- full name
- email

Grouped shortcut rows:
- **Account** (Identity Anchor)
  - `Profile`
- **Activity** (Contextual Activity)
  - `Recent Visits` (with count badge)
- **Essentials** (Utility & Safety)
  - `Payment`
  - `Emergency Contacts` (with count badge)
- **System** (Configuration)
  - `Settings`

Bottom:
- **Sign Out** (Destructive Secondary)

## Refinement Rationale (v1.1)

These refinements were implemented to elevate the surface from a "menu" to a "premium control panel":

### 1. Identity-First Anchoring
`Profile` is moved to the top group. The user sees themselves first, and the most personal action (managing identity) follows immediately. This anchors the entire surface.

### 2. Radical Noise Reduction
Labels like "Open", "Wallet", and "System" were removed from row badges. They added cognitive noise without adding meaning. Badges are now reserved exclusively for **dynamic data** (counts like 46 or 2), making them immediately scannable and relevant.

### 3. Action Grouping (Not Flat Lists)
Rows are explicitly grouped by intent. This reduces scanning effort by allowing the eye to skip entire blocks if the user is looking for a specific category (e.g., jumping straight to "Essentials").

### 4. Visual Rhythm & Breathing
Increased vertical rhythm and group spacing ("breathing, not separation") ensures the panel feels airy and premium. The identity block has more margin to emphasize its role as the surface anchor.

### 5. Intentional Iconography
Icons are desaturated slightly with softer accent tones. This prevents them from competing for attention, allowing the typography and content to lead while icons provide scannable support.

### 6. Destructive Secondary Logic
The `Sign Out` action is now visually demarcated with a divider and lower saturation. It feels like a secondary utility rather than a primary call to action, protecting the user from accidental taps and clarifying the hierarchy.


Notifications:

- not shown in mini profile
- owned by `Settings`

## Visual Direction

Reference direction:

- floating glass window over persistent map
- rounded, calm, premium panel
- large identity block first
- grouped rows below with clear spacing and minimal noise

Required feel:

- premium but restrained
- fast to scan
- low cognitive load
- strong enough to feel intentional, not ornamental

Android-safe orb rule:

- shortcut icon wrappers are true circular orbs, not squircles
- use solid tokenized fills and solid icons for orb hierarchy
- do not use `BlurView`, shadow blur, or Android `elevation` on small icon orbs
- avatar may be circular, but must not depend on blur/shadow depth for its shape or separation

Typography and blade rule:

- shortcut row blade height remains stable while type scales from viewport metrics
- labels should be larger than the legacy profile menu, but lighter in weight
- avoid heavy `800`/`900` label stacks except for truly primary hero identity moments
- if label size increases, reduce internal horizontal padding rather than increasing blade height
- badges remain supportive metadata, not bold competing CTAs

Implementation boundaries:

- `MiniProfileModal.jsx` owns orchestration, navigation, close timing, and data wiring
- `miniProfile.model.js` owns identity fallback, badge formatting, color tokens, and viewport-derived layout tokens
- `MiniProfileIdentity.jsx` owns the avatar/name/email block
- `MiniProfileShortcutGroup.jsx` owns grouped shortcut rows and divider alignment
- `MiniProfileSignOutButton.jsx` owns the low-priority sign-out action
- child components render from explicit props and must not reach into navigation, auth, visits, or emergency context directly

## Interaction Rules

- open from `/map` with immediate feedback
- close quickly and predictably
- every row must acknowledge press immediately
- panel must preserve map context behind it
- this surface must not replace the map unless a true downstream route or modal is opened

## Platform Contract

iOS / Android:

- bottom-sheet or native-feeling modal
- swipe-to-dismiss where appropriate

Web mobile:

- bottom sheet or full-height modal depending on viewport

Web desktop:

- centered modal or side drawer depending on `/map` shell layout

Invariant:

- same meaning, same groups, same actions, same state ownership on every platform
- only layout and interaction affordances adapt

## Ownership Rules

- mini profile is map-owned
- `Profile` remains a true route-owned hub
- `Settings` remains a true route-owned hub
- `Payment` and `Emergency Contacts` may open via routed or modal-owned downstream surfaces, but ownership must stay explicit

## Non-Goals

- do not add notifications back into this surface
- do not turn this into a full management page
- do not reintroduce legacy "More" behavior under a new name
- do not create platform-specific menu variants with different meaning

## Related Visits Note

Visits remain adjacent to this work but are not owned by mini profile.

The mini profile may link to recent visits, but the canonical visits surfaces remain map-owned.

Current plan:

- `MapRecentVisitsModal` is the primary visits entry on `/map`
- `MapVisitDetailsModal` is the canonical visit detail surface on `/map`
- legacy visit routes remain compatibility surfaces until migration is proven
- `Book a Visit` belongs in care discovery / choose-care, not as a profile-management row

## Done When

- the mini profile reads as a clean control panel for authenticated users
- grouped shortcuts are stable across platforms
- users can reach `Recent Visits`, `Profile`, `Payment`, `Emergency Contacts`, and `Settings` without tab or "More" dependence
- the surface feels native to the `/map` architecture instead of legacy navigation residue
