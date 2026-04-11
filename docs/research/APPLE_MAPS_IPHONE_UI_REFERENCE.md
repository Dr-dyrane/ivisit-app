# Apple Maps iPhone UI Reference

> Status: Active reference
> Last updated: 2026-04-10
> Research standard: official Apple sources only (Apple HIG, UIKit docs, iPhone User Guide)
> Purpose: give the iVisit team one reusable source for Apple Maps iPhone surface patterns when designing map-first emergency states

## Scope

This file is for internal design reference only.

Use it to study:

- map-first composition
- bottom-card hierarchy
- route-option presentation
- place-card density
- control placement
- progressive disclosure

Do not copy Apple UI literally into product assets or marketing.

## Core Apple Maps iPhone doctrine

Across the official iPhone Maps surfaces, Apple keeps repeating the same product behavior:

- the map stays as the spatial truth layer
- a card or sheet changes state over the map
- the top of the card is glanceable first
- one primary action is obvious at each state
- detail is revealed by expanding the card, not by hard route changes
- floating controls stay minimal and consistent

For iVisit, that reinforces:

- map = constant reality layer
- sheet = state + action
- header = hidden until there is a true active emergency session

## Verified Apple guidance (official sources, checked 2026-04-10)

The points below are grounded in Apple’s own public documentation and should be treated as the factual baseline.

### 1. What Apple explicitly says about sheets on iPhone

Source:

- Apple HIG — Sheets: https://developer.apple.com/design/human-interface-guidelines/sheets
- UIKit — `UISheetPresentationController`: https://developer.apple.com/documentation/uikit/uisheetpresentationcontroller

Verified guidance:

- A sheet helps people perform a scoped task that is closely related to their current context.
- On iOS and iPadOS, a sheet can be modal or nonmodal.
- A resizable sheet expands when people scroll its contents or drag the grabber.
- Detents are the heights where a sheet naturally rests.
- Apple explicitly defines `large` as fully expanded and `medium` as about half height.
- Apple recommends including a grabber in a resizable sheet because it signals resizability and works with VoiceOver.
- Apple says people expect to swipe vertically to dismiss a sheet.
- Apple advises displaying only one sheet at a time from the main interface.

### 2. What Apple explicitly says about motion

Source:

- Apple HIG — Motion: https://developer.apple.com/design/human-interface-guidelines/motion

Verified guidance:

- Motion should be purposeful and should support the experience without overshadowing it.
- Feedback motion should feel realistic and follow people’s gestures and expectations.
- Feedback animations should be brief and precise.
- In apps, Apple generally advises avoiding heavy motion for frequent UI interactions.
- People should be able to interrupt or cancel motion instead of waiting for it to finish.

### 3. What Apple explicitly says about search surfaces

Source:

- Apple HIG — Search fields: https://developer.apple.com/design/human-interface-guidelines/search-fields
- Apple HIG — Layout: https://developer.apple.com/design/human-interface-guidelines/layout

Verified guidance:

- Search should use helpful placeholder text that describes the content being searched.
- If possible, search should start immediately as a person types.
- Results should prioritize the most relevant items first to reduce scrolling.
- On iPhone, Apple says search can live in a tab bar, a toolbar, or inline with content depending on context.
- Apple generally prefers bottom placement when search is a priority and easy reach matters.
- Layout should preserve clear visual hierarchy, progressive disclosure, and safe-area respect.

### 4. What Apple explicitly shows in Maps on iPhone

Source:

- Search for places in Maps on iPhone: https://support.apple.com/guide/iphone/search-for-places-iph1df24639/ios
- Get information about places in Maps on iPhone: https://support.apple.com/guide/iphone/get-information-about-places-iph8c9c2528b/ios
- Get driving directions in Maps on iPhone: https://support.apple.com/guide/iphone/get-driving-directions-ipha84a94043/ios
- View a route overview or a list of turns in Maps on iPhone: https://support.apple.com/guide/iphone/view-a-route-overview-or-a-list-of-turns-iph1b3553719/ios

Verified guidance:

- In Maps search, Apple places the search field at the top of the card.
- Apple explicitly tells people they can resize the card by dragging the top of the card up or down.
- When viewing a place, Apple tells people to scroll down in the place card for more information.
- In route mode, Apple shows multiple route options with ETA and a clear `Go` action.
- Apple tells people to tap anywhere on the route card except the `Go` button to reveal more route details.
- Expanded route details continue inside the same card rather than forcing a full shell change.

### 5. Safe product conclusions for iVisit

These are reasonable product translations from the verified sources above, not direct Apple quotes:

- The Apple Maps feel comes primarily from detent-first interaction, restrained motion, and progressive disclosure.
- The map should remain the spatial reference while the sheet changes state.
- The top of the sheet should contain the most important decision and the clearest next action.
- Deeper detail should usually expand within the same sheet before the app switches to a different full-screen flow.

## Verified latest Apple visual-system guidance (official sources, checked 2026-04-10)

This section covers the newer visual language so the app can feel current in addition to behaving correctly.

Primary sources:

- Apple HIG — Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple HIG — Color: https://developer.apple.com/design/human-interface-guidelines/color
- Apple HIG — Buttons: https://developer.apple.com/design/human-interface-guidelines/buttons
- Apple HIG — Toolbars: https://developer.apple.com/design/human-interface-guidelines/toolbars
- Apple HIG — App icons: https://developer.apple.com/design/human-interface-guidelines/app-icons
- Apple docs — Adopting Liquid Glass: https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass
- WWDC25 — `Meet Liquid Glass` and `Get to know the new design system`

### 1. Liquid Glass is the functional layer, not the content layer

Verified guidance:

- Apple says Liquid Glass forms a distinct functional layer for controls and navigation that floats above content.
- Apple explicitly says **don’t use Liquid Glass in the content layer**.
- Apple recommends using Liquid Glass effects sparingly and mostly for the most important functional elements.
- Apple distinguishes `regular` glass for stronger legibility and `clear` glass for elements floating over rich media.
- Apple notes that updated sheets adopt Liquid Glass, larger corner radii, inset half-sheet presentation, and a more opaque look when expanded to full height.

### 2. The current Apple look is rounder, softer, and more concentric

Verified guidance:

- Apple says the shape of the hardware informs the curvature of controls.
- Apple recommends aligning custom shapes with the rounded forms of surrounding containers and using concentric geometry.
- Apple’s official wording is about **rounded rectangles, concentric corners, and system-applied masking**.
- For app icons on iOS, iPadOS, and macOS, Apple says you provide square layers and the system applies the rounded-rectangle mask.

> Important note: Apple’s current public HIG does **not** frame this as “draw squircles everywhere.” The safer, source-backed takeaway is: use **continuous rounded geometry** that feels concentric with the device and surrounding chrome.

### 3. Color is restrained, semantic, and usually reserved for emphasis

Verified guidance:

- Apple recommends semantic system colors that adapt to light mode, dark mode, and increased contrast.
- Apple explicitly says even apps with one preferred appearance should still provide light and dark variants to support Liquid Glass adaptivity.
- Apple says to apply color to Liquid Glass sparingly.
- For a primary call to action, Apple prefers tinting the **background** of the control rather than coloring many labels or controls.
- Apple warns against coloring multiple toolbar controls the same way when only one primary action should stand out.

### 4. Native-feeling chrome is quiet, grouped, and symbol-led

Verified guidance:

- Apple advises reducing custom toolbar backgrounds and letting the system-provided appearance lead.
- Toolbars and navigation should feel like a distinct layer above content, not another content card.
- Apple recommends standard symbols for common actions and one prominent action on the trailing side when needed.
- Apple recommends logical grouping of related controls and avoiding overcrowding.

### 5. Up-to-date native UI is not only behavior — it is also visual hierarchy

Safe translation for iVisit:

- The map and sheet behavior should feel Apple-like, but the **visual hierarchy** also needs to match: quieter chrome, restrained accent use, rounder/concentric containers, and fewer custom backgrounds.
- The app should feel like content is primary and controls float above it with just enough emphasis.
- “Modern native” in 2025-2026 Apple language means **less heavy framing**, **more semantic material layering**, and **more disciplined emphasis**.

## Official source pack

### 1. Base map chrome

- Doc: [Set your location and map view in Maps on iPhone](https://support.apple.com/guide/iphone/set-your-location-and-map-view-iph10d7bdf26/ios)
- Screenshot asset: [3D map with floating controls, search bar, and profile affordance](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/0fba8fac8abc81e0f8bc4ef2ecb3e9be.png)

What matters:

- floating controls hug edges
- search lives low and reachable
- the map remains visually dominant
- controls are few and legible

### 2. Search card / live query state

- Doc: [Search for places in Maps on iPhone](https://support.apple.com/guide/iphone/search-for-places-iph1df24639/ios)
- Screenshot asset: [search field with live results card](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/286193462a10e8e1801336c12ef16ccc.png)

What matters:

- search is inside the card, not detached from it
- top result is elevated and action-ready
- the rest of the list stays quiet
- the card can lengthen or shorten without losing context

### 3. Nearby categories / discovery state

- Doc: [Find nearby attractions, restaurants, and services in Maps on iPhone](https://support.apple.com/guide/iphone/find-nearby-attractions-restaurants-services-iphbaf51b2c0/ios)
- Screenshot asset: [nearby categories and guides state](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/5f0b145c5e3c36f4ee6e33789aefb30d.png)

What matters:

- category entry points are fast and obvious
- discovery starts from a shallow sheet
- map remains visible behind discovery

### 4. Route options card

- Doc: [Get driving directions in Maps on iPhone](https://support.apple.com/guide/iphone/get-driving-directions-ipha84a94043/ios)
- Screenshot asset: [route options with ETA chips and Go action](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/e4d4a362894396c2e1c20ad73f9102f3.png)

What matters:

- route choices are visible directly on the map
- the card still owns the decision
- travel mode chips are grouped at the top of the card
- one commit action is obvious

### 5. Expanded directions card

- Doc: [View a route overview or a list of turns in Maps on iPhone](https://support.apple.com/guide/iphone/view-a-route-overview-or-a-list-of-turns-iph1b3553719/ios)
- Screenshot asset: [turn-by-turn details list](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/ea710f8b8695bcec2728fbd4de131953.png)

What matters:

- tapping the card expands detail in place
- the state changes without changing the product shell
- list detail is readable but still subordinate to the map flow

### 6. Place card

- Doc: [Get information about places in Maps on iPhone](https://support.apple.com/guide/iphone/get-information-about-places-iph8c9c2528b/ios)
- Screenshot asset: [place card with status, actions, photos, and metadata](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/cec6d9c2ba4a2345db22551be948b343.png)

What matters:

- the place name anchors the card
- key actions sit high
- trust data sits immediately below the actions
- richer content scrolls later

### 7. Full directions setup card

- Doc: [Get driving directions in Maps on iPhone](https://support.apple.com/guide/iphone/get-driving-directions-ipha84a94043/ios)
- Screenshot asset: [directions setup with destination stack and Go CTA](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/7d6091ee71dee9837c937ef9bc302c9d.png)

What matters:

- destinations and stops are edited in the card
- commit remains low, stable, and obvious
- supporting controls stay compact

### 8. Look Around split surface

- Doc: [Look around places in Maps on iPhone](https://support.apple.com/guide/iphone/look-around-places-iph65703a702/ios)
- Screenshot asset: [Look Around pane over map](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/9f0967edb96bb3e1e3f2fa3f8224822a.png)

What matters:

- Apple can introduce richer media without losing the map
- the media pane is still subordinate to the geographic context
- controls stay sparse

## Translation to iVisit

### Entry

Apple pattern:

- shallow discovery card
- map already alive
- no friction before intent

iVisit translation:

- map loads immediately
- bottom sheet shows location plus intent choices
- no auth, no payment, no hard form

### Ambulance decision

Apple pattern:

- route options on map
- one route emphasized
- card carries the choice and the commit

iVisit translation:

- show candidate hospitals and faint routes
- system recommendation becomes the emphasized route
- the card should show ETA, hospital, and estimated cost before commit

### Bed decision

Apple pattern:

- place card confirms the selected place
- detail expands progressively

iVisit translation:

- hospital selection card should confirm the selected hospital
- use explicit CTA language like `Use this hospital`
- keep alternate hospitals in the secondary sheet state

### Commit phase

Apple pattern:

- the same shell survives deeper detail

iVisit translation:

- identity, triage, and payment should stay sheet-led
- no route break into a separate wizard if the map can remain visible

## iVisit emergency map/sheet architecture checklist

> This section is **product doctrine for iVisit**, informed by Apple’s sheet behavior patterns. It is not a direct Apple quote.

### Core runtime model

The new emergency runtime should be organized around **three live states only**:

- `map state` → spatial truth, camera, route emphasis, hospital focus, geographic context
- `sheet state` → current task phase (`explore`, selection, confirmation, intake, commit)
- `header state` → hidden by default; only becomes active-session chrome after dispatch has actually started

### Locked architectural direction

- **No modal stack** inside the emergency flow.
- **No page-to-page wizard** for the main emergency progression.
- The experience should behave like **one persistent map + one persistent sheet + contextual header activity**.
- The header should no longer behave like a permanent app header; it should stay hidden through explore, selection, and pre-dispatch decisions.
- Once dispatch is truly live, the header may appear as an **expandable/collapsible active-session state** that opens downward and compresses the sheet below it, similar to Apple Maps live-session behavior.
- The sheet should act as the **orchestrator**, starting from `explore` and then leading into several deeper states while reusing the same shell.
- `Profile` is the one intentionally navigation-led state; it can surface key navigation options and does not need to behave like the main expandable/collapsible emergency sheet.

### Transition rule

Every switch between emergency sheet states should still feel like a **modal-quality change** even though it is the same sheet.

That means:

- the same sheet should feel like it **grows from the bottom upward**
- the change should feel **continuous and spatial**, not like a hard UI replacement
- the map should remain present enough to preserve place and orientation

### Documented implementation checklist

Use this as the working checklist for the new flow:

- [ ] Model the emergency runtime around `map state`, `sheet state`, and `header state`
- [ ] Keep the map mounted and visually stable across state changes
- [ ] Treat `explore` as the root sheet phase
- [ ] Reuse the same sheet shell for deeper states instead of spawning separate modal surfaces
- [ ] Avoid page breaks for the core emergency path unless true navigation is required
- [ ] Keep the header hidden during explore and all pre-dispatch decision phases
- [ ] Use the header only for true active emergency states after dispatch has already started
- [ ] Let the active header expand downward and compress/collapse the sheet below it instead of acting like page chrome
- [ ] Route profile access into its own navigation-led state rather than a faux modal state
- [ ] Make each sheet-state transition feel like one surface expanding, settling, or refocusing
- [ ] Keep one dominant action per sheet state
- [ ] Preserve map visibility and orientation cues during every major transition

### Sheet-behavior tuning checklist

The interaction work still needs to stay focused on:

- [ ] detent resistance
- [ ] velocity tuning
- [ ] gesture-vs-scroll handoff
- [ ] header/map chrome yielding
- [ ] stable full-surface drag regions

## iVisit design-system translation (iOS first, token-led)

> This is iVisit product direction derived from the Apple guidance above.

### Token families to standardize globally

Use one shared source of truth for:

- `color tokens` → semantic backgrounds, labels, separators, accent, critical/destructive states
- `material tokens` → glass/chrome surfaces vs content surfaces
- `radius tokens` → concentric corner sizes for chips, controls, cards, sheets, and full-width surfaces
- `spacing tokens` → safe-area-aware padding, toolbar spacing, grouped spacing, and detent content insets
- `icon tokens` → standard symbol sizing, weight, and optical alignment rules
- `motion tokens` → duration, easing, resistance, spring, and gesture thresholds

### Recommended platform rollout

1. **Build iOS first** as the source posture for shape, material, motion, and emphasis.
2. Mirror the same semantic tokens into web via **global CSS variables** and into native components via shared JS/TS token files.
3. Expand to Android and web by applying **platform overrides**, not by inventing a second design language.
4. Keep the product visually recognizable across platforms while letting input behavior adapt where needed.

### Recommended token layering for `MapSheetShell`

To keep the shell easy to implement and reuse, the token system should be layered like this:

- `foundation tokens`
  - app-wide color, typography, spacing, radius, depth
- `motion tokens`
  - spring, easing, resistance, velocity, gesture thresholds
- `UI tokens`
  - chip, card, icon, divider, label hierarchy
- `glass/chrome tokens`
  - blur intensity, backdrop opacity, overlay opacity, shadow softness, active chrome emphasis
- `sheet tokens`
  - detent spacing, shell radius, handle sizing, island margin, content insets
- `platform overrides`
  - iOS default, Android fallback, web wheel/drag adjustments

Principle:

- use a small number of stable token families with clear semantic jobs
- avoid creating many tiny token files with overlapping responsibility
- the goal is a reusable system, not token sprawl

### Practical design-system checklist

- [ ] define one semantic color scale with light, dark, and higher-contrast variants
- [ ] define one shared material/chrome scale for header, sheet, toolbar, chips, and floating controls
- [ ] define concentric radius tokens instead of component-by-component corner guesses
- [ ] keep accent tint reserved for the most important current CTA
- [ ] standardize SF Symbol usage and icon weights for map/header/sheet controls
- [ ] keep toolbars and header chrome visually quieter than the main emergency CTA
- [ ] drive web presentation from the same token contract using global CSS variables
- [ ] keep motion tokens shared across `/map`, welcome, and emergency flows so the app feels like one system
- [ ] keep tokens, constants, copy, and helpers in `*.js` support files instead of letting `*.jsx` render files absorb everything

## Locked rules to borrow from Apple Maps

- Keep one dominant action per sheet state.
- Let the sheet change state before the map changes dramatically.
- Put the most actionable data at the top of the sheet.
- Keep floating map controls minimal.
- Use expansion, not screen replacement, for deeper detail.
- Preserve the user's spatial context at all times.

## Recommended iVisit usage

When designing a new emergency phase, compare it against this order:

1. What stays on the map?
2. What changes in the card?
3. What is the single primary action?
4. What can wait until the card expands?
5. Does the user still understand where they are and what happens next?

## Quick shortlist

If the team only reviews four Apple Maps references, use these:

1. [Base map chrome](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/0fba8fac8abc81e0f8bc4ef2ecb3e9be.png)
2. [Search card](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/286193462a10e8e1801336c12ef16ccc.png)
3. [Route options card](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/e4d4a362894396c2e1c20ad73f9102f3.png)
4. [Place card](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/cec6d9c2ba4a2345db22551be948b343.png)
