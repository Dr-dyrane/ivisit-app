# Manual Address Entry — Select/Search Drop States Redesign

**Date:** 2026-05-10
**Status:** PLANNED — ready to implement
**Owner:** `components/map/views/locationIntent/`
**Depends on:** LocationSheet Pass 1–3 complete, `LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md`

---

## Problem

The current manual entry flow is a full-screen stepped wizard: one blank `TextInput` per step, tapped through linearly. This is functional but it violates several guardrails from `IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md`:

- **Issue 3**: step-driven instead of state-driven — the user cannot see where they are in context
- **Issue 7**: no accordion / no one-active-context rule — every step feels identical in weight
- **Issue 8**: no sticky terminal CTA — the primary action is buried inside a card that can scroll
- **Issue 9**: back from any step resets to default instead of to the previous step
- **Issue 12**: no graceful transition between steps — hard swap feels abrupt

The bigger gap: for **city**, **state**, and **country**, a blank `TextInput` is the wrong affordance. These are known sets. Users expect iOS Settings-style grouped selection — scroll/search a known set, tap to confirm, return.

---

## Concept: Select/Search Drop States

Each manual step field gets one of three affordances depending on its data nature:

| Step | Field | Affordance |
|---|---|---|
| 1 | Country or region | **Select + Search** — searchable list, modal drop-state |
| 2 | State / Province | **Select + Search** — searchable list, scoped to chosen country |
| 3 | City | **Search drop** — Mapbox suggestions scoped to country + state |
| 4 | Street address | **Search drop** — Mapbox full address suggestions |
| 5 | Unit / Landmark | **Text input** — free text, optional |
| 6 | Responder note | **Text area** — free text, optional, multiline |

A "drop state" means: the field row expands inline into a focused search/select surface within the same sheet. The surrounding sheet context (header, progress, already-filled steps as compact summaries) stays visible. No modal is pushed. The sheet raises to expanded snap when the drop opens.

---

## Navigation Rules (from guardrails)

Strictly follows `Issue 9 — Navigation stack resets too aggressively`:

```
Manual entry entry point (default body row)
  ↓ tap "Enter manually"
Step 1 — Country (select/search drop)
  ↓ select country → Step 2
Step 2 — State/province (select/search drop, scoped)
  ↓ fill or skip → Step 3
Step 3 — City (search drop, Mapbox scoped)
  ↓ select → Step 4
Step 4 — Street address (search drop, Mapbox full)
  ↓ select → Step 5
Step 5 — Unit/Landmark (text input, optional)
  ↓ Next or Skip → Step 6
Step 6 — Responder note (text area, optional)
  ↓ Review pickup
Candidate decision state (same as search result)
  ↓ Use as pickup / Set Home / Set Work / Save place
```

Back navigation:
- Step N → Back → Step N-1 (preserves draft — never resets)
- Step 1 → Back → default body (preserves nothing, clean state)
- Candidate → Back → Step 6 (returns to review, preserves draft)
- Sheet header back-chevron pops one mode state via `useLocationSheetNavigation` (existing)

---

## Layout Contract

Follows `LOCATION_SHEET_ARCHITECTURE_PLAN.md §Location Sheet Snap Layout Contract` and `APP_WIDE_SURFACE_AUDIT_FOR_LOCATION_2026-05-10.md §Sticky Terminal Actions`:

```
Half snap — active step visible, progress track visible, primary CTA always visible
  Header (← / ✕)
  Progress track (6 segments, filled to current step)
  Completed steps — compact summary rows (read-only, grey)
  Active step — expanded drop or text input
  [Back]  [Next / Skip / Review pickup]  ← sticky, outside scroll body

Expanded snap — drops open here for long lists (country, city)
  Same structure, scroll body has more room for results
  CTA remains docked at bottom of sheet shell
```

Key rule: **CTA is always visible**. It is docked in a footer slot outside `MapStageBodyScroll`. This satisfies Issue 8 directly.

---

## Completed Steps as Compact Summaries

Once the user passes step N, step N renders as a compact locked row above the active step:

```
[🌍] Nigeria                              ✓
[📍] Lagos                                ✓
[🏙] City  ← active step (drop open)
```

Tapping a completed step row reopens it as the active step (returns to that step, preserving draft below). This replaces the need for a multi-step back chain for edits.

This follows Issue 7 (one active context) and Issue 2 (single expanded surface).

---

## Drop State Design (per step)

### Country / State — Select + Search drop

```
Active step card (expanded):
  ─────────────────────────────────────────
  Which country or region?
  [🔍 Search countries...          ]
  ─────────────────────────────────────────
  🇳🇬  Nigeria
  🇺🇸  United States
  🇬🇧  United Kingdom
  🇨🇦  Canada
  … (scrollable, filtered by search)
  ─────────────────────────────────────────
```

- Sheet auto-expands to EXPANDED snap when drop opens
- List is flat-scroll, NOT a modal push
- `SearchResultRow` primitives reused for each country row (existing component)
- Selecting an item fills the step and advances to next step with a spring transition
- Uses existing `CountryPickerModal` data source but renders inline, not as a modal

### City / Street — Search drop (Mapbox)

```
Active step card:
  ─────────────────────────────────────────
  What city?
  [🔍 Enter city...                ]
  ─────────────────────────────────────────
  📍  Lagos, Lagos State, Nigeria
  📍  Lagos de Moreno, Jalisco, Mexico
  📍  Lagos, Portugal
  ─────────────────────────────────────────
```

- Reuses `useAddressSearchController` (already in `MapLocationIntentStageBase`)
- Scopes Mapbox suggestions by `countryCode` (already supported by `mapboxService.suggestAddresses`)
- For step 3 (city): type `"place"` or `"region"` Mapbox filter
- For step 4 (street): type `"address"` or `"poi"` Mapbox filter
- Selecting a suggestion fills the step label AND pre-fills downstream steps from the suggestion components (e.g. selecting a full address in step 4 can auto-fill city + state)
- Sheet stays in EXPANDED snap while drop is active; collapses to HALF on selection

### Unit / Note — Text input (unchanged pattern)

- Same `TextInput` / multiline `TextInput` as current implementation
- Auto-focused on step activation
- No drop state — free text only
- "Optional" badge remains
- Skip CTA replaces Next when field is empty

---

## Auto-Fill Cascade

When a full address suggestion is selected in any step, fill downstream steps silently:

```
User selects "27 Admiralty Way, Lekki Phase 1, Lagos, Nigeria" at Step 4
→ streetAddress = "27 Admiralty Way, Lekki Phase 1"
→ city = "Lagos" (auto-fill Step 3 if empty)
→ stateRegion = "Lagos State" (auto-fill Step 2 if empty)
→ country = "Nigeria" (auto-fill Step 1 if empty)
→ countryCode = "NG"
→ Advance to Step 5 (unit)
```

Rule: auto-fill only fills **empty** fields. Never silently overwrite a field the user already filled.

This is handled in `handlePickSearchResult`-equivalent logic in the manual step controller.

---

## Transition Between Steps

Follows Issue 12 (`MapPhaseTransitionView` or equivalent):

- Step advance: new step card slides in from the right (or fades in if motion is reduced)
- Step back: previous step slides back in from the left
- Completed step collapses to summary row with a micro-spring
- No hard-swap — the surrounding card shell stays mounted

Implementation: wrap step card body in a lightweight `Animated.View` with translate-X spring. Use `useRef` for direction (forward / backward). Do not add a new animation system — reuse the existing `Animated.spring` already used in `LocationChrome`.

---

## Geocode and Candidate Transition

When the user taps "Review pickup" on Step 6:

1. CTA enters `loading` state (spinner, disabled) — inline, not a new surface
2. Geocode runs: Mapbox first → OSM fallback (existing `handleManualConfirm` logic)
3. On success → transition to `PLACE_SELECTED` mode (existing candidate decision state)
4. On failure → stay on Step 4 (street address step) with inline error message
5. Never commit `0,0` coordinates (existing guard)

No blank frame during geocode — the step card stays visible with the CTA in loading state (Issue 12).

---

## State Architecture

### What changes

**`MANUAL_LOCATION_STEPS` in `mapLocationIntent.model.js`** — add `affordance` field:

```js
{ key: "country",       affordance: "select-search", ... }
{ key: "stateRegion",   affordance: "select-search", ... }
{ key: "city",          affordance: "search-drop",   mapboxTypes: ["place","region"], ... }
{ key: "streetAddress", affordance: "search-drop",   mapboxTypes: ["address","poi"],  ... }
{ key: "unit",          affordance: "text",          ... }
{ key: "responderNote", affordance: "textarea",      ... }
```

**`MapLocationIntentStageParts.jsx`** — `isManualStep` branch:

Replace the single flat step card with:

1. `ManualStepCompletedSummaries` — renders completed steps N < current as compact rows
2. `ManualStepActiveField` — renders current step affordance (select-search / search-drop / text / textarea)
3. Sticky footer CTA outside `MapStageBodyScroll`

**`MapLocationIntentStageBase.jsx`** — add:

- `manualDropQuery` state (search string for active drop)
- `manualDropResults` state (suggestions for city/street)
- `handleManualDropSelect(key, value, cascadeFields)` — fills step + cascades
- `handleManualDropQueryChange(query)` — debounced, scoped to active step type

**No new hooks** — extend the existing manual step state in `MapLocationIntentStageBase`. Total new state: 2 `useState` calls.

### What does NOT change

- `LOCATION_INTENT_MODES` — no new mode; manual steps stay inside `MANUAL_STEP`
- `useLocationSheetNavigation` — no changes; back/forward is handled by step index
- `validateManualLocationStep` — no changes; validation logic is correct
- `handleManualConfirm` — no changes; geocode logic is correct
- Candidate decision state — identical to search result candidate; no changes
- `locationAddressService` / `mapboxService` — no new provider adapters

---

## New Component Breakdown

All new components live in `components/map/views/locationIntent/`:

### `ManualStepCompletedSummaries.jsx`
- Props: `{ steps, manualDraft, onEditStep, titleColor, mutedColor, infoSurfaceColor }`
- Renders one compact row per completed step (step index < current)
- Each row: icon + step label + filled value + "✓" or edit chevron
- Tapping a row calls `onEditStep(stepIndex)` — sets `manualStepIndex` back to that step
- Uses existing `SearchResultRow` shape or a simpler variant
- ~60 lines

### `ManualStepActiveField.jsx`
- Props: `{ step, value, query, results, isLoading, onQueryChange, onSelect, onTextChange, isDarkMode, titleColor, mutedColor, infoSurfaceColor }`
- Switches on `step.affordance`:
  - `"select-search"` → inline search bar + flat list of `CountryRow` or `StateRow` items
  - `"search-drop"` → inline search bar + `SearchResultRow` list (Mapbox results)
  - `"text"` → auto-focused `TextInput` (existing)
  - `"textarea"` → auto-focused multiline `TextInput` (existing)
- ~120 lines

### `ManualStepStickyFooter.jsx`
- Props: `{ onBack, onNext, nextLabel, isLoading, isDisabled }`
- Docked below `MapStageBodyScroll` inside `MapLocationIntentStageBase`
- Mirrors existing `manualStepActions` styles but rendered outside scroll body
- Replaces the current `manualStepActions` row inside `MapLocationIntentStageParts`
- ~40 lines

---

## Styles

New style keys to add to `mapLocationIntent.styles.js`:

```js
manualCompletedRow     // compact completed step row
manualCompletedIcon    // 28px icon tile
manualCompletedLabel   // muted step label text
manualCompletedValue   // title-color filled value text
manualDropSearch       // inline search pill (reuses searchPill shape)
manualDropList         // container for drop results
manualDropItem         // single drop result row
manualStickyFooter     // docked CTA bar outside scroll body
```

~40 lines of new styles. Reuses `squircle`, `searchPill`, `rowPressed`, and existing tokens throughout.

---

## Files Changed

| File | Change | Lines delta |
|---|---|---|
| `mapLocationIntent.model.js` | Add `affordance` + `mapboxTypes` to each step | +6 |
| `mapLocationIntent.styles.js` | Add 8 new style keys | +40 |
| `MapLocationIntentStageParts.jsx` | Replace manual step card body with new components; add sticky footer slot | −60 / +20 |
| `MapLocationIntentStageBase.jsx` | Add `manualDropQuery`, `manualDropResults`, `handleManualDropSelect`, `handleManualDropQueryChange` | +40 |
| `ManualStepCompletedSummaries.jsx` | New component | +60 |
| `ManualStepActiveField.jsx` | New component | +120 |
| `ManualStepStickyFooter.jsx` | New component | +40 |

**Total:** ~+260 lines net (existing manual step card body is ~95 lines — net ~+165)

---

## Guardrail Compliance Checklist

| Guardrail | How satisfied |
|---|---|
| One active decision context (Issue 2, 7) | Only one step's drop is open at a time; completed steps are compact |
| State-driven not step-driven (Issue 3) | Steps are mode states of `MANUAL_STEP`; nav stack stays flat |
| Sticky terminal CTA (Issue 8) | `ManualStepStickyFooter` outside scroll body |
| Back preserves state (Issue 9) | `manualStepIndex` decrements; `manualDraft` never reset on Back |
| No blank frames (Issue 12) | Step card stays mounted; CTA enters loading state during geocode |
| No direct pickup mutation on selection (Issue 1 guardrail) | Drop selection fills `manualDraft`, not pickup; only "Review pickup" → geocode → candidate → explicit commit |
| No new modal pushed (LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE) | All drops are inline; `CountryPickerModal` replaced by inline drop |
| Reuse existing components (APP_WIDE_SURFACE_AUDIT) | `SearchResultRow`, `useAddressSearchController`, `mapboxService`, `Animated.spring` |
| LocationSheet sole owner (Pass 3) | No new modal; stays inside `MANUAL_STEP` mode of LocationSheet |
| No new provider adapters | `mapboxService.suggestAddresses` reused with existing `countryCode` scope |

---

## Execution Order

```
Step 1  model.js — add affordance + mapboxTypes fields
Step 2  styles.js — add 8 new style keys
Step 3  ManualStepCompletedSummaries.jsx — new component
Step 4  ManualStepActiveField.jsx — new component (text/textarea affordances only first)
Step 5  ManualStepStickyFooter.jsx — new component
Step 6  MapLocationIntentStageBase.jsx — add drop state + handlers
Step 7  ManualStepActiveField.jsx — add select-search + search-drop affordances
Step 8  MapLocationIntentStageParts.jsx — wire new components, remove old card body
Step 9  Verify: back/forward nav, auto-fill cascade, geocode → candidate, sticky CTA
```

Steps 3–5 are independent and can be built in parallel.
Step 7 depends on Step 6 (needs `handleManualDropSelect`).
Step 8 depends on all prior steps.

---

## Deferred

- **Map pin-adjust** (`PIN_ADJUST` mode) — separate pass, not part of this plan
- **Saved-place management CRUD modal** — separate pass
- **State/province list data** — if a hardcoded list is needed for Step 2 select-search, use ISO 3166-2 data from an existing package or a static JSON. Do not add a new API for this. If no package exists, Step 2 falls back to free `TextInput` (already implemented) until a list is available.

---

## Navigation
← [Location Sheet Architecture Plan](./LOCATION_SHEET_ARCHITECTURE_PLAN.md)
← [Location Address Management Architecture](./LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md)
