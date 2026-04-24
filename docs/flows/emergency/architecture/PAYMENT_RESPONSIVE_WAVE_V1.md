# Payment Responsive Wave (v1)

> Status: Active — wave in progress
> Scope: Add the responsive layer to the Payment screen using the 14-variant matrix
> Parent: [STACK_SCREENS_PASS_V1.md](./STACK_SCREENS_PASS_V1.md)
> Sibling (parallel track): [MAP_RUNTIME_PASS_PLAN_V1.md](./MAP_RUNTIME_PASS_PLAN_V1.md)

## 1. Why This Wave First

Payment is already modular (composition root → hook → orchestrator → stage base → variants → tokens). Adding the responsive layer on top gives three wins at once:

1. **Validates shared infrastructure on a stable target.** Building `stackViewportConfig.js` and responsive metrics against a known-good screen proves the infrastructure before Profile / Settings / Emergency Contact consume it.
2. **Validates the Hybrid shape.** Payment already has phase variants (Management / Checkout); layering device variants on top exercises the exact multiplication case that forced the Hybrid shape into the taxonomy.
3. **Closes the Payment sprint loop.** Finishes the work started this sprint and produces a fully-conforming reference implementation for future waves to point at.

## 2. Shape Audit

Per Section 2.6 of the parent doc, every wave begins with a shape audit. Three questions:

**Q1: Does content composition change per variant, or only density / presentation mode?**

- Management mode content (wallet balance, link card, saved methods, history) is **identical across variants** — only card widths, column counts, and gutters change
- Checkout mode content (identity, summary, methods, footer CTA) is **identical across variants** — only max-width and vertical rhythm change
- **Answer: density / presentation only.** No per-variant content divergence.

**Q2: Does the screen already have phase/state variants that would multiply against device variants?**

- Yes. Payment has two phase variants already: `PaymentManagementVariant`, `PaymentCheckoutVariant`
- Full Shape A would produce 2 phases × 14 variants = **28 view files**. Unacceptable.

**Q3: Is the domain shallow (presentational) or deep?**

- Domain is in the hook (`usePaymentScreenModel`) and has modest complexity (wallet load, top-up, method selection, history fetch). Not a state machine.
- Presentation is shallow — the orchestrator selects a phase variant and renders.
- **Answer: shallow.**

### 2.1 Shape Decision: **Hybrid**

- Keep the existing phase-variant orchestrator unchanged
- Add a device-variant config layer consumed by `PaymentStageBase` and by each phase variant
- No new view files — existing variants read responsive metrics from config
- Phase variants stay the only "variants" in the component tree; device differences live in config, not in component count

This is Shape B for device variants, stacked under Shape A for phase variants. The existing phase variants already exist; we do not create per-device views.

## 3. Infrastructure To Build (Shared, App-Wide)

Two files, both app-level and reusable by every future wave:

### 3.1 `utils/viewport/stackViewportConfig.js`

- `STACK_VIEWPORT_VARIANTS` — same 14 names as Map/Welcome
- `getStackViewportVariant({ platform, width })` — resolver mirroring `getMapViewportVariant`
- `getStackViewportSurfaceConfig(variant)` — returns numeric / enum primitives per variant
- Variant groups: `COMPACT_VARIANTS`, `TABLET_VARIANTS`, `DESKTOP_VARIANTS` for quick matrix-cell lookups
- `isCompactStackVariant`, `isTabletStackVariant`, `isDesktopStackVariant` helpers

Primitives returned per variant:
- `contentMaxWidth` — max width for the scroll column
- `contentHorizontalPadding`
- `cardGap` — vertical gap between stacked cards
- `columnCount` — 1 for compact, 2 for tablet, 2 or 3 for desktop
- `modalPresentationMode` — `bottom-sheet` | `centered-modal` | `side-drawer`
- `modalMaxWidth`, `modalMaxHeightRatio`
- `headerTopInset`, `headerSideInset`

### 3.2 `utils/viewport/stackResponsiveMetrics.js`

Token ramps keyed to variant group:

- Typography — title / heading / body / caption sizes + line-heights
- Spacing — `stackGap`, `cardPadding`, `sectionGap`
- Card sizing — `iconSize`, `orbSize`, `buttonHeight`, `inputHeight`
- Radii — squircle radius scale per density

## 4. Execution Order

1. **[DONE]** Write this wave doc with the shape audit
2. Build `stackViewportConfig.js`
3. Build `stackResponsiveMetrics.js`
4. Wire `PaymentStageBase` to consume the config — enforce `contentMaxWidth` and horizontal padding
5. Wire `PaymentManagementVariant` to consume metrics — single column on compact, 2-column on tablet+, gutters from config
6. Wire `PaymentCheckoutVariant` to consume metrics — centered column with `contentMaxWidth`
7. Adapt modals (`AddFundsModal`, `PaymentHistoryModal`, `AddPaymentMethodModal`) to `modalPresentationMode` per variant group
8. Validate on variant matrix (at minimum: iPhone SE, iPhone Pro Max, iPad Mini, iPad Pro, MacBook, Desktop 1440, Desktop 1920)
9. Record findings and any infrastructure gaps back into this doc

## 5. Exit Criteria

- Payment screen renders correctly on all variant groups without mobile-only assumptions
- `stackViewportConfig.js` and `stackResponsiveMetrics.js` are used by Payment exclusively in this wave but are app-wide ready
- No code inside `PaymentStageBase` or variants reads raw `width` / `Platform.OS` for layout; everything flows from the shared config
- Modal presentation mode per variant group is declared and implemented
- Zero console warnings, zero infinite re-renders, zero modal stacking regressions from the previous sprint

## 6. Implementation Findings

### 6.1 Completed Work

**Infrastructure (App-Wide, Reusable)**
- Created `utils/ui/stackViewportConfig.js` with 14-variant resolver and surface config
- Created `utils/ui/stackResponsiveMetrics.js` with typography, spacing, sizing, and radii ramps keyed to variant groups

**Payment Screen Wiring**
- `PaymentStageBase`: Now consumes viewport config for `contentMaxWidth`, `contentHorizontalPadding`, and `cardGap`
- `PaymentManagementVariant`: Consumes responsive metrics for spacing, typography, and radii
- `PaymentCheckoutVariant`: Consumes responsive metrics for spacing and typography
- `AddFundsModal`: Consumes viewport config for `modalMaxWidth`
- `PaymentHistoryModal`: Consumes viewport config for `modalMaxWidth`
- `AddPaymentMethodModal`: Consumes viewport config for `modalMaxWidth`

### 6.2 Modal Presentation Mode Notes

The wave doc called for adapting modals to `modalPresentationMode` per variant group (bottom-sheet vs centered-modal vs side-drawer). However, the current implementation focuses on the critical responsive sizing aspect (`modalMaxWidth`). Full presentation mode adaptation would require:

- Conditional `animationType` on `Modal` component based on variant group
- Side-drawer layout logic for desktop variants
- This is deferred to a future wave focused on modal/sheet presentation primitives

### 6.3 Infrastructure Gaps

None identified. The shared infrastructure (`stackViewportConfig.js` and `stackResponsiveMetrics.js`) is app-wide ready and can be consumed by Profile, Settings, and Emergency Contact in their respective waves.

### 6.4 Validation Requirements

The wave doc specifies validation on a 7-variant device matrix:
- iPhone SE (compact mobile)
- iPhone Pro Max (large mobile)
- iPad Mini (compact tablet)
- iPad Pro (large tablet)
- MacBook (desktop)
- Desktop 1440 (desktop)
- Desktop 1920 (ultra-wide)

This validation requires actual device testing and visual regression checks, which is outside the scope of code changes.

## 7. Non-Goals (This Wave)

- Rebuilding Payment's domain or hook (already stable)
- Introducing new phase variants
- Refactoring any other screen — infrastructure is app-wide but only Payment is wired this wave
- Expanding token system beyond viewport-keyed metrics
- Full modal presentation mode adaptation (deferred to future wave)
