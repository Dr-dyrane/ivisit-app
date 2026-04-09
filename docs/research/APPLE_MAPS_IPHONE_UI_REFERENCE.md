# Apple Maps iPhone UI Reference

> Status: Active reference
> Last updated: 2026-04-08
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
- header = orientation only

## Official source pack

### 1. Base map chrome

- Doc: [Set your location and map view in Maps on iPhone](https://support.apple.com/guide/iphone/set-your-location-and-map-view-iph10d7bdf26/444)
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

- Doc: [Find nearby attractions, restaurants, and services in Maps on iPhone](https://support.apple.com/en-ng/guide/iphone/iphbaf51b2c0/ios)
- Screenshot asset: [nearby categories and guides state](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/5f0b145c5e3c36f4ee6e33789aefb30d.png)

What matters:

- category entry points are fast and obvious
- discovery starts from a shallow sheet
- map remains visible behind discovery

### 4. Route options card

- Doc: [Get driving directions in Maps on iPhone](https://support.apple.com/en-lamr/guide/iphone/ipha84a94043/ios)
- Screenshot asset: [route options with ETA chips and Go action](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/e4d4a362894396c2e1c20ad73f9102f3.png)

What matters:

- route choices are visible directly on the map
- the card still owns the decision
- travel mode chips are grouped at the top of the card
- one commit action is obvious

### 5. Expanded directions card

- Doc: [View a route overview or a list of turns in Maps on iPhone](https://support.apple.com/en-lamr/guide/iphone/iph1b3553719/ios)
- Screenshot asset: [turn-by-turn details list](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/ea710f8b8695bcec2728fbd4de131953.png)

What matters:

- tapping the card expands detail in place
- the state changes without changing the product shell
- list detail is readable but still subordinate to the map flow

### 6. Place card

- Doc: [Get information about places in Maps on iPhone](https://support.apple.com/en-mide/guide/iphone/iph8c9c2528b/ios)
- Screenshot asset: [place card with status, actions, photos, and metadata](https://help.apple.com/assets/698A7AD229958FFB710D1B08/698A7AD58D2FBCE53F04F687/en_US/cec6d9c2ba4a2345db22551be948b343.png)

What matters:

- the place name anchors the card
- key actions sit high
- trust data sits immediately below the actions
- richer content scrolls later

### 7. Full directions setup card

- Doc: [Get driving directions in Maps on iPhone](https://support.apple.com/en-lamr/guide/iphone/ipha84a94043/ios)
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
