# Modal To Sheet Refinement Tracker (v1)

> Status: Active audit and remediation tracker
> Scope: `/map`
> Purpose: capture the post-migration gaps between the current sheet implementation and the intended unified Apple Maps-like sheet system

Related references:

- [MAP_SHEET_PARITY_TASKLIST_V1.md](./MAP_SHEET_PARITY_TASKLIST_V1.md)
- [MODAL_TO_SHEET_SWAP_V1.md](./MODAL_TO_SHEET_SWAP_V1.md)
- [../EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](../EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
- [../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md](../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)

## 0. Current Diagnosis

The modal-to-sheet migration is directionally correct, but the implementation is no longer behaviorally unified.

Today:

- `explore_intent` owns the most mature sheet interaction model
- `search`, `hospital_list`, and `hospital_detail` each drift from that model in different ways
- wide-screen sidebar behavior is only partially consistent
- the hospital detail surface has visual polish work, but motion, header anchoring, and cross-platform media rendering are still inconsistent

The result is a sheet family that looks related, but does not yet behave like one system.

## 1. Locked Product Goal

The target is still:

- one persistent map
- one persistent sheet shell
- one explicit sheet phase
- one shared detent model
- one shared glass/material language

This must hold across:

- iOS native
- Android native
- web mobile / PWA
- wider sidebar presentations

## 2. Issue Tracker

## MTS-01 Scroll detent parity is broken outside `explore_intent`

Observed:

- `explore_intent` supports scroll-driven `collapsed -> half -> expanded`
- `hospital_detail` does not support the same mature downward collapse and upward grow behavior
- `hospital_list` also lacks the same detent parity
- `search` currently behaves like a special-case expanded surface instead of a real sibling in the same system

Impact:

- motion language feels inconsistent
- users lose the learned mental model from the main intent sheet
- details mode feels modal again instead of sheet-native

Root cause:

- the detent scroll contract lives inside `MapExploreIntentStageBase.jsx`
- that contract was not generalized into shared sheet-stage utilities

## MTS-02 Close affordances are not shell-anchored

Observed:

- the hospital detail close button lives inside scrolling content
- the hospital list close button also lives inside scrolling content
- the close button moves away with scroll instead of remaining persistently available

Impact:

- worse reachability
- worse perceived control
- breaks Apple Maps-like place sheet behavior

Root cause:

- close/header affordances are rendered by phase body content instead of a shell-owned or phase-header-owned slot

## MTS-03 Hospital detail header hierarchy is too tall for the phase

Observed:

- hospital detail still carries unnecessary eyebrow/subheading hierarchy
- the half-state should emphasize the hospital itself, not a stacked marketing header

Impact:

- weaker glanceability
- steals height from the default mid state
- competes with the primary CTA row

Target:

- hospital name only as the dominant header
- supporting metadata moves lower and quieter

## MTS-04 Wide-screen sidebar parity is incomplete

Observed:

- some larger-screen phases do not fully respect the left/top/bottom island margin system
- some sheet content can visually overgrow the available Y axis
- current sidebar behavior does not yet read as the same disciplined floating island used by the explore phase

Impact:

- premium layout breaks on wider screens
- left panel feels bolted on instead of intentional

Root cause:

- shell sizing is partly correct
- phase content height, internal scrolling, and header anchoring are not consistently normalized for sidebar presentation

## MTS-05 Hospital rail media on web is unreliable

Observed:

- hospital detail service rails do not consistently render web media cleanly
- current image fitting depends on ad-hoc scaling and cropping behavior
- ambulance imagery is especially poor on web

Impact:

- cards look broken or low-trust on web
- native and web diverge visually

Likely causes:

- local asset handling is not fully normalized for RN web
- image fit strategy is not per-surface disciplined
- centering and crop rules are not explicitly encoded

## MTS-06 Shared sheet growth choreography is too abrupt

Observed:

- sheet phase changes jump between states
- `explore_intent` still has better detent behavior than the other phases, but it still lacks a more deliberate grow/reveal choreography between resting, mid, and expanded states
- hospital detail does not yet have a progressive reveal model
- the current collapsed row, half state, and expanded state do not feel like one continuous surface

Impact:

- reduced spatial continuity
- detail mode feels stitched together rather than designed

Target:

- half is the true default where appropriate
- `explore_intent` and `hospital_detail` should both feel like they grow from the same living surface
- expand should feel like revealing more of the same place
- collapse should feel like compressing the same place, not swapping layouts

## MTS-07 Search phase parity is incomplete

Observed:

- `search` is not behaving like the same canonical family as `explore_intent`
- current behavior is still too close to an expanded search modal in sheet clothing
- collapsed resting search parity is not yet fully preserved

Impact:

- weakens the "one shell, many phases" principle

## MTS-08 Hospital list phase parity is incomplete

Observed:

- `hospital_list` is in the shell, but it still behaves like a simple scroll surface
- it has not fully inherited the same detent, anchor, and width discipline as the explore system

Impact:

- phase transition quality drops once users leave the main intent sheet

## MTS-09 Hospital detail top composition is still content-owned

Observed:

- handle, close, image, and header layers are not yet orchestrated as one top composition
- some of the current polish relies on content overlap tricks rather than a stable stage contract

Impact:

- fragile layout
- regressions are easy when adjusting hero, close affordance, or glass overlap

## MTS-10 Liquid-glass language is not yet unified across phases or platforms

Observed:

- the shell already has a glass base
- individual phases still apply their own partial material rules
- iOS gets the strongest blur treatment, while Android/web rely more heavily on flat overlays

Impact:

- the system does not yet feel like one deliberate material language
- "liquid glass" remains cosmetic instead of architectural

Target:

- one cross-phase glass recipe
- platform-aware implementation differences
- same perceived material behavior across iOS, Android, and web

## MTS-11 Horizontal hospital browsing inside detail is missing

Observed:

- once inside `hospital_detail`, users must leave the phase to inspect another hospital

Target:

- left/right gesture in hospital detail cycles through nearby hospitals
- detail stays active while the selected hospital changes

Impact:

- faster comparison
- lower backtracking
- much closer to map-native place browsing behavior

## MTS-12 Header/body/state composition is still phase-specific instead of systemic

Observed:

- each phase has started solving shell behavior locally
- the codebase is now at risk of repeating detent, header, and glass logic per phase

Impact:

- harder maintenance
- future surfaces will drift again unless the contract is centralized

## 3. Additional Issues Identified In Code

These were not called out directly by the user, but are already visible in the current implementation:

- `MapExploreIntentStageBase.jsx` contains the only mature content-scroll detent system, which confirms the architecture has not yet been generalized
- `MapSearchStageBase.jsx` closes the phase on handle press unless expanded, which is phase-specific behavior rather than shared sheet behavior
- `MapHospitalListStageBase.jsx` and `MapHospitalDetailStageBase.jsx` do not reuse the same scroll detent handlers used by `explore_intent`
- hospital detail close/header logic is currently body-rendered, not stage-anchored
- phase headers and top controls are not yet normalized into a shared "top composition" pattern

## 4. Target Behavior

## 4.1 Shared sheet contract

Every pre-dispatch phase must inherit the same sheet contract:

- one resting collapsed behavior where allowed
- one half/default behavior
- one expanded behavior
- drag handle parity
- scroll-down-to-collapse parity
- scroll-up-to-grow parity
- web wheel parity
- sidebar parity

This contract should not live only in `explore_intent`.

## 4.2 Hospital detail contract

Hospital detail should behave as a true Apple Maps-like place sheet:

- half state is the default
- close affordance is always available
- title row is compact and glanceable
- image is not always fully exposed immediately
- upward growth reveals more image and more detail progressively
- downward collapse compresses to the compact row without a visual jump

## 4.3 Top composition contract

For detail phases, the top region should be owned by stage composition, not by body content.

The stage should own:

- drag handle
- close affordance
- top title alignment
- hero reveal behavior
- transition between compact, half, and expanded

## 4.4 Wide-screen contract

Sidebar/panel phases must obey the same island math:

- left, top, and bottom outer margins remain visually disciplined
- panel never visually overgrows the viewport
- panel content scrolls internally instead of stretching the frame

## 4.5 Media contract

Rail media must be deterministic and cross-platform:

- web-safe asset strategy
- explicit fit mode per rail type
- explicit centering rules
- no ad-hoc scale hacks without documented reasons

## 4.6 Liquid-glass contract

The glass system should become tokenized and reusable:

- shell blur/backdrop/overlay
- internal panel gradients
- top and bottom lucency rules
- icon button glass wrappers
- phase-consistent squircle radii

The implementation may differ by platform, but the perceived material should stay aligned.

## 5. Execution Plan

## Phase A. Document and lock the behavioral contract

Deliverables:

- this tracker
- updated acceptance criteria in implementation docs if needed
- explicit "shared stage detent contract" agreed before code changes

Output:

- no behavior changes yet
- team alignment on what "done" means

## Phase B. Extract shared sheet detent behavior

Goal:

- move the content-scroll detent logic out of `MapExploreIntentStageBase.jsx`
- make it reusable by `search`, `hospital_list`, and `hospital_detail`

Deliverables:

- shared hook or helper for content-driven detents
- one consistent scroll + wheel + drag behavior contract

Acceptance:

- `explore_intent`, `search`, `hospital_list`, and `hospital_detail` all step between snap states the same way where permitted

## Phase C. Refactor phase top compositions

Goal:

- stop rendering close/header/hero behavior as ordinary body content in detail phases

Deliverables:

- persistent close affordance in hospital detail
- simplified header hierarchy
- stage-owned top composition pattern

Acceptance:

- close is always available
- hospital detail half state opens with a compact title-first composition

## Phase D. Rebuild shared growth choreography

Goal:

- make `explore_intent` and `hospital_detail` feel like continuous place sheets instead of stepped swaps

Deliverables:

- half-state default
- progressive reveal of hero/image while expanding in hospital detail
- more deliberate grow/reveal choreography in `explore_intent`
- smoother transition between compact summary, half, and expanded

Acceptance:

- no visual jump between collapsed and half
- no abrupt phase jump when opening detail
- no abrupt grow jump in the main intent sheet either

## Phase E. Normalize wide-screen sidebar behavior

Goal:

- make all phases obey the same island/panel rules on wider screens

Deliverables:

- max-height discipline
- left/top/bottom margin parity
- internal scrolling instead of panel overflow

Acceptance:

- panel reads as one premium island on wide screens

## Phase F. Fix rail media system

Goal:

- make hospital detail rails reliable on web and visually stable across platforms

Deliverables:

- explicit web-safe asset path strategy
- fit/centering presets per rail type
- removal of undocumented scale hacks

Acceptance:

- ambulance and room cards render correctly on web, iOS, and Android

## Phase G. Add hospital-to-hospital swipe in detail

Goal:

- allow browsing nearby hospitals without leaving detail mode

Deliverables:

- horizontal swipe gesture or pager contract
- endless cycle through nearby hospitals

Acceptance:

- user can browse adjacent hospitals in detail without backing out to the list

## 6. Current Recommended Order

Implementation order should be:

1. shared detent extraction
2. search/list/detail parity on that contract
3. hospital detail top-composition refactor
4. hospital detail motion polish
5. wide-screen/sidebar parity
6. web media fixes
7. detail swipe navigation
8. final liquid-glass material pass across all phases

This order is important.

If the team starts with pure visual polish before shared motion and shell parity, regressions will continue.

## 7. Done Criteria For This Refinement Track

This refinement track is done only when:

- all four main pre-dispatch phases behave like one family:
  - `explore_intent`
  - `search`
  - `hospital_list`
  - `hospital_detail`
- close and top controls remain reachable during scroll where expected
- wide screens obey the same island geometry as the main explore system
- hospital detail media works on web
- hospital detail transitions feel continuous instead of modal
- the sheet material reads as one intentional cross-platform liquid-glass system
