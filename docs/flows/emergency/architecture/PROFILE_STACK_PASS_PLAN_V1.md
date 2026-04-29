# Profile Stack Pass Plan V1

Status: Implemented in code, runtime verification pending  
Scope: `ProfileScreen` next-stack pass  
Parent docs:

- [STACK_SCREENS_PASS_V1.md](./STACK_SCREENS_PASS_V1.md)
- [STACK_SURFACE_STANDARDIZATION_V1.md](./STACK_SURFACE_STANDARDIZATION_V1.md)
- [PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md](../../../audit/PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md)
- [PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../../../audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)

## Why Profile Next

`ProfileScreen` is now the clearest remaining stack-owned route that still sits between:

- older mini-profile-era composition
- newer payment/emergency-contacts stack doctrine

It already has meaningful reuse in the action rows, but it does not yet have the shell anatomy, viewport behavior, or side-effect discipline that the newer surfaces now share.

## Pass Goal

Bring `ProfileScreen` up to the same architectural and UI contract as `PaymentScreen` and `EmergencyContactsScreen` without losing the calmer mini-profile identity grammar that already works for the action list.

## Implementation Outcome

The code pass landed this target anatomy:

- thin route file
- `ProfileScreenOrchestrator`
- `ProfileStageBase`
- `useProfileScreenModel`
- `ProfileWideLayout`
- `ProfileContextPane`
- `ProfileIdentityPane`
- `ProfileDeleteAccountModal`
- `profileScreen.content.js`
- `profileScreen.theme.js`

The remaining gap is runtime/device verification, not architecture extraction.

## Target Anatomy

The target shape should be:

- thin route file
- `ProfileScreenOrchestrator`
- `ProfileStageBase`
- `useProfileScreenModel`
- `ProfileWideLayout`
- `ProfileContextPane`
- `ProfileIdentityPane`
- `ProfileActionPane`
- `ProfileDeleteAccountModal`
- `profileScreen.content.js`
- `profileScreen.theme.js`

The route file should become composition only.

## Ownership Split

### Route

Owns:

- import + render orchestrator only

Does not own:

- header registration
- focus sync
- modal visibility
- shell animation
- viewport branching

### Orchestrator

Owns:

- header/FAB wiring
- screen model composition
- choosing compact vs wide shell
- explicit modal mounting

Does not own:

- gradient shell
- scroll shell
- wide-screen geometry math

### Stage Base

Owns:

- shared gradient shell
- motion boot
- tab/header scroll wiring
- stack viewport config
- compact vs sidebar layout shell

### Screen Model

Owns:

- profile edit flow state
- delete-account flow state
- data reads from auth/profile/emergency-contact/medical-profile lanes
- derived identity/action state for the screen

Does not own:

- wide-screen layout decisions
- typography or visual tokens

## Shape Decision

Choose **Pattern B: config-driven composition**.

Reason:

- the content hierarchy should stay mostly stable across compact/tablet/desktop
- the real change is shell posture, not entirely different per-device compositions
- payment and emergency contacts already proved the shared `stackViewportConfig.js` layer is the right base

Profile does not need fourteen bespoke views.

## Wide-Screen Strategy

Use the same lesson established by payment and emergency contacts:

- left island: identity + lightweight profile context
- center panel: grouped profile actions
- right island on XL: context/action panel, not a widened form

The extra width should become useful context, such as:

- readiness snapshot
- insurance / health / contact counts
- identity status and account state
- direct CTA entry points for the most important edit surfaces

Do not widen the personal-info editor modal to absorb this space.

## Modal / Side-Effect Rules

### Personal Information

- keep this as a centered, width-bounded modal
- use shared stack viewport primitives
- no compact-only bottom-sheet fallback in this pass unless product explicitly reopens that decision

### Delete Account

- move off the current ad hoc raw `Modal` styling
- use the same shared modal discipline as the rest of the stack
- pending delete state must explicitly control dismiss semantics

## Data / State Rules

Profile is not a full five-layer migration surface in the same way emergency contacts is, but ownership must still stay explicit.

Expected split:

- Auth / profile server truth remains in its existing canonical hooks/services
- query-backed or service-backed reads remain outside the route
- screen-local modal/editing state moves into a dedicated screen model
- any cross-surface profile-derived selectors should be introduced deliberately instead of re-derived inside the screen

## Preserve From Current Profile

Keep:

- mini-profile shortcut group grammar from `ProfileActionList.jsx`
- identity-first ordering
- progressive disclosure for editing
- existing route destinations for medical profile, insurance, and emergency contacts

Do not preserve:

- route-level shell orchestration
- stretched compact layout on wider screens
- heavy hero typography
- ad hoc raw modal ownership

## Implementation Sequence

### Phase 0: Audit + docs

- keep [PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md](../../../audit/PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md) as baseline
- keep this plan doc as the implementation source
- update index/read-order docs before code moves if new profile-specific docs are added

### Phase 1: Screen anatomy split

Create:

- `components/profile/ProfileScreenOrchestrator.jsx`
- `components/profile/ProfileStageBase.jsx`
- `hooks/profile/useProfileScreenModel.js`

Reduce:

- `screens/ProfileScreen.jsx` to a thin route-level composition root

### Phase 2: Shell extraction

Move out of `ProfileScreen.jsx`:

- header setup
- focus effects
- animation boot
- scroll handling
- viewport shell

These belong in orchestrator + stage base.

### Phase 3: Content split

Refactor the current surface pieces into clearer ownership:

- `ProfileHero.jsx` becomes a narrower identity pane
- `ProfileActionList.jsx` becomes action-pane content
- `ProfileModals.jsx` should split into explicit modal surfaces rather than one catch-all

### Phase 4: Wide-screen shell

Implement:

- left identity/context island
- center grouped action surface
- XL right context island

The right island should follow the same role payment/emergency-contacts now use:

- fill dead space with context
- keep the actual edit task as a centered modal

### Phase 5: Typography and copy normalization

Apply the current stack rules:

- no all-caps header style
- visible type capped at `700`
- hierarchy by size/spacing first
- no explanatory paragraphs unless they unlock a non-obvious action

### Phase 6: Side-effect surface normalization

Update:

- personal info editor
- delete account confirmation

Requirements:

- shared viewport primitives
- centered and width-bounded posture
- explicit loading/dismiss behavior

## Acceptance Criteria

- `screens/ProfileScreen.jsx` becomes thin and shell-free
- profile action rows still use mini-profile grammar
- personal info editor stays centered and bounded
- wide-screen profile gets a real context panel instead of a stretched mobile layout
- delete-account flow uses the shared stack modal discipline
- typography/copy match the calmer utility-surface rules now documented
- runtime behavior remains equivalent for navigation and edit/save/delete flows

## Comparison Contract

When reviewing the finished pass, compare against:

- payment for shell anatomy and wide-screen dead-space handling
- emergency contacts for centered task modal + right context island coexistence
- mini profile for row grammar, tone, and quiet utility-surface voice

## Non-Goals

- no route-path changes
- no profile domain rewrite unrelated to screen ownership
- no new backend migration for this pass
- no reopening mini-profile modal architecture itself
