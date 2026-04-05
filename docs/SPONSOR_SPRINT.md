# Sponsor Sprint

> Status: Active
> Scope: `ivisit-app`
> Type: Working dossier for live-facing product hardening

## Purpose

This dossier isolates the current sponsor-facing sprint.

It exists to make one thing explicit:

- what the team is fixing now
- why it matters
- what is in scope
- what is not in scope
- what must be true before moving on

This file is a checkpoint document, not a full doctrine file.

Primary doctrine still lives in:

- [rules.json](./rules.json)
- [MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md)
- [WELCOME_SCREEN_DOSSIER.md](./WELCOME_SCREEN_DOSSIER.md)

## Current Goal

Harden the first live-facing patient entry surface so it is production-credible across:

- iOS
- Android
- web PWA at `app.ivisit.ng`

Current screen in focus:

- welcome / first-paint entry state

The current job is not "finish the whole app."

The current job is:

- make the first screen feel trustworthy
- make the first screen responsive across real device classes
- make the first screen align with the marketing promise
- make the first screen strong enough to stand up to sponsor review

## Sprint Principle

The first screen must not feel like:

- a mockup
- a hero landing page
- a menu
- a dashboard
- a stretched phone card on web

It must feel like:

- immediate entry
- one clear primary action
- calm system confidence
- the same product across native and web

## Locked Entry Model

Current first-paint structure:

- Brand: `iVisit`
- State title: `Get help now`
- Support line: `Connecting you to care nearby.`
- Readiness chip: `Available near you`
- Primary action: `Request Help`
- Secondary action: `Find a hospital bed`
- Quiet fallback: `Sign in`

Rules:

- no marketing-style feature pitch inside the app
- no slide CTA
- no duplicated onboarding hero
- no competing equal-weight actions beyond the two core intents
- no telemedicine or revisits in entry context

## Current Progress

The welcome screen foundation is now in place:

- modular surface routing through [WelcomeScreenOrchestrator.jsx](../components/welcome/WelcomeScreenOrchestrator.jsx)
- shared copy in [welcomeContent.js](../components/welcome/welcomeContent.js)
- shared welcome tokens in [welcomeTheme.js](../constants/welcomeTheme.js)
- standardized breakpoint tokens in [breakpoints.js](../constants/breakpoints.js)
- dedicated Apple, Android, and web surface families
- shared web-surface chrome through [useWelcomeWebSurfaceChrome.js](../components/welcome/hooks/useWelcomeWebSurfaceChrome.js)
- shared wide-web styling through [buildWideWebWelcomeTheme.js](../components/welcome/buildWideWebWelcomeTheme.js)

The current phase is no longer architecture discovery.

The current phase is:

- surface tuning
- accessibility baseline
- validation across implemented bands
- keeping documentation aligned with the real checkpoint

## Why This Sprint Matters

Sponsors do not just evaluate features.

They evaluate:

- product maturity
- system coherence
- trust
- interaction quality
- whether the UI behaves like a real product under pressure

If the first screen feels unresolved, the whole product feels less mature.

## Current Scope

In scope now:

- welcome / first-paint screen
- responsive surface behavior across implemented Apple, Android, and web bands
- welcome tokens, geometry, spacing, and action hierarchy
- accessibility and keyboard/focus quality on the entry surface
- deterministic web preview and review behavior
- ongoing sync with the marketing page `How it works` preview after the app screen is locked

Not in scope right now:

- redesigning the whole visual system
- emergency screen redesign
- full auth flow redesign
- provider console
- telemedicine or revisits
- broad navigation cleanup outside first paint

## Device Classes

This sprint must explicitly work across:

- small phone
- medium phone
- tablet portrait
- tablet landscape
- desktop
- large monitor
- reduced-height viewport
- fold-like narrow/short scenarios

Rule:

- no single scaled layout
- responsive behavior must be intentional per class

## Current Technical Focus

The welcome screen is being hardened through:

- modular view routing
- shared copy and action definitions
- shared breakpoint tokens
- shared welcome theme tokens
- shared web-surface root handling
- reduced duplication in wide-web styling

Pipeline rule:

- local exported review builds must not reuse stale service-worker state on `localhost`

## Acceptance Criteria

Before this sprint can be considered complete, the welcome screen must satisfy all of the following:

1. The first visible action is clear within 2 seconds.
2. The screen feels like app entry, not marketing.
3. The screen fills mobile web correctly.
4. The screen does not collapse into a framed phone-shell on tablet or desktop.
5. The primary and secondary actions remain obvious across breakpoints.
6. Reduced-height viewports still keep action visible early.
7. Live Expo web and exported web are both reliable for review.
8. The marketing preview can be synchronized from this screen without drift.

## Working Method

This sprint follows a strict sequence:

1. Fix the real live render.
2. Validate on device classes.
3. Fix the exported review pipeline.
4. Re-check screenshots.
5. Tighten accessibility and interaction quality.
6. Only then move to the next screen.

No rushing.

No multi-screen drift.

One screen at a time.

## Current Risks

Known risks during this sprint:

- web can still drift if each band is tuned independently without shared tokens
- desktop can look underfilled if large surfaces inherit tablet posture
- native and web can drift if copy or action ordering changes in only one place
- tracked repo noise can hide what this sprint is actually changing

## Sponsor Review Framing

When reviewed during this sprint, the correct framing is:

- this is a live hardening checkpoint
- the team is intentionally locking first paint before moving deeper
- the goal is product credibility, not decorative redesign
- web, iOS, and Android are being treated as one patient product surface

## Exit Condition

This sprint ends only when the welcome screen is stable enough that the next screen can inherit from it instead of compensating for it.

That means:

- structure is locked
- cross-device behavior is believable
- live web review is reliable
- accessibility baseline is in place
- the screen reflects the product's real voice

Only after that should work move forward to:

- signup
- login
- first post-auth state
