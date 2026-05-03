# Search Stack Comparison Audit (2026-04-29)

Status: Pre-pass comparison baseline

## Scope

Audit `/(user)/(stacks)/search` against the current stack-screen references:

- `Payment`
- `Emergency Contacts`
- `Profile`
- `Settings`
- `Medical Profile`
- `Insurance`

## Current Shape

- `app/(user)/(stacks)/search.js` is now route-safe because it mounts `SearchBoundary`, but the route still points at a legacy screen composition.
- `screens/SearchScreen.jsx` is still a route-owned monolith that mixes:
  - header wiring
  - shell and animation
  - search-bar composition
  - specialty filtering
  - results rendering
  - discovery tabs
  - recent-search rendering
- `contexts/SearchContext.jsx` still owns local history plus remote discovery feed loading in one provider.

## Comparison vs Modern Stack Screens

### 1. State Management

Current posture:

- local provider state for `query` and `recentQueries`
- provider-owned server fetches for trending searches and health news
- screen-owned UI/discovery tab state
- no dedicated screen model

Gap vs current doctrine:

- server discovery feeds should move to TanStack Query, not provider-owned effects
- route/screen should stop owning page behavior directly
- ephemeral search-screen UI state should have a named home instead of living inside a leaf component

### 2. UI Quality

Current problems:

- older loud visual language: all-caps labels, very heavy weights, explanatory subtitles, oversized decorative cards
- no wide-screen stack-shell treatment; still effectively a mobile composition stretched across desktop
- route-sized loading states use generic spinners inside discovery tabs
- search results and recent history do not use the quieter grouped blade grammar already established by mini-profile, profile, and settings

### 3. DRY / Modular Shape

Current problems:

- no thin route + orchestrator + stage base + screen model split
- search discovery and results composition are tangled inside one file
- repeated inline animation/layout blocks
- no dedicated content/theme/sidebar-layout files

### 4. Documentation

Current gap:

- `Search` does not yet have a wave-specific pass plan or implementation checkpoint in the stack-screen docs subtree

## Required Outcome For This Wave

- `SearchScreen` becomes composition-only
- provider safety remains intact through `SearchBoundary`
- discovery server feeds move onto Query-backed loading
- search gets a dedicated screen model
- compact and wide layouts follow the shared stack-screen shell contract
- results, discovery, and recent history move closer to the mini-profile / settings blade grammar
- loading states favor structural skeletons over lone activity indicators

## Intentional Non-Goals

This wave does not aim to make `Search` a full five-layer feature.

Expected remaining gap after the wave:

- no Zustand canonical store
- no XState lifecycle machine
- no Search-specific Supabase realtime lane

If those layers remain unnecessary after the UI/screen-model cleanup, the post-pass checkpoint must say so explicitly.
