# iVisit UX Issue Mapping And Location Guardrails

**Date:** 2026-05-10
**Status:** UX architecture notes, not an implementation pass
**Owner surfaces:** emergency map flow, location management, mini profile, auth/OTP CTA surfaces

---

## Executive Summary

Recent UX review feedback points to one repeating product problem:

> Multiple decision layers are competing for attention inside the same visual surface.

This creates unclear progression, weak action hierarchy, cognitive overload, navigation instability, and uncertainty during high-stress flows.

The corrective direction is:

- state-driven progressive disclosure
- scoped information ownership
- one active decision context per surface
- persistent flow continuity
- explicit CTA readiness states

Location management must follow these rules from the beginning so it does not inherit the same failure pattern.

---

## 2026-05-11 Current App-State Addendum

Recent LocationSheet and manual-address implementation passes added working behavior, but also created a new audit requirement.

Current location UI state:

- Manual subphases now own the sheet header instead of relying on body-level progress widgets.
- Search inputs no longer repeat completed-summary context inside the placeholder.
- Manual helper copy has been reduced.
- Typed fallback now exists for search-drop fields so weak provider results do not trap the user.
- Sticky footer behavior exists for manual step actions.

UX risks that must be audited:

- The fallback row can still become visually noisy if provider results and typed fallback compete.
- Manual entry has more steps after adding LGA/area, so each step must feel lightweight.
- Candidate decision, save category, save details, and saved manage states must each own the sheet header.
- Loading states must preserve the shell and avoid blank white transitions.
- Expanded sheets must never hide terminal CTAs under scroll.
- Wide web sidebar mode must preserve the same hierarchy and action ownership as mobile.

Implementation risks that can become UX regressions:

- `MapLocationIntentStageBase.jsx` and `MapLocationIntentStageParts.jsx` are now large enough to hide flow divergence.
- Search and LocationSheet may duplicate row/result logic if not audited.
- Manual, saved-place, and recents flows can duplicate address identity if ownership is unclear.

Deep audit companion:

- [`../../audit/map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md`](../../audit/map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md)

---

## Issue 1 - Triage Questions Auto-Selected By Default

Observed issue:

- A breathing difficulty question appeared with an option already selected.

Architectural problem:

- The system assumed medical intent before the user interacted.

User impact:

- Reduces trust.
- Weakens consent.
- Makes medical input feel pre-decided.

Resolution:

- No default-selected triage answers.
- Options start neutral.
- CTA stays disabled until user actively selects.
- `Skip` remains an explicit bypass action.

Location guardrail:

- No location candidate should become pickup just because it was highlighted, searched, or previewed.
- Search, manual, saved, recent, and pin selections must require explicit commit CTAs.

---

## Issue 2 - Room Details Compete With Other Cards

Observed issue:

- Selected room details were visually interrupted by neighboring room cards.

Architectural problem:

- Selected room context, alternative rooms, metadata, and explanations were rendered as equal expanded surfaces.

Resolution:

- Use single expanded card architecture.
- Selected item expands inline.
- Non-selected options remain compact.
- Supporting metadata moves outside the decision cluster.

Location guardrail:

- Candidate decision uses one address group and one CTA group.
- Saved place management, save category, manual review, and search results must not all remain expanded at the same time.

---

## Issue 3 - Hospital, Room, And Transport Flows Are Mixed Together

Observed issue:

- Users were evaluating hospital, room, transport, routing, and pricing at the same time.

Architectural problem:

- The flow is screen-driven instead of state-driven.

Resolution:

- True step progression:
  - Select Hospital
  - Select Room
  - Select Transportation
  - Payment And Dispatch
- Preserve completed selections as compact summaries.
- Expose only controls relevant to the current step.

Location guardrail:

- LocationSheet modes must stay scoped:
  - search state searches
  - candidate state decides
  - save category chooses category
  - save details edits metadata
  - pickup commit exits the loop intentionally
- Wide sidebar layout must not change state semantics.

---

## Issue 4 - Hospital Badges Lack Meaning And Visibility

Observed issue:

- `Verified`, `Level 2`, and `Standard` appeared without enough meaning.

Architectural problem:

- Metadata exists without educational hierarchy.

Resolution:

- Introduce capability taxonomy.
- Position badges below more decision-critical signals such as rating, wait time, ETA, and distance.

Location guardrail:

- Address metadata must be meaningful, not decorative.
- Confidence, source, freshness, and quality only render when they help the decision.
- High-confidence address state stays quiet.
- Medium or low confidence explains what the user can do next.

---

## Issue 5 - Mixed Context Inside Hospital Cards

Observed issue:

- Hospital cards mixed entity-specific data with ecosystem-wide totals.

Architectural problem:

- The card lacked data ownership boundaries.

Resolution:

- Hospital cards should contain hospital-specific information only.
- Network totals belong in discovery or compare surfaces.

Location guardrail:

- Saved address rows represent one saved address.
- Candidate address group represents one candidate.
- Recents do not render saved-place management metadata.
- Current device location does not claim saved address identity.
- Saved address identity does not imply active pickup truth.

---

## Issue 6 - Transportation Screen Has Weak Hierarchy

Observed issue:

- Transportation selection, education, hospital detail, and route summary competed on one surface.

Resolution:

- Title should match the task, such as `Select Transportation Option`.
- Top: progress and selected hospital summary.
- Middle: transportation options only.
- Bottom: active option explanation.

Location guardrail:

- Location state copy must match the task:
  - `Search address or place`
  - `Use as pickup`
  - `Find nearby hospitals`
  - `Set as Home`
  - `Update Work`
  - `Save place`
- Do not mix pickup copy with saved-address copy.

---

## Issue 7 - Transportation Details Truncated Across Cards

Observed issue:

- Expanded details overlapped or visually collided with neighboring transport cards.

Resolution:

- Use accordion expansion.
- One active transport option expands.
- Other options collapse.

Location guardrail:

- Manual entry, save details, saved-place management, and candidate decision should follow the same one-active-context rule.
- Optional note, unit, and responder note details should be progressive, not always expanded everywhere.

---

## Issue 8 - Missing Clear Payment Progression

Observed issue:

- Users could not identify how to proceed to payment.
- In expanded sheet states, progression CTAs could fall beneath scroll content, making users unsure that scrolling was required to continue.

Architectural problem:

- Critical progression actions blended into informational UI.
- The scroll body owned the decisive action, so longer content could hide the next step.

Resolution:

- Use persistent bottom CTA when a step has a terminal action.
- It should remain visible after valid selection.
- It should not be replaced by ETA chips or contextual buttons.
- If the body scrolls, the terminal CTA belongs in a sticky footer outside the scroll body.
- Expanded states may add browsing depth, but cannot bury the current decision CTA.

Location guardrail:

- Core LocationSheet CTAs must not require expansion.
- In mid-snap and expanded states, the user must be able to finish the current location task.
- Candidate decision must show a clear primary action for the current context.
- Candidate, save, manual review, and manage-saved-place states should use a sticky footer for terminal actions when their body content can scroll.

---

## Issue 9 - Navigation Stack Resets Too Aggressively

Observed issue:

- Back navigation returned users too far backward and lost selection context.

Architectural problem:

- Navigation was route-driven instead of flow-state-driven.

Resolution:

- Preserve active step, selections, expanded card, and scroll position where appropriate.
- Back restores the previous decision state, not the beginning of the journey.

Location guardrail:

- LocationSheet has one stack owner.
- Header Back pops one state.
- Close returns to the nearest stable parent.
- Search result back returns to search results when possible.
- Save details back returns to category.
- Category back returns to candidate.
- Candidate back returns to its source.

---

## Additional Issue 10 - OTP CTA Timing In Emergency Commit

Observed issue:

- During the emergency commit OTP step, the OTP API may be waiting until after CTA animation intent is already visually underway.

Architectural problem:

- The interaction may spend animation time without doing useful network work.

Proposed resolution:

- On confirmed CTA press, trigger the OTP request immediately.
- Run CTA feedback/transition animation in parallel with the OTP request.
- Reduce animation duration so feedback feels fast rather than ceremonial.
- The goal is for the OTP email/message to be closer to ready by the time the user reaches the OTP entry state.

Guardrail:

- Primary CTA animation should acknowledge intent immediately, but never delay the actual side effect when the side effect is safe to start.
- CTA states should be explicit:
  - idle
  - pressed
  - requesting
  - ready for OTP
  - failed/retry

Location relevance:

- Location save and pickup commit actions should follow the same rule.
- Press feedback starts immediately, but validation/geocode/save/commit work should begin as soon as the action is accepted.

---

## Additional Issue 11 - Mini Profile Needs Address Entry Point

Observed issue:

- Mini profile CTA groups should include an address/location management entry point.

Proposed resolution:

- Add an address CTA to the mini profile action group.
- The CTA should redirect to LocationSheet, not a separate modal.
- The entry should preserve source metadata so LocationSheet can return gracefully.

Location implementation note:

- This belongs in the location passes after the LocationSheet decision tree is stable.
- Mini profile should open the same LocationSheet owner, not create another saved-address surface.

---

## Additional Issue 12 - Blank Frames And Ungraceful Sheet Transitions

Observed issue:

- Some page changes show blank white frames.
- Web sheet phase changes can feel delayed before the next surface appears.
- Mobile sheet swaps can feel glitchy or uncontrolled rather than like one graceful surface refocusing.

Architectural problem:

- Loading and transition states are not always owned by the route/sheet phase.
- Some surfaces wait for the next data/render state before showing a believable intermediate layout.
- Sheet phase changes can hard-swap content instead of using the existing phase-transition language.

Proposed resolution:

- Every important route and sheet phase needs an explicit transition contract:
  - previous stable state
  - pending/transitioning state
  - skeleton or preserved-shell state
  - ready state
  - recover/failed state
- Use skeletons or preserved shell placeholders instead of blank white surfaces.
- Preserve the surrounding sheet/map shell during phase changes.
- Use shared transition wrappers such as `MapPhaseTransitionView` or an equivalent stage-level animation.
- Keep transitions short, calm, and functional; do not let animation delay accepted side effects.

Location relevance:

- LocationSheet mode changes should feel like one sheet refocusing:
  - default -> search
  - search -> candidate
  - candidate -> save category
  - save category -> details
  - manual step -> candidate
- Search loading should show result-shaped loading rows.
- Manual geocoding should preserve the manual review surface with inline progress.
- Save/update/remove should preserve the address group and show CTA pending state.
- No location mode should briefly render an empty white body while data or layout catches up.

---

## Cross-Feature Guardrails For Future Location Work

Location management must not repeat the issues above.

Rules:

- One active decision context at a time.
- No silent defaults for meaningful user decisions.
- No entity cards with mixed ownership data.
- No critical CTA hidden below required expansion.
- No route reset when a local state back action is expected.
- No direct UI mutation of saved address identity.
- No pickup commit without explicit user intent.
- No profile address overwrite without explicit user action.
- No hidden close-only behavior for modals or nested states.
- No provider API calls directly from render components.
- No blank route or sheet phase during loading or transition.
- No hard-swap sheet body when a graceful phase transition or skeleton can preserve context.

Done when:

- Location search, manual entry, saved places, recents, and mini profile entry all route through the same LocationSheet state model.
- Every decision step has a clear owner, clear primary action, clear back path, and no competing expanded decision surface.
