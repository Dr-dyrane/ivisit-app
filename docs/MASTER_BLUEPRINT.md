# iVisit Master Blueprint

> Version: 2.0
> Status: Locked doctrine
> Scope: `ivisit-app`

## Purpose

This blueprint is the operating doctrine for the patient product in `ivisit-app`.

It exists to keep product, design, engineering, and deployment aligned while iVisit is built screen by screen across:

- iOS
- Android
- web PWA at `app.ivisit.ng`

This file must stay aligned with [rules.json](./rules.json). If the two conflict, `rules.json` wins.

Active screen dossier:

- [WELCOME_SCREEN_DOSSIER.md](./WELCOME_SCREEN_DOSSIER.md)
- [EMERGENCY_SCREEN_DOSSIER.md](./EMERGENCY_SCREEN_DOSSIER.md)
- [EMERGENCY_INTEGRATION_AUDIT.md](./EMERGENCY_INTEGRATION_AUDIT.md)

## Product Truth

iVisit is an emergency response and hospital capacity platform.

The patient product has only two leading actions:

1. Request Ambulance
2. Find Hospital Bed

Everything else supports these actions. Nothing else leads the experience.

The product promise is:

> Get help fast when something feels wrong.

The app must make the user feel:

> We are already helping you.

## Surface Ownership

The product ecosystem is split by responsibility:

- `ivisit` owns marketing, acquisition, legal, and public trust
- `ivisit-app` owns the canonical patient product across native and web
- `ivisit-console` owns provider onboarding, provider operations, and admin workflows

`ivisit-app` is the single source of truth for patient-facing product UI and flow.

The marketing site must not recreate authenticated patient flows.

## Current Phase

Current live-facing checkpoint:

- Welcome is the locked first-paint foundation
- Emergency is the next active hardening checkpoint
- `app.ivisit.ng` is the live product-facing web PWA
- preview hospitals remain allowed until live provider coverage expands
- the detailed welcome target is tracked in [WELCOME_SCREEN_DOSSIER.md](./WELCOME_SCREEN_DOSSIER.md)
- the emergency action target is tracked in [EMERGENCY_SCREEN_DOSSIER.md](./EMERGENCY_SCREEN_DOSSIER.md)

Current working model:

- no git push until screen parity is tighter
- deploy checkpoints to Vercel when a live-facing screen is stable enough to review
- harden one screen at a time

## Experience Doctrine

In urgent situations, users do not explore. They act.

That means:

- the first screen must be understood within 2 seconds
- every screen gets one dominant action
- the system should make safe decisions for the user
- the interface must reduce hesitation, not introduce it

The app must not ask:

> What do you want to do?

The app should assume:

> You need help. We are already helping you.

## Core User Flow

The canonical urgent-care path is:

`Request -> Share -> Track -> Coordinate`

Rules for this flow:

- every step should flow into the next with minimal interruption
- the system should initiate progress wherever possible
- each state change must be visible
- no dead ends or silent transitions
- no feature-first branching before urgent action

## Home and Entry Rules

### Entry

The first app state must not feel like:

- a menu
- a dashboard
- a feature list

It must feel like:

- one clear next step
- or an active helping state

### Home

Only two primary actions may lead:

- Request Ambulance
- Find Hospital Bed

Secondary capabilities may exist only if they do not compete with the urgent action hierarchy.

## Responsive Product Strategy

iVisit must be one shared patient product that adapts by size class, not separate redesigns per platform.

Size classes:

- small phone: `320-390`
- large phone: `391-430`
- tablet: `768-1024`
- desktop web: `1280+`

Build order for every screen:

1. small and large phone
2. tablet
3. desktop web
4. native edge cases on iPhone and Android aspect ratios

Rule:

- mobile-first layout is the baseline
- tablet and desktop may widen and center content
- the mental model must not change across platforms
- web PWA, iOS, and Android must feel like the same product

## UI System

The UI should feel:

- calm
- direct
- premium
- borderless
- low-noise

### Surface Rules

- avoid visible borders when spacing, contrast, and elevation can separate content
- use whitespace and soft depth instead of outline clutter
- remove decorative or theatrical dashboard styling
- never ship visible debug artifacts on live-facing screens

### Interaction Rules

- one primary action per screen
- bottom sheets on mobile for focused continuation flows
- centered dialogs on tablet and desktop where appropriate
- tap targets must remain comfortable on compact phones
- motion should assist orientation, not perform for attention

## Copy Doctrine

Copy must be:

- short
- directive
- human
- calm
- action-oriented

Copy must not be:

- technical
- explanatory unless necessary
- category-led
- hype-driven when trust matters more

Examples:

- use `Open iVisit`, not `Open in Expo`
- use `Find help near you...`, not `Connecting...`
- use `Code sent`, not `Verification pipeline started`

## Live Proof and Preview Policy

The product should show real proof where possible.

That means:

- live UI behavior is better than static screenshots when it reflects real flow
- previews must stay human-readable
- proof must reinforce urgent action, not distract from it

Because live provider coverage is still expanding:

- preview hospitals are allowed
- they must be framed honestly as preview coverage
- they are valid for sponsor review and product demonstration at this stage

What is not allowed:

- fake enterprise metrics
- theatrical system dashboards
- decorative simulation that makes the product feel fictional

## Data and System Model

Core entities:

- `profiles`
- `providers`
- `assets`
- `visits`
- `insurance_policies`

Working doctrine:

- every meaningful interaction becomes or supports a visit
- every visit can continue into follow-up care
- realtime state must reflect backend truth
- data writes must be validated and contract-driven

## Provider and Console Relationship

Providers and admins are critical to the product, but they do not lead the patient app.

Patient app responsibilities:

- urgent patient entry
- live request state
- bed search and booking
- tracking and coordination

Provider and admin responsibilities belong in:

- `ivisit-console`

The patient app may show provider-facing proof only when it supports user trust or sponsor understanding.

## Safety and Compliance

The system must remain honest about emergency limitations.

Non-negotiables:

- not a replacement for 911/112 in life-threatening situations
- privacy handling must match actual data use
- location permission must be justified by dispatch and coordination
- health data handling must remain explicit and role-bound

## Deployment Doctrine

`ivisit-app` serves:

- native app builds
- live web PWA deployment on Vercel

Deployment rules:

- local `.env` files must not be relied on for production deployment
- public and private envs must be clearly separated
- web auth callbacks must be configured in Supabase
- no service-role key should ever be exposed through a public env name

Current public web app:

- `https://app.ivisit.ng`

## Hardening Workflow

The product is hardened one screen at a time.

Current sequence:

1. Welcome and auth entry
2. Emergency surface
3. Emergency bottom sheets and tracking states
4. Visits and secondary tabs
5. Settings and support

A screen is not complete until:

- the main action is obvious
- copy is concise
- layout is stable
- responsive behavior works across target size classes
- native edge cases are reviewed
- the screen can be deployed without visible friction leaks

## Sponsor Review Standard

Sponsor-facing evaluation should see:

- clear product identity
- calm urgent-action UX
- live product proof
- no debug or prototype clutter
- honest preview coverage where live supply is still growing

The sponsor should feel they are seeing a real operating product, not a concept deck in UI form.

## Current Checkpoint Standard

For the current phase, the welcome and auth chain is the public checkpoint for `ivisit-app`.

This means:

- welcome, login, signup, auth sheets, and profile completion must feel polished
- web and native logic must match
- this checkpoint can be deployed to Vercel before the rest of the app reaches the same level

## Locked Internal Doctrine

One-line product doctrine:

> iVisit is a map-first emergency care product where the patient should feel helped immediately, every interaction supports a visit, and every live surface must stay aligned across web and native.

Do not change this blueprint casually.

Update it only when:

- product truth changes
- repository ownership changes
- platform reality changes
- a hard-earned workflow lesson becomes a permanent rule
