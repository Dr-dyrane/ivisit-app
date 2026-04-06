# Welcome Screen Dossier

> Status: Active
> Scope: `ivisit-app`
> Screen: first-paint entry / current live-facing focus

## Purpose

This dossier exists to keep the team aligned on the current welcome screen.

It is the detailed working brief for the first screen in the patient app.

It should answer:

- what this screen is supposed to do
- what it is not supposed to do
- what the current structure is
- what is still wrong
- what "done" looks like

This file is intentionally screen-specific.

Related references:

- [SPONSOR_SPRINT.md](./SPONSOR_SPRINT.md)
- [MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md)
- [rules.json](./rules.json)

## Screen Role

This screen is not a marketing page.

This screen is not onboarding.

This screen is not a menu.

This screen is not a feature list.

This screen is the app's first actionable state.

It should feel like:

- immediate entry
- calm urgency
- one obvious next step
- the product is already helping

## Product Goal

The first screen must make the user feel:

> I am in the product now.

It must not make the user feel:

- I am reading another landing page
- I need to learn the app first
- I have too many choices
- I am looking at a mockup
- this is only designed for one device size

## Current Locked Model

Current intended structure:

- Brand: `iVisit`
- Title: `Get help now`
- Support line: active reassurance, not onboarding language
- Primary action: `Request Help`
- Secondary action: `Find a hospital bed`
- Quiet fallback: `Sign in`

This is the current locked decision model.

## Why This Structure Exists

The app has two leading patient intents:

1. urgent help / ambulance
2. hospital bed booking without ambulance

The welcome screen must allow both.

But it must still preserve urgency hierarchy.

That means:

- `Request Help` leads
- `Find a hospital bed` is available but secondary
- `Sign in` is quiet
- the secondary action must be visibly quieter than the primary action

Everything else stays off the first screen.

## Element Purpose Map

Every visible element on the welcome screen must have a job.

- brand mark:
  trust, orientation, and product identity
- hero image:
  immediate emergency context and domain recognition
- headline:
  human trigger for urgent action
- support line:
  system motion and reassurance
- readiness chip:
  optional trust signal only when the surface has enough room to support it
- primary CTA:
  starts the urgent path
- secondary CTA:
  supports the bed-only path without flattening the hierarchy
- sign in:
  return-user fallback, never a competing primary action
- theme toggle:
  utility only, visually quieter than the decision path
- ambient geometry:
  atmosphere and depth only, never layout structure or informational content
  it should bleed into the welcome background as soft ambient light, not read as a visible solid circle

## What Must Not Appear Here

Do not place these on the welcome screen:

- telemedicine
- revisits
- profile management
- settings
- feature explanations
- product cards
- multi-step onboarding
- dashboard summaries
- provider-facing language
- decorative mockup framing
- slide-to-start interaction

## Design Direction

The welcome screen should follow the app's real visual voice.

That means:

- it can evolve visually
- it does not need to match the marketing page exactly
- it must still remain aligned in tone and action logic

Design characteristics:

- calm
- direct
- low-noise
- borderless
- strong type hierarchy
- soft depth
- red used with restraint

Typography rule:

- headlines can stay bold
- helper and support lines should default to regular weight so they do not compete with the headline
- quiet tertiary text such as `Sign in` should stay softer than the main CTA hierarchy, including in font weight

The goal is not "minimal for its own sake."

The goal is:

- premium
- mature
- responsive
- believable as a live medical product

The screen should communicate readiness, not instruction.

That means supporting language should feel active, such as:

- ready to connect you to help
- finding help near you
- connecting you to nearby care

and not like tutorial copy.

## Current Implementation State

Current implementation lives in:

- [WelcomeScreen.jsx](../screens/WelcomeScreen.jsx)
- [WelcomeScreenOrchestrator.jsx](../components/welcome/WelcomeScreenOrchestrator.jsx)
- [welcomeContent.js](../components/welcome/welcomeContent.js)
- [EntryActionButton.jsx](../components/entry/EntryActionButton.jsx)
- [useAuthViewport.js](../hooks/ui/useAuthViewport.js)
- [WebAppShell.jsx](../components/web/WebAppShell.jsx)
- [app/(auth)/_layout.js](../app/(auth)/_layout.js)

Current variant implementation:

- Apple:
  - [WelcomeIOSMobileView.jsx](../components/welcome/views/WelcomeIOSMobileView.jsx)
  - [WelcomeIOSPadView.jsx](../components/welcome/views/WelcomeIOSPadView.jsx)
  - [WelcomeMacbookView.jsx](../components/welcome/views/WelcomeMacbookView.jsx)
- Android:
  - [WelcomeAndroidMobileView.jsx](../components/welcome/views/WelcomeAndroidMobileView.jsx)
  - [WelcomeAndroidFoldView.jsx](../components/welcome/views/WelcomeAndroidFoldView.jsx)
  - [WelcomeAndroidTabletView.jsx](../components/welcome/views/WelcomeAndroidTabletView.jsx)
  - [WelcomeAndroidChromebookView.jsx](../components/welcome/views/WelcomeAndroidChromebookView.jsx)
- Web:
  - [WelcomeWebMobileView.jsx](../components/welcome/views/WelcomeWebMobileView.jsx)
  - [WelcomeWebSmWideView.jsx](../components/welcome/views/WelcomeWebSmWideView.jsx)
  - [WelcomeWebMdView.jsx](../components/welcome/views/WelcomeWebMdView.jsx)
  - [WelcomeWebLgView.jsx](../components/welcome/views/WelcomeWebLgView.jsx)
  - [WelcomeWebXlView.jsx](../components/welcome/views/WelcomeWebXlView.jsx)
  - [WelcomeWeb2Xl3XlView.jsx](../components/welcome/views/WelcomeWeb2Xl3XlView.jsx)
  - [WelcomeWebUltraWideView.jsx](../components/welcome/views/WelcomeWebUltraWideView.jsx)

Current collocated style modules:

- [welcomeMobile.styles.js](../components/welcome/welcomeMobile.styles.js)
- [welcomePad.styles.js](../components/welcome/welcomePad.styles.js)
- [welcomeMacbook.styles.js](../components/welcome/welcomeMacbook.styles.js)
- [welcomeAndroidMobile.styles.js](../components/welcome/welcomeAndroidMobile.styles.js)
- [welcomeAndroidFold.styles.js](../components/welcome/welcomeAndroidFold.styles.js)
- [welcomeAndroidTablet.styles.js](../components/welcome/welcomeAndroidTablet.styles.js)
- [welcomeAndroidChromebook.styles.js](../components/welcome/welcomeAndroidChromebook.styles.js)
- [welcomeWebMobile.styles.js](../components/welcome/welcomeWebMobile.styles.js)
- [welcomeWebSmWide.styles.js](../components/welcome/welcomeWebSmWide.styles.js)
- [welcomeWebMd.styles.js](../components/welcome/welcomeWebMd.styles.js)
- [welcomeWebLg.styles.js](../components/welcome/welcomeWebLg.styles.js)
- [welcomeWebXl.styles.js](../components/welcome/welcomeWebXl.styles.js)
- [welcomeWeb2Xl3Xl.styles.js](../components/welcome/welcomeWeb2Xl3Xl.styles.js)
- [welcomeWebUltraWide.styles.js](../components/welcome/welcomeWebUltraWide.styles.js)

Current improvements already made:

- removed the old slide CTA
- kept the core hero visual language but refocused it around emergency entry
- reduced the screen to two real intents plus sign-in
- cleaned auth root behavior so Android no longer falsely falls into login
- removed the framed auth shell from the welcome route
- removed the visible white shell background from the full-bleed welcome route
- removed the fake centered `max-width` container from the welcome route on web
- improved local export reliability by preventing stale localhost service-worker interference
- moved the screen to a modular orchestrator/view/style architecture
- completed the Android variant family at the architecture level
- completed the web surface family from `web-mobile` through `web-ultra-wide`
- standardized web breakpoints through shared breakpoint tokens
- moved welcome geometry into shared tokens instead of per-view guesswork
- replaced plain solid ambient circles with a shared radial-glow implementation so the background reads as atmosphere instead of geometry
- added a shared web-surface chrome hook for document/root theme control
- reduced wide-web style duplication through a shared style builder

## Current Progress Snapshot

The welcome screen is now in a different phase than when this dossier started.

Architecture that is now in place:

- modular surface routing
- single-source welcome copy
- shared breakpoint tokens
- shared welcome background, spacing, and geometry tokens
- dedicated Apple, Android, and web surface families
- dedicated web bands from `sm` through ultra-wide

What remains is not architecture invention.

What remains is:

- variant-by-variant tuning
- accessibility hardening
- state evolution beyond the static idle entry
- validation against real device classes

## Current Problems Still Open

The screen is structurally better, but not finished.

Known remaining issues:

1. Surface tuning is still incomplete.
   The architecture is now correct, but each variant still needs spacing and posture refinement by real device class.

2. Accessibility baseline is not fully locked yet.
   The screen still needs a deliberate keyboard, focus, text-scaling, and reduced-motion pass.

3. The screen must be validated against real device classes, not just code assumptions.

4. Web and native must continue to match in action order and tone.

5. The marketing preview must mirror the app screen after the app version is truly locked, not before.

6. The screen is still too static.
   Entry should be able to evolve into live system state when appropriate.

## Current Surface Map

Current implemented family:

- Apple:
  - iPhone
  - iPad
  - MacBook
- Android:
  - phone
  - fold
  - tablet
  - Chromebook
- Web:
  - mobile
  - sm-wide
  - md
  - lg
  - xl
  - 2xl / 3xl
  - ultra-wide

Current next focus:

- tuning and validation across implemented web bands
- CTA accessibility hardening
- state-aware entry progression

Rule:

- no one-layout-scaled-up behavior
- no platform drift in product logic
- variant-specific spacing and posture live in the variant style module, not in the route screen

Current web breakpoint token map:

- `sm = 640`
- `md = 768`
- `lg = 1024`
- `xl = 1280`
- `2xl = 1536`
- `3xl = 1920`
- `ultra-wide = 2560`

Current web routing:

- `< 640` -> `web-mobile`
- `640-767` -> `web-sm-wide`
- `768-1023` -> `web-md`
- `1024-1279` -> `web-lg`
- `1280-1535` -> `web-xl`
- `1536-2559` -> `web-2xl-3xl`
- `2560+` -> `web-ultra-wide`

## Device Requirements

This screen must be explicitly validated for:

- small phone
- medium phone
- large phone
- tablet portrait
- tablet landscape
- desktop
- large monitor
- reduced-height viewport
- fold-like narrow/short layout

Rules:

- mobile first
- action above the fold first
- no jammed vertical stacks
- no stretched desktop emptiness
- no fake phone card framing on web
- no one-layout-scaled-up behavior
- desktop must feel deliberate, anchored, and spatially balanced

## Behavioral Rules

The screen must:

- render fast
- show the primary action immediately
- allow the secondary intent without competing visually
- keep `Sign in` available but quiet
- avoid dead-end feel
- show some sense of system readiness or active availability when possible

If auth is required later, it should happen after intent, not before intent.

Secondary action rule:

- lower contrast than the primary action
- lower visual weight than the primary action
- lower positional priority than the primary action

State evolution rule:

This screen should not remain purely static forever.

It should be able to evolve into clear entry states such as:

- idle -> `Get help now`
- in progress -> `Finding help...`
- resume state -> `Resume request`

The screen is still one surface, but it should be able to reflect live product state.

## Copy Rules

Allowed style:

- short
- direct
- calm
- action-first

Current approved copy:

- `Get help now`
- `Connecting you to care nearby.`
- `Available near you`
- `Request Help`
- `Find a hospital bed`
- `Sign in`

Support line direction:

- active
- reassuring
- non-explanatory
- system-in-motion

Preferred direction:

- `Connecting you to care nearby.`
- `We'll connect you to help nearby.`
- `Ready to connect you to help.`

The support line should not sound like onboarding instruction.

Typography note:

- the welcome family now uses lighter helper/support weights across iPhone, Android, tablet, desktop, and web
- this is intentional and should not be reverted casually
- if support copy starts competing with the headline again, the hierarchy has drifted

Language system rule:

- do not repeat the same word across headline, support line, and CTA if the meaning can evolve cleanly
- the welcome screen should follow `emotion -> system action -> user action`
- example:
  - `Get help now`
  - `Connecting you to care nearby.`
  - `Request Help`

Copy that should not return:

- marketing-style feature explanation
- "Get help fast when something feels wrong" inside the app first screen
- "We help you find help"
- feature bullets
- long reassurance paragraphs

## Relationship To Marketing

The app and marketing page must align, but not duplicate.

Marketing should:

- explain
- reassure
- hand off

The app should:

- act
- guide
- continue

The welcome screen should feel like the next logical step after marketing, not a repeat of it.

Marketing sync rule:

The marketing page `How it works` preview must be updated as the app welcome UI evolves.

The preview should continue to reflect the live app's current first-paint logic, including:

- action order
- copy direction
- hierarchy
- overall interaction truth

Marketing `How it works` language should continue to support:

- `Request`
- `Share`
- `Track`
- `Coordinate`

## Current Review Standard

This screen passes only if all of the following are true:

1. The user understands the screen in under 2 seconds.
2. The primary action is obvious.
3. The secondary action is available but not disruptive.
4. Sign in is easy to find without competing.
5. The screen looks intentional on mobile.
6. The screen does not look underfilled or awkward on desktop.
7. Web and native feel like the same product.
8. The screen is strong enough to be shown during sponsor evaluation.
9. The screen communicates readiness, not just layout cleanliness.
10. The marketing preview can be synced without reinterpretation.

## Working Method

This screen should be improved using this sequence:

1. Fix the live Expo web render.
2. Validate phone layouts.
3. Validate short-height layouts.
4. Validate tablet.
5. Validate desktop.
6. Re-check native assumptions.
7. Only then sync the marketing preview.

No multi-screen drift.

No new feature introduction.

No moving on to the next screen before this one is stable.

## Exit Condition

This welcome screen is done only when:

- the structure no longer changes
- the visual direction feels like the real app
- the screen behaves correctly across device classes
- the first-paint experience is sponsor-ready
- the next screens can inherit its logic and tone without compensating for confusion
