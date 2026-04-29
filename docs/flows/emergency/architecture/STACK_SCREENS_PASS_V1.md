# Stack Screens Pass Plan (v1)

> Status: Active execution plan
> Scope: Stack-owned screens (Profile, Settings, Medical Profile, Emergency Contact, Payment) plus the MiniProfile window that bridges `/map` to the stack
> Purpose: Bring legacy stack screens into alignment with the modular architecture, doctrine, and visual language established by Map Sheets and Welcome Screen
> Parallel to: [MAP_RUNTIME_PASS_PLAN_V1.md](./MAP_RUNTIME_PASS_PLAN_V1.md)
> Source of truth: global product and UI doctrine lives in [docs/rules.json](../../../rules.json); this document only applies that doctrine to stack-screen passes and exit criteria.

## Relationship to Map Runtime Pass Plan

The Map Runtime Pass Plan owns the `/map` composition and Pass 14 addresses platform inclusiveness and viewport propagation **inside the `/map` runtime**. This document is its **sibling** — it owns the work needed to bring stack-owned legacy screens to the same quality bar without conflating scopes.

- **Map Runtime Pass Plan:** sheet-over-map surfaces, `/map` runtime behavior, map-scoped modals
- **Stack Screens Pass Plan (this doc):** full-canvas stack routes, their composition roots, orchestrators, stage bases, variants, and shared token layers

Both plans share the same doctrine (see Section 2), the same reference implementations (Map Sheets, Welcome Screen), and the same platform inclusiveness requirements.

## 1. Sprint Recap That Triggered This Plan

- Introduced the **MiniProfile link** as a windowed transition between `/map` and the stack architecture, unifying MiniProfile / Profile / Settings into one coherent entry point, replacing the legacy "More" screen
- Refactored **Payment** to the full modular anatomy (composition root → hook → orchestrator → stage base → variants → parts/content/theme tokens), added platform-aware glass tokens, 4-layer liquid glass stack on cards and modals, flattened typography to Apple HIG calm, nested detail-modal fix for reliable stacking
- Refactored **Emergency Contact** to match the same architectural direction

These two screens are the reference implementations for this pass plan.

## 2. Doctrine (Canonical, From This Sprint Forward)

### 2.1 Surface Inclusivity

Every screen ships iOS, Android, and Web parity from day one. Platform branching is allowed only for native affordances (blur, shadow, haptics), never for functionality or information hierarchy.

### 2.2 Layout Behavior — Fourteen-Variant Matrix

The app does not think in three canvases. It thinks in **fourteen named viewport variants**, defined identically across Welcome Screen and Map. This is the canonical taxonomy. Any new screen must consume it — never reinvent it.

**Canonical breakpoint source of truth:** `constants/breakpoints.js`

- `BREAKPOINTS` — `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`, `3xl 1920`, `ultraWide 2560`
- `DEVICE_BREAKPOINTS` — `compactPhone 360`, `largePhone 390`, `androidFold 600`, `androidTablet 840`, `nativeDesktop 1180`, `largeMonitor 1600`
- `WELCOME_WEB_BREAKPOINTS` — derived from `BREAKPOINTS`, used for web variant selection
- `VIEWPORT_BREAKPOINTS` — coarse tablet/desktop split used by `useAuthViewport`

**The 14 variants (platform × size):**

| Platform | Variants                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------- |
| iOS      | `ios_mobile`, `ios_pad`                                                                               |
| Android  | `android_mobile`, `android_fold`, `android_tablet`, `android_chromebook`                              |
| Web      | `web_mobile`, `web_sm_wide`, `web_md`, `macbook`, `web_lg`, `web_xl`, `web_2xl_3xl`, `web_ultra_wide` |

**Selection function:** every screen obtains its variant via a platform-aware resolver that takes `{ platform, width }` and returns one of the 14 names. Welcome uses `getWelcomeVariant`; Map uses `getMapViewportVariant`; future stack screens must provide their own `getXYZViewportVariant` or reuse a shared resolver.

### 2.3 Two Integration Patterns

There are exactly two approved ways to consume the 14-variant matrix. Every screen picks one.

**Pattern A — Per-variant views (Welcome Screen — gold standard)**

- Orchestrator switches on variant and renders a dedicated view component per variant
- Each view owns its own layout, spacing, and hero composition for that device class
- Shared parts (cards, CTAs, typography tokens) flow through props
- Benefits: pixel-level control per device; no conditional spaghetti inside any one view
- Reference: `components/welcome/WelcomeScreenOrchestrator.jsx` + `components/welcome/views/Welcome<Variant>View.jsx`

**Pattern B — Config-driven composition (Map — partial, still maturing)**

- Orchestrator resolves variant, then reads a per-variant surface config (`getMapViewportSurfaceConfig(variant)`) that returns numeric/enum layout primitives: sidebar width, modal presentation mode, corner radii, map control insets, overlay header placement
- A single composition consumes the config and branches on primitives (`isSidebarMapVariant`, `presentationMode`, `shellWidth`, etc.)
- Benefits: less surface proliferation; suits surfaces that are structurally similar across variants and differ mostly in dimensions
- Reference: `components/map/core/mapViewportConfig.js` + `components/map/views/shared/useMapStageSurfaceLayout.js`
- **Partiality note:** Map still falls back to mobile composition for `android_fold`, `web_sm_wide`, and some smaller variants where a purpose-built layout would be stronger. Future work: promote Map toward per-variant views where config primitives are not enough.

**Decision rule:**

- Choose **Pattern A** when variants require meaningfully different information hierarchy, hero composition, or interaction model
- Choose **Pattern B** when variants share structure and differ only in numeric dimensions or presentation mode

Stack screens in this pass default to **Pattern A** unless a specific surface is provably config-equivalent across variants.

### 2.4 Modal & Sheet Decision Matrix

Every modal/sheet declares its presentation mode per variant group, not per abstract canvas.

| Surface class  | Compact variants (`*_mobile`, `android_fold`) | Tablet variants (`ios_pad`, `android_tablet`, `android_chromebook`, `web_md`) | Desktop variants (`macbook`, `web_lg`, `web_xl`, `web_2xl_3xl`, `web_ultra_wide`) |
| -------------- | --------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Quick action   | Bottom sheet                                  | Centered modal or left drawer                                                 | Side sheet (right) or centered modal                                              |
| Context detail | Bottom sheet or full-height modal             | Centered modal                                                                | Side sheet or landscape modal                                                     |
| Full task      | Full-screen modal                             | Landscape modal with max-width                                                | Full-canvas modal with max-width                                                  |
| Navigation     | Bottom sheet                                  | Left drawer                                                                   | Persistent left rail / sidebar                                                    |

Every screen must declare, per surface, which row of this matrix it occupies and which variant group maps to which cell. Ambiguity here is a doctrine violation.

### 2.5 Side-Effect Discipline

- Stable callbacks (`useCallback` with correct deps)
- Memoized refs for mutable state that should not trigger renders
- Controlled effects — never depend on object identity that refreshes per render
- No race conditions between async loads
- No UI desync across sheet / modal / map layers
- Hooks own domain state; orchestrators only select variants; stage bases only own motion

### 2.6 Modular Implementation Style — Two Real Shapes

The anatomy differs by integration pattern. Both shapes share the same invariants (thin route, composition root, hook, orchestrator, shared tokens, separated content/theme), but the layout surface differs:

**Shape A — Welcome Screen (gold standard for Pattern A)**

```
app/(auth)/welcome.js                               # thin route wrapper
screens/WelcomeScreen.jsx                           # composition root
hooks/ui/useAuthViewport.js                         # shared viewport hook (width, insets, tokens)
components/welcome/
├── WelcomeScreenOrchestrator.jsx                   # getWelcomeVariant + 14-way switch
├── welcomeContent.js                               # copy
├── buildWideWebWelcomeTheme.js                     # desktop theme builder
├── hooks/useWelcomeWebSurfaceChrome.js             # web-specific chrome hook
├── shared/
│   ├── WelcomeStageBase.jsx                        # shared stage primitive
│   └── WelcomeAmbientGlows.jsx                     # shared decoration
├── views/
│   ├── WelcomeIOSMobileView.jsx
│   ├── WelcomeIOSPadView.jsx
│   ├── WelcomeAndroidMobileView.jsx
│   ├── WelcomeAndroidFoldView.jsx
│   ├── WelcomeAndroidTabletView.jsx
│   ├── WelcomeAndroidChromebookView.jsx
│   ├── WelcomeWebMobileView.jsx
│   ├── WelcomeWebSmWideView.jsx
│   ├── WelcomeWebMdView.jsx
│   ├── WelcomeMacbookView.jsx
│   ├── WelcomeWebLgView.jsx
│   ├── WelcomeWebXlView.jsx
│   ├── WelcomeWeb2Xl3XlView.jsx
│   └── WelcomeWebUltraWideView.jsx                 # one view per variant (14 total)
├── welcomeMobile.styles.js
├── welcomePad.styles.js
├── welcomeAndroidMobile.styles.js
├── welcomeAndroidFold.styles.js
├── welcomeAndroidTablet.styles.js
├── welcomeAndroidChromebook.styles.js
├── welcomeMacbook.styles.js
├── welcomeWebMobile.styles.js
├── welcomeWebSmWide.styles.js
├── welcomeWebMd.styles.js
├── welcomeWebLg.styles.js
├── welcomeWebXl.styles.js
├── welcomeWeb2Xl3Xl.styles.js
└── welcomeWebUltraWide.styles.js                   # one styles file per variant
```

Key principles:

- One view per variant, one styles file per variant — no conditional layout branching inside any view
- Shared primitives live in `shared/`
- Variant-invariant logic (theme, content, hooks) lives at the top level
- Orchestrator is a pure variant switch with no layout knowledge

**Shape B — Map Sheets (gold standard for Pattern B, deeper domain)**

```
app/(user)/map.js                                   # thin route wrapper
screens/MapScreen.jsx                               # composition root, consumes viewport + flow
hooks/useMapExploreFlow.js                          # domain hook (state + side effects)
components/map/
├── MapSheetOrchestrator.jsx                        # re-export shim
├── core/
│   ├── MapSheetOrchestrator.jsx                    # real orchestrator (phase + variant)
│   ├── mapViewportConfig.js                        # 14-variant resolver + per-variant surface config
│   ├── mapFlowContracts.js                         # state machine contracts
│   ├── mapActiveRequestModel.js                    # domain model
│   ├── mapActiveSessionPresentation.js             # presentation adapter
│   ├── mapMetricPresentation.js
│   ├── mapOverlayHeaderLayout.js
│   ├── mapRequestPresentation.js
│   ├── mapSheet.constants.js                       # snap states, heights
│   ├── mapSheetFlowPayloads.js
│   └── useMapSheetDetents.js                       # snap / detent logic
├── tokens/
│   ├── mapGlassTokens.js                           # 4-layer glass token factory
│   ├── mapMotionTokens.js                          # per-platform spring / easing tokens
│   ├── mapRenderTokens.js
│   ├── mapSheetTokens.js
│   └── mapUI.tokens.js
├── shared/
│   └── (shared primitives)
├── surfaces/                                       # sheet + modal surface primitives
│   ├── MapModalShell.jsx
│   ├── MapExploreLoadingOverlay.jsx
│   └── ...                                         # 28 surface files
├── views/                                          # deeply decomposed feature views (112 files)
│   └── <feature>/<feature>View.jsx
├── chrome/                                         # headers, map controls
├── history/                                        # history modal + parts
├── MapSheetShell.jsx                               # stage base (sheet shell)
├── useMapSheetShell.js                             # stage base hook
├── mapSheetShell.gestures.js                       # pan gestures
├── mapSheetShell.helpers.js
└── mapSheetShell.styles.js
```

Key principles:

- `core/` owns flow contracts, domain models, presentations, and the viewport resolver
- `tokens/` owns every visual / motion primitive
- `surfaces/` owns sheet and modal shells
- `views/` is deeply nested by feature — one subtree per domain area (explore, tracking, auth, etc.)
- `chrome/` and `history/` are feature-scoped siblings
- One composition reads per-variant config; variants differ in dimensions, not in view identity

**Which shape applies to a stack screen:**

| Screen characteristic                                                              | Shape                                                                                  |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Content is mostly presentational and layout varies meaningfully per variant        | **Shape A**                                                                            |
| Domain is deep (state machines, multiple flows) and layout is mostly config-driven | **Shape B**                                                                            |
| Mix of deep domain + variant-specific layout                                       | Hybrid: Shape B skeleton with `views/<variant>/` subtrees for variant-specific renders |

**Shape selection is per-screen, decided at that screen's wave kickoff.** No blanket default is applied here — premature commitment would either force-fit Shape A onto screens with identical content across variants (wasting 14 nearly-duplicate view files) or force-fit Shape B onto screens whose layouts genuinely diverge per device (collapsing meaningful differences into config primitives). Each wave starts with a brief shape audit that answers three questions:

1. Does content composition change per variant, or only density / presentation mode?
2. Does the screen already have phase/state variants (like Payment's management vs checkout) that would multiply against device variants?
3. Is the domain shallow (presentational) or deep (state machines, flows)?

The audit outcome is recorded in the screen's own pass doc and reviewed before any code moves.

Deviations from these shapes, once a shape is chosen, require explicit doctrine exception in review.

## 3. Scope

### 3.1 Current Pass — Four Stack Screens

Target screens, in execution order for this pass:

1. **Profile** — stack route, smallest architectural delta
   Implemented in code on 2026-04-29. Follow-up checkpoint: [PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../../../audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
   Detailed pass record: [PROFILE_STACK_PASS_PLAN_V1.md](./PROFILE_STACK_PASS_PLAN_V1.md)
2. **Settings** — stack route, sectioned list patterns
3. **Emergency Contact** — re-audit for full doctrine compliance
4. **Payment** — re-audit for the responsive layer (viewport config + metrics)

### 3.2 Eventual Scope — Every Screen In The App

These four screens are the **first wave**, not the final list. The doctrine in Section 2 applies to **every screen in the app**, and every screen will be brought into compliance over subsequent passes.

Future waves (non-binding order, subject to prioritization):

- Auth flows (login, signup, OTP, password reset)
- Onboarding / consent screens
- Visits list + visit details
- Hospital profile and hospital browse
- Notifications center
- Wallet / payment history deep dives
- Support / help / legal surfaces
- Any remaining legacy "more" or utility screens

No screen is permanently exempt. Any screen that ships after this pass must conform on day one (see Section 7). Existing screens outside this pass remain in their current form until their own wave begins, but no new feature work may land on them in a non-conforming way — all new work uses the doctrine.

**Migration principle:** no screen is rewritten until its wave. No screen escapes the doctrine once its wave lands. No doctrine drift between waves.

### 3.3 Shared Infrastructure Built During This Pass

Infrastructure introduced here is app-wide, not screen-specific — it outlives this pass and serves every future wave:

- `components/<domain>/tokens/<screen>GlassTokens.js` per screen (mirror `mapGlassTokens.js`)
- A shared `stackViewportConfig.js` that mirrors `mapViewportConfig.js` for full-canvas stack screens (14-variant resolver + per-variant surface config)
- A shared responsive metrics helper for typography, spacing, and card sizing keyed to the 14-variant matrix
- Variant-group helpers (compact / tablet / desktop) for quick matrix-cell lookups in surfaces

## 4. Per-Screen Pass Requirements

### 4.0 Four-Track Pass Contract

Every subsequent stack-screen pass must address these four tracks explicitly:

- **State management** â€” the pass must audit the feature's state ownership and either improve it or document the exact remaining gap against the five-layer doctrine
- **UI quality** â€” the pass must bring the screen closer to the current stack language (mobile clarity, wide-screen behavior, calmer copy, typography discipline, modal discipline)
- **DRY / modular code** â€” the pass must reduce repetition and move the screen toward the shared anatomy instead of adding more route-owned one-offs
- **Documentation** â€” the pass must land pre-pass intent and post-pass checkpoint updates in the same wave

No future stack pass should be treated as a styling-only pass unless the docs explicitly justify why state and modularity are intentionally unchanged.
Under UI quality, loading-state doctrine is explicit: favor skeletons for route, list, card, and form-shell loading states; reserve activity indicators for compact inline pending feedback only.

### 4.1 Surface & Layout Pass

- Responsive across all 14 viewport variants using the shared viewport config
- Android and Web visual parity (visual + functional)
- Zero mobile-only assumptions in layout, spacing, or typography
- Every surface declares its cell in the Modal & Sheet Decision Matrix, mapped to variant groups (compact / tablet / desktop)

### 4.2 Interaction & Side-Effect Pass

- Every sheet ↔ modal ↔ side-sheet transition deterministic
- Landscape modal escalation documented per surface
- No untracked side effects in `useFocusEffect`, `useEffect`, or listeners
- No unmounted map/sheet conflicts during navigation

### 4.3 UI Consistency Pass

- All card styles, color tokens, spacing, typography, and motion curves consumed from shared token files
- No inline magic numbers, no one-off styles
- 4-layer liquid glass stack on blurred surfaces (host → underlay (Android) → blur (iOS) → backdrop → overlay)
- Squircle discipline: `borderCurve: "continuous"` alongside every `borderRadius`
- Icon wrapper orbs: `borderRadius = size / 2`, `iconSize = size * 0.43`
- Loading surfaces preview structure with skeletons wherever the user is waiting on a route-sized or layout-bearing surface
- Spinners and activity indicators are limited to small inline actions, button pending states, and lightweight accessory refresh cues

## 5. Exit Criteria (Per Screen)

A screen is done when all of the following are true:

- Composition root, hook, orchestrator, stage base, variant(s), and parts/content/theme tokens all present
- State management posture is documented: either improved in the pass or explicitly called out as deferred against the five-layer doctrine
- UI surface is aligned with the current stack-screen language, not merely functional
- Repetition reduced enough that the screen is moving toward the shared anatomy instead of away from it
- Visual regression pass on seven device widths: **375, 430, 744, 1024, 1280, 1440, 1920**
- Zero console warnings
- Zero infinite-loop re-renders
- Zero modal stacking bugs
- Documentation sync for this screen merged in the same PR

## 6. Documentation Updates Required By This Pass

| Doc               | Update                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `docs/DESIGN.md`  | Doctrine sections 2.1 – 2.5, layout & modal/sheet decision matrices, modular implementation anatomy |
| `docs/SYSTEMS.md` | Side-effect stabilization playbook, screen lifecycle contract, modular architecture diagram         |
| `README.md`       | Architecture overview pointing to seven-file anatomy and reference screens                          |
| `CONTRIBUTING.md` | Rules for creating new screens — require the full anatomy before merge                              |

Updates must land atomically at the end of the pass, not as a trailing follow-up.

## 7. Future Screen Contract

Any new stack-owned screen added after this pass must:

1. Ship as thin route wrapper → composition root
2. Own state in a dedicated hook/controller
3. Use an orchestrator to choose variant (phase or device)
4. Use a stage base that owns shell / snap / motion / slots
5. Use variant files that only pass config and theme
6. Keep parts, content, config, and theme in separate files
7. Consume shared glass tokens and squircle helper
8. Consume the 14-variant viewport matrix via its own `get<Screen>ViewportVariant` resolver, or a shared resolver, sourced from `constants/breakpoints.js`
9. Pick and declare one of the two integration patterns (per-variant views, or config-driven composition) with reasoning
10. Declare a Modal & Sheet Decision Matrix cell per surface, mapped to variant groups (compact / tablet / desktop)
11. Pass the full visual regression matrix before merge — at minimum one device per variant group, plus both gold-standard references (Welcome Screen compositions and Map sidebar vs sheet transitions)

## 8. Reference Implementations

- **Welcome Screen — gold standard for responsive layout.** Per-variant view components for all 14 viewport variants, clean orchestrator switch, shared parts via props. This is the canonical reference for Pattern A (per-variant views).
- **Map Sheets — gold standard for shell / snap / motion and 4-layer liquid glass stack.** Canonical reference for stage base, sheet gesture, glass tokens, and squircle discipline. **Partial** as a responsive reference: uses the same 14-variant taxonomy and produces per-variant surface configs, but some compact variants (`android_fold`, `web_sm_wide`) still fall through to mobile composition. Canonical for Pattern B (config-driven composition).
- **Payment Screen (this sprint) — canonical full modular anatomy.** Orchestrator + stage base + variants + tokens + typography discipline + nested-modal stacking. **Does not yet consume the 14-variant matrix** — the responsive layer is scheduled for this pass plan.

Any deviation from these three requires explicit doctrine exception in review.

## 9. Execution Order

1. Lock doctrine in docs (DESIGN.md, SYSTEMS.md, README.md, CONTRIBUTING.md) so the contract is fixed before code moves
2. Profile — smallest delta, validates orchestrator extraction end-to-end
3. Settings — medium delta, validates variant pattern for sectioned lists
4. Emergency Contact — re-audit for full doctrine compliance
5. Payment — re-audit for the responsive layer (viewport config + metrics)
6. Shared infrastructure hardening (`stackViewportConfig.js`, responsive metrics)
7. Visual regression pass across all seven device widths for all four screens

## 10. Success Metric

This plan is succeeding if:

- Each completed screen makes the next screen smaller and clearer to refactor
- Shared infrastructure (tokens, viewport config, metrics) grows by extraction, not by duplication
- The seven-file anatomy becomes the default cognitive shape every contributor reaches for

It is failing if:

- New stack screens ship outside the anatomy before it is codified in docs
- Responsive rules are reimplemented per screen instead of consumed from shared config
- Platform branching leaks back into functionality instead of staying at the affordance layer

## 11. Carry-Forward Lessons

Apply these directly to the remaining stack-owned pages before inventing anything new:

- **Bootstrap once, consume everywhere.** If a feature needs hydration, migration, or realtime startup, mount that work at the runtime shell. Screens and controllers should read selectors, not call a data hook only for side effects.
- **Five-layer ownership must stay explicit.** Server truth, query cache, persisted store, lifecycle legality, and ephemeral UI state each need a named home. Do not collapse back into `hook + service + local useState`.
- **Phone-valid and route-valid selectors beat ad hoc filtering.** Cross-surface consumers should read canonical selectors for concepts like “reachable,” “primary,” “active,” or “ready,” not re-derive them inside screens.
- **Wide-screen dead space becomes context, not a wider form.** Keep editing modals centered and bounded; when XL layouts expose extra canvas, fill it with a right context island or action panel instead of stretching the modal.
- **Utility stack copy stays short and actionable.** One clear task title, one useful hint only when necessary, and no repeated explanatory paragraphs across header, body, and footer.
- **Hierarchy comes from size and spacing before weight.** Patient-app utility surfaces should cap visible type at `700`, avoid all-caps headers, and reserve identity-style caps for logo-mark labels only.
- **Side-effect surfaces must use shared viewport primitives.** Modal width, height, and posture should come from shared stack surface config so `Profile`, `Settings`, `Medical Profile`, `Insurance`, and `Help & Support` do not each reinvent their own responsive shell.
- **Blocking saves need explicit pending behavior.** Backdrop-dismiss, close buttons, and destructive exits must be intentional during async save states, never accidental.
- **Fallback modes must stay truthful.** If backend schema or sync is unavailable, surface a local-only or degraded-state notice and keep the feature usable instead of failing hard.
- **Documentation lands in the same pass as code.** Record pre-pass intent, post-pass verification, and the reusable lesson set while the implementation context is still fresh.
- **Mini-profile row grammar can survive a shell refactor.** `Profile` proved that the quiet shortcut-group language can stay intact while the route, wide layout, and modal ownership move to the shared stack-screen anatomy.

## 12. Settings Wave

`Settings` is now in the same modern stack-screen family as `Profile`.

Current docs:

- [../../../audit/SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md](../../../audit/SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md)
- [SETTINGS_STACK_PASS_PLAN_V1.md](./SETTINGS_STACK_PASS_PLAN_V1.md)
- [../../../audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../../../audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)

## 13. Medical Profile Wave

`Medical Profile` is now in the same modern stack-screen family as `Profile` and `Settings`.

Current docs:

- [../../../audit/MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md](../../../audit/MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md)
- [MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md](./MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md)
- [../../../audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../../../audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
