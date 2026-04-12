# iOS PWA / Safari Viewport Notes

> Status: Active reference
> Last updated: 2026-04-12
> Scope: iPhone Safari and installed iOS web-app behavior for `welcome` and `/map`

## Problem Frame

On iPhone Safari, browser chrome changes the visible viewport during normal use:

- bottom toolbar expands and collapses
- address bar height changes
- keyboard reduces visible height
- standalone launch and browser launch do not share the same viewport behavior

For iVisit, that creates two concrete risks:

- welcome CTAs can look vertically unstable or get pushed into the browser zone
- `/map` controls and sheets can feel clipped or too low because they were sized against the large viewport instead of the visible one

## iVisit POV

We are not solving this with a generic full-app shell rewrite.

We already have two mature runtime surfaces:

- `welcome`
- `/map`

So the correct iVisit implementation is:

### 1. One shared web viewport truth

Use one shared hook that reads `window.visualViewport` on web and exposes:

- visible width / visible height
- layout width / layout height
- browser top / bottom insets
- iOS browser vs standalone state
- whether browser chrome is currently constraining the surface

This is the source of truth for Safari browser-height behavior.

### 2. Welcome treats short browser height as a layout mode

Welcome should not fight the browser.

When iPhone Safari reduces visible height:

- existing short-height welcome variants should engage earlier
- the hero should compress before clipping
- the CTA block should dock in a protected bottom zone
- the CTA zone should respect the browser bottom inset
- iOS browser users may see a small optional install hint on welcome only
- that hint should open a progressive half-sheet, not a generic centered help modal

This turns Safari browser mode into a product posture, not a bug state.

### 2a. Installation guidance should feel like product guidance

The install guide should match iVisit surface language:

- present as a bottom-anchored half-sheet
- use short step copy, not explanatory paragraphs
- reveal one instruction at a time
- use recognizable Safari-style icons instead of dense text
- move with the same calm sheet motion language users see elsewhere in the product

The goal is to make Add to Home Screen feel like a deliberate part of the onboarding posture, not like browser troubleshooting.

On Android web, we do not need the same guidance flow. If the browser exposes a native install prompt, the welcome hint should attach a direct `Install app` action instead of opening steps.

The hint should also use a soft persistence rule:

- dismissing it should suppress it for a few days
- explicit install engagement should suppress it longer
- it should not reappear on every reload for repeat users

### 3. Map keeps the map immersive and protects only chrome

The map itself can stay full-bleed.

The surfaces that must react to Safari browser chrome are:

- floating map controls
- bottom sheet and task modals
- search / location sheets

For iVisit, that means:

- control offsets use browser top / bottom inset data
- sheet and modal height budgets use visible viewport height, not the large viewport
- bottom-hosted map surfaces sit above the browser toolbar instead of behind it

## Current iVisit Implementation Rule

For `welcome` and `/map`:

- do not trust plain `100vh`-style assumptions on iPhone Safari
- prefer dynamic visible-height calculations
- treat browser inset handling as a shared runtime concern
- keep install as optional education, not a dependency
- keep browser mode fully functional without requiring Add to Home Screen

## Rollout Checklist

- [x] Add a shared `visualViewport`-aware hook for web runtime metrics
- [x] Enable `viewport-fit=cover` in the exported web HTML postprocess step
- [x] Feed those metrics into `useAuthViewport`
- [x] Use the visible viewport in welcome stage sizing
- [x] Protect docked welcome actions from Safari bottom toolbar overlap
- [x] Add a small iOS browser install hint on welcome only
- [x] Attach a proper in-app installation guide to the iOS hint
- [x] Use a progressive bottom-sheet install guide instead of a centered help modal
- [x] Use the native install prompt directly on Android web when available
- [x] Use browser inset offsets for `/map` controls
- [x] Use visible-height budgets for map modal/search surfaces

## Files Touched By This Policy

- `hooks/ui/useWebViewportMetrics.js`
- `hooks/ui/useAuthViewport.js`
- `scripts/postprocess_web_export.js`
- `components/welcome/views/WelcomeStageBase.jsx`
- `components/welcome/welcomeWebMobile.styles.js`
- `components/web/IOSInstallHintCard.jsx`
- `components/web/IOSInstallGuideModal.jsx`
- `components/web/iosInstallGuide.styles.js`
- `components/map/MapModalShell.jsx`
- `components/emergency/intake/EmergencyLocationSearchSheet.jsx`
- `screens/MapScreen.jsx`
