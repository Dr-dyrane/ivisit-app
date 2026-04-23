# Emergency Sheet And Map UI Spec (v1)

> Status: Active design reference
> Last updated: 2026-04-21
> Purpose: define what each emergency sheet state shows, what decision the user is making, and how the map should behave across iOS, Android, and web/PWA

Related references:

- [MASTER_REFERENCE_FLOW_V1.md](./MASTER_REFERENCE_FLOW_V1.md)
- [WELCOME_AND_INTAKE_FLOW_MAP.md](./WELCOME_AND_INTAKE_FLOW_MAP.md)
- [../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md](../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)
- [CHOOSE_HOSPITAL_PHASE_DOSSIER.md](./CHOOSE_HOSPITAL_PHASE_DOSSIER.md)
- [MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md](./MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md)
- [MAP_FLOW_IMPLEMENTATION_V1.md](./MAP_FLOW_IMPLEMENTATION_V1.md)
- [MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](./MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
- [../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md](../../design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md)

External references used for this spec:

- Apple Maps iPhone support surfaces:
  - https://support.apple.com/guide/iphone/use-maps-iph02f94fc1c/ios
  - https://support.apple.com/en-lamr/guide/iphone/iph1b3553719/ios
  - https://support.apple.com/en-mide/guide/iphone/iph8c9c2528b/ios
  - https://support.apple.com/en-lamr/guide/iphone/ipha84a94043/ios
- Android bottom sheet guidance:
  - https://developer.android.com/develop/ui/compose/components/bottom-sheets-partial
  - https://developer.android.com/reference/kotlin/androidx/compose/material3/BottomSheet.composable
- Map marker and map UI references:
  - https://developers.google.com/maps/documentation/javascript/advanced-markers/overview
  - https://developers.google.com/maps/documentation/javascript/advanced-markers/migration
  - https://docs.mapbox.com/ios/maps/guides/user-location/
  - https://docs.mapbox.com/android/maps/guides/user-location/location-on-map/
  - https://docs.mapbox.com/ios/maps/guides/user-interaction/map-content-gestures/

## 0. Core Doctrine

This spec borrows the right behavior from Apple Maps on iPhone:

- the map stays as the spatial truth layer
- the sheet changes state more often than the route shell changes
- each state has one dominant decision
- the top of the sheet is glanceable first
- deeper detail is revealed by expansion, not by route replacement

For iVisit, that means:

- map = reality
- sheet = state + decision
- header = hidden until there is a true active emergency session
- auth and payment are late, not early

### 0.1 Foreground API Feedback Doctrine

Foreground, user-triggered API calls must never feel invisible.

Locked rule:

- every submit, resend, verify, commit, payment, or route-changing network action shows immediate pressed or pending feedback
- if the API succeeds too quickly, the UI must hold the pending affordance long enough for the user to perceive it before changing phase
- current default minimum perceptible pending duration is `2000ms`
- step changes must wait for that minimum pending window when they would otherwise unmount the pressed/loading control
- pipe-formatted service errors such as `INVALID_INPUT|Please enter a valid email address` must be normalized before rendering to the user
- the user should see the readable message only, not backend codes

Scope:

- applies to foreground user intent APIs
- does not apply to passive background hydration, silent cache refreshes, realtime subscriptions, or map preload work where artificial delay would make the app feel slower

Correction captured from commit-details testing:

- a fast successful auth API can be a UX bug if it removes the loading state before the user sees it
- the correct behavior is not to slow the network; it is to hold the visible pending state before transitioning

## 1. Universal Sheet States

Every emergency phase should be able to express itself in three sheet levels.

### 1.1 Collapsed

Purpose:

- preserve map visibility
- confirm current state
- let the user re-open detail quickly

Shows:

- short state label
- one key data point
- one high-priority affordance if needed

Never shows:

- long forms
- stacked explanations
- multiple competing buttons

Example content:

- current location
- ETA
- selected hospital
- ambulance status

### 1.2 Mid

Purpose:

- default decision surface
- most important state for phone

Shows:

- main title
- primary supporting fact
- primary CTA
- quiet secondary action

This is the state most phases should open into.

### 1.3 Expanded

Purpose:

- reveal editable detail
- show lists, search, or form fields
- keep the same shell while increasing information density

Shows:

- search results
- alternate hospitals
- triage choices
- transport details
- identity fields
- payment breakdown

Expanded is for detail. It is not a new app.

## 2. Global Sheet Anatomy

Every mid or expanded sheet should follow this order:

1. State label
2. Decision title
3. Confidence or trust line
4. Primary action
5. Secondary action
6. Optional expandable detail

Visual hierarchy rules:

- one large title only
- one primary button only
- support text must answer "what is happening?" or "what happens next?"
- lists should appear only after the user has enough context to choose
- do not front-load legal, pricing caveats, or auth language

Copy rules:

- prefer decision language over generic progression
- prefer `Use this location` over `Continue`
- prefer `Use this hospital` over `Continue`
- prefer `Confirm and dispatch` over `Submit`
- prefer `Add details` over `Sign up`

## 3. Phase-By-Phase Sheet Spec

## 3.1 Welcome

User decision:

- enter the live emergency surface

Collapsed:

- none

Mid:

- visual
- `Get help now`
- `Fast help nearby`
- primary: `Continue`

Expanded:

- none

Map behavior:

- no heavy operational map yet
- lightweight live backdrop or prewarmed map state only

## 3.2 Explore / Intent Sheet

User decision:

- choose what kind of help they need

Purpose:

- let the user see that the app knows where they are
- let them correct location without friction
- let them choose the type of help before any operational commitment

This is the first true map-first emergency state.

The user should understand three things within one glance:

- where the request will start
- that help exists nearby
- which kind of help they want

## 3.2.1 Root Provider Contract

This phase should be driven by one root provider state, not scattered booleans passed down from multiple parents.

Recommended provider shape:

- `currentCoordinate`
- `resolvedPlaceLabel`
- `resolvedAreaLabel`
- `locationConfidence`
- `searchQuery`
- `searchResults`
- `recentPlaces`
- `nearbyHospitals`
- `previewSearchCoordinate`
- `selectedIntent`
- `mapReady`
- `isLocating`
- `isSearching`
- `isResolvingSearchSelection`
- `isNearbyCareLoading`
- `error`

Minimum derived flags:

- `hasResolvedLocation`
- `hasNearbyCare`
- `hasPreviewSearchSelection`
- `hasSearchResults`
- `canChooseIntent`

The design should not infer state by guessing around missing props. This sheet should read like one coherent system.

## 3.2.2 Sheet Goal

The Explore / Intent Sheet is not yet asking the user to commit.

It is asking only:

- where should help start from?
- what kind of help do you want?

It must not look like:

- a hospital picker
- a pricing screen
- a dispatch confirmation
- an auth gate

The sheet should feel calm, spatial, and immediately understandable.

Current implementation contract:

- mode name: `explore_intent`
- default snap state: `half`
- search is the next sheet phase, not a sibling modal target
- nearby hospitals should migrate into `hospital_list` sheet phase
- the base shell stays persistent while only content changes

Persistent shell constants:

- one persistent sheet shell with zero internal horizontal gutter
- collapsed and half states still read as a floating island
- expanded state may grow wider, but the same shell remains alive
- one drag handle
- one top row slot
- one content viewport
- one optional footer slot
- header hides only when the sheet reaches expanded
- the handle supports drag up and drag down between snap states

Local layout ownership:

- shell owns shape, motion, blur, and snap behavior
- normal content sections own their own horizontal inset
- the hospital rail is exempt from normal section inset
- the rail wrapper may run edge-to-edge inside the sheet
- the rail content itself owns its own internal x-padding

This is a locked iVisit rule, not a generic Apple translation.

Returning-user rule:

- an avatar/profile trigger lives in the top row near search
- signed-in users open profile shortcuts
- signed-out users open a light restore sheet
- restore is optional and never blocks exploration
- guest flow remains valid until commit

## 3.2.3 Collapsed State

Collapsed:

- `Search`
- avatar/profile trigger

Collapsed purpose:

- preserve map visibility
- keep one fast re-entry point to the intent flow
- behave like a resting island, not a second screen

Collapsed contents:

- search row
- avatar/profile trigger
- no intent buttons
- no explanation block

Collapsed visual order:

1. Search row
2. Avatar

Collapsed behavior:

- handle tap expands to `half`
- search row advances into the `search` sheet phase
- avatar still opens profile / restore
- no keyboard appears unless search is the user intent
- there should be no visible dead strip below the search row
- the only visible space above search should be enough to afford the drag bar

Collapsed example:

- search: `Search`
- avatar: profile or guest placeholder

Surface recommendation:

- shallow rounded island
- short height
- translucent but readable
- no heavy border

### Collapsed-state rules for next phases

- `search`
  - collapsed state should match the same resting shell as `explore_intent`
  - do not show results or keyboard in the resting posture
  - tapping the search row should re-expand and focus the search state
- `hospital_list`
  - does not need a collapsed state
  - minimum posture is `half`
- `hospital_detail`
  - may use a compact collapsed summary row
  - row structure:
    - leading CTA / affordance
    - centered hospital title block
    - subtitle with distance away
    - trailing close icon
- collapsed padding should compress aggressively so the island feels truly resting
- the shell should not preserve extra bottom spacing under search

## 3.2.4 Mid State

Mid:

- search affordance
- profile/avatar trigger
- nearest hospital preview card
- three intent actions:
  - `Ambulance`
  - `Bed space`
  - `Compare`

Mid is the default state.

Mid contents, top to bottom:

1. search row
2. nearest hospital preview
3. `Choose care`
4. three large icon-first intent actions

Mid layout rule:

- search row, nearest hospital card, and choose-care content use the standard local content gutter
- the sheet shell itself does not add x-padding

The simplest Apple Maps-like version does not need extra wrappers around the intent actions. This is the fast decision layer, not the browse layer.

Each intent action should include:

- large rounded icon surface
- title
- one-line support
- pressed state
- pending state

Recommended intent copy:

- title: `Ambulance`
- support: nearby count or fastest nearby availability

- title: `Bed space`
- support: available beds or nearby bed count

- title: `Compare`
- support: all options

Mid interaction rules:

- tapping an intent gives immediate pressed feedback
- the sheet acknowledges intent before the next phase finishes loading
- the selected card can show a subtle in-card pending treatment
- search advances to the `search` sheet phase
- tapping the nearest hospital preview advances to `hospital_list` or `hospital_detail`
- tapping the avatar opens profile shortcuts or restore-account entry
- drag up expands to `expanded`
- drag down collapses to `collapsed`
- handle tap may still step upward as a secondary affordance

Mid loading behavior:

- if location is still resolving:
  - title becomes `Finding your location`
  - support becomes `Help starts from where you are`
  - search row stays visible
  - intent actions stay visible but disabled or skeletoned until location confidence is acceptable
- if nearby care is still loading:
  - user may still choose intent
  - map markers can fade in later
  - support may temporarily become `Checking nearby care options`

Mid no-data behavior:

- if no nearby hospitals are loaded yet:
  - keep both intent actions visible
  - do not show an empty-state warning too early
  - use only light reassurance copy
- if location permission is denied:
  - title becomes `Choose where help should start`
  - support becomes `Search for a street, area, or landmark`
  - search row becomes the main path

Design recommendation for intent cards:

- equal-width orb actions on phone
- icon as the primary visual
- title in strong weight
- support in one quiet line
- no extra wrapper cards around the orb row
- no price or operational commitment yet

## 3.2.5 Expanded State

Expanded:

- everything in `half`
- hospital image cards
- minimal terms link

Expanded purpose:

- preserve the same decision shell while adding light browse depth
- support recall and discovery without interrupting the map
- keep hospital exploration out of the default `half` state so urgency stays clear

Expanded contents, top to bottom:

1. search row
2. nearest hospital preview
3. `Choose care`
4. intent orbs
5. hospital image cards
6. terms link

Expanded browse behavior:

- header hides
- the sheet grows to screen edges and bottom
- drag down returns the sheet to `half`
- the hospital rail has no heading
- the hospital rail always behaves like a horizontal rail, not a static grid
- two cards should dominate the visible row
- the next card should partially peek to communicate scroll
- the rail should render the full nearby hospital set, not a separate clipped preview subset
- the modal list and the rail must read from the same hospital collection so users do not see contradictory counts
- never inject fake hospital names, distances, ETA, bed counts, or placeholder hospital cards just to fill the rail
- each hospital card uses app-owned imagery with bottom overlay copy
- each featured card opens the `hospital_detail` sheet phase

Hospital media source rule:

- featured hospital cards should continue to consume the hydrated `hospital.image` field
- that image field should resolve through the canonical hospital-media pipeline, not per-card provider URL logic
- if the system has no trustworthy real image, the rail may show a deterministic fallback image rather than blank media

Featured hospital card contents:

- hospital name
- optional one quiet support line only
- no icon badge on the card
- larger portrait card ratio than the first pass
- cards should feel wider and taller than the original compact pass
- the rail wrapper should visually reach the sheet edges
- internal rail x-padding should live inside the rail, not in the parent content gutter
- no section heading above the cards

Expanded footer:

- small unobtrusive `Terms & conditions` link only
- then the sheet returns to mid with the new resolved place
- intent actions become fully visible again once a place is chosen

Expanded empty search state:

- title: `No matching places yet`
- support: `Try a street, area, or landmark`

Expanded error state:

- title: `Search unavailable`
- support: `Check your connection or try again`
- action: `Use current location`

## 3.2.6 Visual Hierarchy

Primary visual hierarchy:

- location first
- intent second
- explanation minimal

Locked hierarchy order:

1. Place confidence
2. User choice
3. Search or edit affordance
4. System reassurance

What must feel dominant:

- the resolved location
- the two intent choices

What must feel secondary:

- helper copy
- search explanation
- low-priority controls

What should not exist here:

- auth language
- pricing
- hospital list cards
- dispatch language
- long provider explanations
- forms
- payment language

Surface treatment:

- rounded system card
- subtle glass or elevated fill
- no divider-heavy layout
- spacing should separate sections more than borders do

## 3.2.7 Recommended Copy

Preferred live copy set:

- label: `Choose care`
- title: resolved address or area label
- support: `Help near this location`

Fallback copy:

- label: `Choose care`
- title: `Current location`
- support: `Set where help should start`

Search title copy:

- `Search location`

Search field placeholder:

- `Search street, area, or landmark`

Avoid:

- `Continue`
- `Next`
- `Submit`
- `Book`

The decision here is intent, not progression.

## 3.2.8 Map Behavior

Map behavior:

- user puck visible immediately
- nearby hospitals may appear as quiet markers
- no bold route yet

Map rules for this phase:

- user puck or confirmed starting point appears as soon as location is known
- nearby hospitals render as quiet candidate markers
- no selected hospital marker yet
- no bold route yet
- no route animation yet

Map camera rules:

- first load centers on the user or chosen location
- if nearby hospitals exist, frame the user plus the nearest candidates without zooming too far out
- if the user changes location, camera acknowledges immediately
- search preview selection should produce a short, controlled recenter rather than a dramatic fly-over

Marker rules:

- user location uses the modern puck, not a static red pin
- nearby hospitals use low-emphasis markers
- no candidate should look like the chosen destination yet
- if the user is previewing a searched place, use one temporary preview marker only

Motion rules:

- puck can pulse once on first acquisition
- nearby markers may fade in softly
- preview marker can scale in once
- no dramatic fly-to camera move

Floating controls:

- recenter only if necessary
- theme toggle only if already part of the shell
- no zoom buttons on phone
- no crowded map chrome

## 3.2.9 Modern Marker And In-Map UI Direction

To make this phase feel alive before routing begins, the map needs more than a blank base plus one animation later.

Recommended marker system for this phase:

- user puck:
  - platform-native blue puck on iOS and Android where possible
  - web equivalent should mimic a live puck with halo and center dot, not a generic red pin
- nearby hospitals:
  - soft, low-contrast medical markers
  - preferred shape is a small filled marker with a hospital cross or bed glyph
  - avoid bright red because red implies commitment or emergency target
- selected search preview:
  - one clearer preview pin or dot with soft halo
  - must read as temporary, not final destination

Modern in-map behavior:

- quiet nearby care markers appear quickly after the puck
- markers should feel part of the environment, not sticker-like
- hospital markers can gain slight scale on hover or press for web
- the user puck should always feel more alive than the hospital markers

This phase should visually communicate:

- you are here
- care exists nearby
- choose what you want next

## 3.2.10 Design Recommendation

This phase should feel like:

- Apple Maps place certainty
- Uber-style immediate intent choice
- zero emergency paperwork

The strongest design for iVisit is:

- map already alive
- sheet opened to mid state
- current location clearly resolved
- search available but not visually dominant
- two large intent choices

That keeps the first meaningful decision obvious:

- what kind of help do you need here?

## 3.3 Confirm Location

User decision:

- confirm the current location before the system makes care decisions

Collapsed:

- short place label
- `Change`

Mid:

- hero illustration
- resolved address
- locality line
- primary: `Use this location`
- secondary: `Change location`

Expanded:

- location search field
- current location action
- autocomplete results

Visual hierarchy:

- address is the anchor
- map is proof
- actions come before deep editing

Map behavior:

- user puck or selected point centered
- modern location chip such as `You are here`
- no route yet

## 3.4 Ambulance Searching

User decision:

- wait or back out while the system calculates the best dispatch option

Collapsed:

- `Finding fastest team...`

Mid:

- system label: `Finding fastest team...`
- support line: `Checking nearby hospitals and response routes`
- no primary CTA
- optional secondary: `Change location`

Expanded:

- optional progress explanation
- candidate hospitals list only if needed for debug or fallback

Visual hierarchy:

- state message first
- do not force a decision before the system has a recommendation

Map behavior:

- candidate hospitals visible
- faint candidate routes visible
- one route may become more prominent as confidence increases

## 3.5 Ambulance Recommendation

User decision:

- accept the recommended dispatch plan or inspect alternatives

Collapsed:

- ETA
- hospital name

Mid:

- state label: `Recommended ambulance plan`
- ETA
- hospital name
- selected ambulance tier
- crew pill
- price pill
- primary: `Confirm and dispatch`
- secondary: `See other hospitals`

Expanded:

- alternate ambulance tiers only
- hospital card
- notes card
- optional route comparison if needed later

Visual hierarchy:

- ETA first
- hospital second
- selected ambulance tier third
- crew and price fourth
- CTA fourth

Pre-dispatch data contract:

- the current `/map` ambulance-decision surface is driven by hospital-scoped `service_pricing`, not by an assigned ambulance unit
- safe backend-backed ambulance fields here are:
  - `service_name`
  - `service_type`
  - `description`
  - `base_price`
- crew presentation in this phase is currently derived from the service tier mapping, not from `ambulances.crew`
- do not repeat ETA in the hero when the header already carries the away line
- if pills are shown in the hero, the preferred order is:
  - pill 1 = crew
  - pill 2 = price
- if a compact tier selector is shown under the hero:
  - selected state should be communicated by the whole pill, not by a trailing chevron
  - selected pill uses the app CTA color
  - selected icon may switch from outline to filled
  - unselected pills stay tinted and quieter
  - first tap selects
  - second tap on the already-selected tier advances
- live unit identity belongs later:
  - call sign
  - plate
  - live vehicle location
  - assigned driver / responder identity
  - exact ambulance row `crew`

Map behavior:

- recommended route bold and saturated
- alternative routes thin and quiet
- destination marker elevated above other hospitals

## 3.6 Bed Browse

User decision:

- choose which hospital to reserve or travel to

Collapsed:

- `Nearby hospitals`
- count

Mid:

- state label: `Nearby hospitals`
- list of hospitals
- each row shows:
  - hospital name
  - distance or ETA
  - availability confidence

Expanded:

- full list
- filters if ever needed later
- richer hospital metadata

Visual hierarchy:

- list first
- selected row becomes emphasized
- no premature commit CTA until one hospital is clearly selected

Map behavior:

- all candidate hospitals visible
- selected row highlights corresponding marker
- map camera adjusts to keep user and visible candidates in frame

## 3.7 Bed Selected Hospital

User decision:

- confirm the chosen hospital

Collapsed:

- hospital name
- beds or availability note

Mid:

- ETA or distance
- hospital name
- address
- availability confidence
- primary: `Use this hospital`
- secondary: `See other hospitals`

Expanded:

- alternate hospitals
- detail about services, beds, or deposit note

Visual hierarchy:

- hospital name first
- availability second
- CTA third

Map behavior:

- selected hospital marker becomes dominant
- route from user to hospital becomes visible

## 3.8 Transport Choice

User decision:

- decide whether transport is needed for the chosen hospital path

Collapsed:

- `Transport needed?`

Mid:

- title: `Do you need transport?`
- two clear actions:
  - `Yes, send ambulance`
  - `No, I will go myself`

Expanded:

- short explanation of consequences
- optional ambulance type preview if needed

Visual hierarchy:

- binary choice only
- no auth here
- no payment here

Map behavior:

- hospital remains selected
- map context does not reset

Current `/map` implementation note:

- `bed` and `ambulance + bed` now use separate decision moments, not a separate combined sheet
- half state is intentionally room-first so smaller phones can still fit hero, selector, and route without crowding
- `bed` stays in `BED_DECISION`
- `ambulance + bed` now uses `AMBULANCE_DECISION -> BED_DECISION`
- room selection is forwarded into the legacy bed-booking route today
- paired ambulance selection is preserved after `AMBULANCE_DECISION` and forwarded when `BED_DECISION` confirms, but the legacy bed-booking screen is still the next seam to replace before combined commit becomes fully native
- if the user switches hospitals during `BED_DECISION` in the combined flow, the previously saved ambulance choice is no longer valid UI state and the sheet should restart at `AMBULANCE_DECISION` for the new hospital

## 3.9 Triage / Medical Context

User decision:

- tell the system what support level is needed

Collapsed:

- short selected issue label

Mid:

- title: `What is happening?`
- concise option list:
  - `Breathing issue`
  - `Injury`
  - `Chest pain`
  - `Other`
- primary: `Continue`

Expanded:

- longer options
- optional free text only when needed

Visual hierarchy:

- the question first
- choices second
- no identity language yet

Map behavior:

- active route remains visible
- sheet owns the interaction

## 3.10 Service / Support Level

User decision:

- confirm or adjust the care level before commit

Collapsed:

- selected level

Mid:

- title: `Choose support level`
- options:
  - `Standard ambulance`
  - `Ambulance with extra support`
  - `Critical care ambulance`
- primary: `Continue`

Expanded:

- feature differences
- pricing deltas

Visual hierarchy:

- selected recommendation first
- override options second

Map behavior:

- route remains visible
- ambulance identity is still not dispatched yet

## 3.11 Identity / Auth

User decision:

- finish the minimum pre-payment draft without leaving the sheet

Collapsed:

- none in v1

Mid:

- not the primary posture in v1

Expanded:

- compact modal header with locked hospital name + step
- one question at a time
- email input first
- OTP entry second
- phone confirmation only when the resolved authenticated profile still lacks a reachable callback number
- resend code
- correction path
- backflow between microsteps without leaving the phase

Locked auth order:

- email first
- OTP second
- phone confirmation third only when the resolved authenticated profile still lacks a reachable callback number
- name is not a blocking v1 question
- this happens before payment
- this must not use `Sign up` or `Register` language

Preferred copy:

- `What's your email?`
- `Enter verification code`
- `Next, we'll send a code.`

Map behavior:

- map remains visible
- sheet carries identity capture
- `COMMIT_DETAILS` should open directly in the normal expanded sheet posture for keyboard and OTP focus
- the global smart header remains reserved for tracking; this phase uses the sheet's own compact modal header
- the new `/map` visual language stays intact; do not drop the user back into the legacy auth modal presentation
- borrow mature legacy behavior where it is stronger without inheriting the old visuals:
  - phone confirmation should keep the map-native input shell but use country detection, region picking, real validation, and E.164 normalization
- OTP should keep the map commit card but use stronger autofill, paste, focus, and resend behavior
- email remains the simplest inline map field
- finish hardening these identity primitives before adding `COMMIT_TRIAGE` as the next sheet phase

## 3.12 Payment / Commit

User decision:

- perform the irreversible action

Collapsed:

- amount
- short action label

Mid:

- title: commit summary
- hospital
- ETA if ambulance
- final amount
- primary:
  - `Pay and send ambulance`
  - or `Pay and reserve bed`
- secondary:
  - `Review details`

Expanded:

- payment method
- breakdown
- deposit policy
- final acknowledgment copy

Visual hierarchy:

- amount and consequence first
- payment control second
- supporting policy third

Map behavior:

- route stays visible
- user must still understand where help is headed

## 3.13 Tracking / Directions

User decision:

- monitor progress or act on a live object

Collapsed:

- live ETA
- status

Mid:

- ambulance:
  - `Ambulance on the way`
  - ETA
  - driver or vehicle label if available
- bed:
  - `Bed reserved`
  - destination
  - next instruction

Expanded:

- turn list
- hospital contact
- driver or dispatcher contact
- escalation / support actions

Map behavior:

- live ambulance marker or route progress
- destination remains anchored
- user location remains visible

## 4. Marker And Map UI Design System

The map should feel alive before full live tracking starts. The route animation alone is not enough.

## 4.1 User Location

Recommended default:

- filled center dot
- soft outer halo
- accuracy ring when uncertainty matters
- heading cone only when travel direction matters

Platform notes:

- iOS borrow: calm puck with subtle heading, not a noisy pin
- Android borrow: clear puck with visible bearing affordance when moving
- web/PWA borrow: same visual language as native, not a generic browser marker

Behavior:

- idle: gentle pulse on first acquisition only
- confirmed location: puck settles and stops demanding attention
- tracking: puck may road-snap when route quality is high

## 4.2 Hospital Marker Types

### Candidate Hospital

Use:

- small rounded pin or disc marker
- hospital glyph
- neutral or low-emphasis surface

Purpose:

- show possibility without over-committing

### Recommended Hospital

Use:

- larger marker than candidate
- stronger accent ring or filled state
- optional top chip such as `Fastest`

Purpose:

- clearly communicate system recommendation

### Selected Hospital

Use:

- strongest emphasis in the bed flow
- optional attached name label on selection

Purpose:

- show the user's chosen destination

### Active Destination

Use:

- stable destination marker at the end of the route
- do not stretch or distort the asset
- anchor should remain visually consistent across zoom levels

Purpose:

- prevent the "which place is the destination?" question

## 4.3 Ambulance Marker

Needed states:

- searching
- assigned
- en route
- arriving

Recommended treatment:

- top-down or simplified vehicle puck, not a novelty icon
- heading-aware orientation
- subtle shadow
- route-snapped motion

Animation rules:

- continuous movement during tracking
- no bounce loop at rest
- arrival pulse can happen once when near destination

## 4.4 Clusters

Cluster rules:

- cluster candidate hospitals when zoomed out
- show a count bubble, not stacked pins
- on tap, zoom or fan out

Why:

- Mapbox clustering and modern web map systems already treat clustered point annotations as the right zoomed-out pattern
- wide surfaces should not become pin noise

## 4.5 Route Styling

Route system:

- recommended route: strongest line
- alternate routes: thinner, quieter lines
- historical or rejected route: drop saturation fast

Surface behavior:

- ambulance path can show faint candidate routes during decision
- bed path should show only the selected route once the user has chosen

## 4.6 Floating Controls

Minimum set:

- recenter
- theme or layer toggle only if necessary

Avoid:

- too many map chrome buttons
- duplicate search affordances both in map and sheet
- large floating card stacks over the route

## 5. Cross-Platform Interpretation

## 5.1 iOS

Borrow most heavily from Apple Maps:

- large corner radius
- quiet glass or soft material sheet
- sparse controls
- one obvious action
- frictionless expansion pattern

Default state:

- mid sheet

## 5.2 Android

Borrow from Material bottom sheet behavior:

- explicit partially expanded state
- clear drag affordance
- tonal surfaces over pure white glass
- stronger state contrast

Default state:

- partial sheet that can expand fully

Important constraint:

- Android must use the **same intent content, copy, order, and decision layout as iOS mobile**
- only shell-level platform idioms should differ (sheet physics, blur/material treatment, keyboard behavior, map chrome)

## 5.3 Web / PWA

Treat web mobile like the same canonical mobile flow used on iOS and Android.

Rules:

- same decision order as native
- same marker semantics as native
- same card sequence and copy as mobile native
- hide browser-like clutter where possible
- platform-specific handling is allowed only for shell behavior and browser constraints

For web mobile breakpoints:

- `sm` (< 640px): same canonical mobile order in a narrow single-column lane
- `md` (640px–1023px): same order and same components in a slightly wider centered lane
- do not fork the emergency IA just because the browser width changes

For wide web:

- preserve sheet semantics but allow side-panel translation
- compact = collapsed
- standard panel = mid
- fuller detail panel = expanded

Do not redesign the flow into a desktop dashboard.

## 6. Immediate Design Implications For iVisit

Lock these next:

1. One explicit sheet state model shared across all phases.
2. Decision-first CTA copy in every phase.
3. Modern user puck and hospital marker system.
4. Recommended hospital marker distinct from selected bed marker.
5. Cluster behavior on wider maps and zoomed-out states.
6. Commit phase remains map-led and sheet-led, not wizard-led.

## 7. Current Product Translation

If we translate the new iVisit flow into this spec:

- Welcome = clean entry
- Explore = intent and location
- Decision = ambulance recommendation or bed choice
- Commit = triage, transport detail, identity, payment
- Execute = dispatch tracking or reservation guidance

That is the correct Apple Maps-like structure:

- one persistent map
- one evolving sheet
- one dominant decision at a time

## 8. Ambulance Flow Refactor Runtime Appendix

This appendix turns the design spec into the actual implementation determinants for the new `/map`-first ambulance path.

### 8.1 Locked visible state spine

For the first-pass ambulance runtime, the visible sheet sequence should be:

`EXPLORE_INTENT -> AMBULANCE_DECISION -> COMMIT_DETAILS -> COMMIT_PAYMENT -> TRACKING`

Important implementation note:

- `COMMIT_AUTH` should not be a separate visible phase unless an OTP constraint truly forces it.
- verification belongs inside `COMMIT_DETAILS` so the flow still feels like one care sheet instead of a registration detour.

### 8.2 Current legacy seam to remove

Current runtime seam:

`EmergencyIntakeOrchestrator -> onContinue(payload) -> setShowLegacyFlow(true) -> EmergencyRequestModal`

Evidence in current app:

- `screens/RequestAmbulanceScreen.jsx` still flips into `EmergencyRequestModal.jsx` through `showLegacyFlow`.
- `EmergencyRequestModal.jsx` still owns much of the legacy dispatch / payment / tracked-request transition behavior.

Target runtime rule:

- keep the user on `/map`
- keep the map mounted
- move the state machine into `MapScreen.jsx` + `MapSheetOrchestrator.jsx`
- reuse legacy content patterns, but not the old modal handoff behavior

### 8.3 Behind-the-scenes determinants by state

| State | Primary user-facing job | Hidden determinants | DB write? | Runtime owner |
|---|---|---|---|---|
| `EXPLORE_INTENT` | orient and choose intent | resolved location, nearby hospitals, coverage mode, selected care intent, map readiness | no | `MapScreen.jsx` + `EmergencyContext.jsx` |
| `AMBULANCE_DECISION` | show best dispatch candidate | recommended hospital, ETA, route confidence, hospital-scoped `service_pricing`, derived crew label, service summary | no | `MapSheetOrchestrator.jsx` + route helpers |
| `COMMIT_DETAILS` | authenticate and finish the minimum request draft | locked hospital/service summary, email OTP auth state, phone if missing, local draft validity | no | map sheet local state + request draft |
| `COMMIT_TRIAGE` | collect optional operational context | locked request draft, skippable triage answers, patient-friendly severity/context fields | no | map sheet local state + request draft |
| `COMMIT_PAYMENT` | perform real operational commit | authenticated actor, valid hospital id, payment method, amount, request payload ready | yes | `useRequestFlow.js` + RPCs |
| `TRACKING` | show live certainty | request id, payment state, responder assignment, realtime status projection | updates only | `EmergencyContext.jsx` + realtime |

### 8.4 User-type entry determinants

#### A. First-time guest user

Visible experience:

- can fully use `EXPLORE_INTENT`
- can reach `AMBULANCE_DECISION`
- can fill `COMMIT_DETAILS`

Behind the scenes:

- the app may keep a local emergency draft first
- a true database-backed request should **not** be created yet
- this is because `create_emergency_v4` is granted to `authenticated` + `service_role`, not `anon`

Implementation rule:

- let the guest feel the whole map-first flow
- ask for inline email OTP inside `COMMIT_DETAILS`
- ask for phone only if the resolved authenticated profile still lacks a reachable callback number
- only move into `COMMIT_PAYMENT` once the actor is authenticated or otherwise linked to an owned patient identity

#### B. First-time demo / hybrid-coverage user

Visible experience:

- should feel exactly like the real flow
- no `demo` language should appear in the UI
- hospitals can still look nearby and actionable

Behind the scenes:

- nearby options may come from hybrid/demo-backed coverage in `EmergencyContext.jsx`
- the coverage mode may allow demo-like hospital inventory for sparse regions
- bootstrap / fallback is a system concern, not a product-language concern
- the selected demo hospital must survive into `COMMIT_DETAILS` unchanged so the payment phase can still resolve the demo auto-approval lane correctly

Implementation rule:

- keep the exact same sheet states as the live flow
- do not fork the UI into a separate demo branch
- if the user never completes verification/auth, the app stays in local draft / preview territory until real commit becomes possible
- if the selected hospital is demo-backed, `COMMIT_PAYMENT` should still use the real cash request lane and then resolve the no-wait demo auto-approval path instead of inventing fake tracking

#### C. Authenticated patient user

Visible experience:

- same map-first flow
- less friction in `COMMIT_DETAILS`
- profile details can prefill automatically

Behind the scenes:

- request commit can go straight through the DB-backed emergency lane
- the request owner is already known
- later mutations can safely use `patient_update_emergency_request`

Implementation rule:

- prefill identity/contact fields where possible
- skip email + OTP entirely when the user already has a valid owned session
- skip phone when the resolved profile already has it
- keep `COMMIT_DETAILS` short
- let `COMMIT_PAYMENT` be the final real-world release gate

#### D. Returning user with active trip

Visible experience:

- should not re-enter the full intake sequence
- should land directly into `TRACKING` or the active live status state

Behind the scenes:

- `EmergencyContext.jsx` should hydrate existing active request/trip truth from realtime or stored recovery state

### 8.5 Transition determinants

#### `EXPLORE_INTENT -> AMBULANCE_DECISION`

Trigger:

- user taps `Ambulance`

Minimum system conditions:

- active location exists
- at least one hospital candidate or fallback recommendation exists
- route preview can be computed or reasonably faked from current location + selected hospital

If coverage is weak:

- still allow progress
- degrade copy gently
- keep `Other hospitals` secondary or hidden when there are no true alternatives

Current implementation note:

- `/map` now opens a dedicated `AMBULANCE_DECISION` sheet phase using the shared map shell
- `Other hospitals` routes through `hospital_list` and returns to the decision phase
- `hospital_detail` and `service_detail` remain browse/select surfaces upstream of commit
- `hospital_detail` CTA routing must stay:
  - ambulance intent = `hospital_detail -> ambulance_decision`
  - bed intent = `hospital_detail -> bed_decision`
  - combined intent = `hospital_detail -> ambulance_decision` first
- service rails/cards may inspect through `service_detail` or select directly into the proper decision phase, but they must not jump to `COMMIT_DETAILS`
- `Confirm & continue` now opens `COMMIT_DETAILS`
- the final `COMMIT_DETAILS` continue should open `COMMIT_TRIAGE`, then native map `COMMIT_PAYMENT` for ambulance requests
- the legacy ambulance request/payment route is no longer the main `/map` commit seam for this path
- the expanded decision sheet now uses:
  - alternative tiers
  - compact route surface
  - notes card
- the decision content currently survives on:
  - hospital recommendation
  - route preview
  - hospital-scoped `service_pricing`
- this is deliberate:
  - the legacy request modal also chose ambulance options from `service_pricing`
  - the pre-dispatch sheet should not depend on a live assigned ambulance row
- even though current RLS allows public `SELECT` on `ambulances`, pre-dispatch UI should treat unit-level logistics data as post-commit / tracking information

#### `AMBULANCE_DECISION -> COMMIT_DETAILS`

Trigger:

- user taps `Confirm & dispatch`

Behind the scenes:

- freeze selected hospital
- freeze the route emphasis state
- initialize the request draft payload
- open a focused `expanded` sheet
- do **not** call the DB commit yet

Locked `COMMIT_DETAILS` microflow:

1. compact modal header owns locked hospital name + step
2. `What's your email?`
3. `Enter verification code`
4. `What's your phone?` with a prefilled value when available

Rules:

- one question at a time, never a long form
- back should move between `COMMIT_DETAILS` microsteps before leaving the phase
- reuse the app's existing email OTP primitives (`SmartContactInput`, `OTPInputCard`, `authService.requestOtp`, `authService.verifyOtp`)
- use the sheet's own compact modal header; reserve the app-owned smart header for tracking
- do not render a duplicate selected-service summary card in the body
- the identity body should inherit the guest profile bridge shape: avatar, prompt, input, CTA
- `COMMIT_DETAILS` is the first returning-user memory seam; it should inherit the email-first language already used by the profile bridge

Google Play review access:

- reviewer email: `support@ivisit.ng`
- reviewer code: `123456`
- this path is allowed only inside emergency `COMMIT_DETAILS`
- `support@ivisit.ng` is a confirmed `patient` review profile, not admin/provider
- the `staging` EAS profile enables `EXPO_PUBLIC_REVIEW_DEMO_AUTH_ENABLED=true`
- deployed Supabase Edge Function: `review-demo-auth` on project `dlwtcmhdzoklveihuhjf`
- server-side secrets must stay aligned with Play Console reviewer instructions:
  `REVIEW_DEMO_AUTH_ENABLED=true`, `REVIEW_DEMO_AUTH_EMAIL=support@ivisit.ng`, `REVIEW_DEMO_AUTH_OTP=123456`

#### `COMMIT_DETAILS -> COMMIT_PAYMENT` (primary path)

Trigger:

- required details are valid
- verification succeeds if needed

Required result:

- authenticated actor/session
- patient email
- patient phone confirmation when needed
- locked selected hospital/service still present
- request draft still local, with no DB create yet

#### `COMMIT_TRIAGE -> COMMIT_PAYMENT` (optional path)

Trigger:

- triage is completed or skipped

Rules:

- triage stays map-native, not legacy modal
- one focused question at a time where possible
- skip is allowed and visually safe
- no diagnosis promise and no AI promise in user-facing copy
- answers enrich `patient_snapshot.triage` but should not block payment unless the backend later marks a field operationally required

Required minimum payload:

- authenticated actor/session
- patient location / pickup context
- selected hospital id
- service type = `ambulance`
- selected ambulance tier / service metadata
- patient email
- patient phone confirmation
- patient snapshot assembled from the resolved user + collected fields

Not a blocking v1 requirement:

- patient name as a dedicated step

Reason:

- the current backend create lane does not require a separate name field before request creation
- callback reachability is operationally more important than profile enrichment here

Exact create-lane fields to prepare for `create_emergency_v4`:

- `hospital_id`
- `hospital_name`
- `service_type`
- `specialty` when known
- `ambulance_type` when known
- patient location / pickup context
- `patient_snapshot`

Current implementation note:

- `/map` has a native ambulance `COMMIT_PAYMENT` phase
- it uses the selected hospital, selected transport tier, pickup context, live cost calculation, and selected payment method to release through the existing `useRequestFlow` / `create_emergency_v4` lane
- it preserves demo-backed hospitals through `demoEcosystemService.shouldSimulatePayments(...)` so cash can auto-approve through the existing real approval lane
- this simulation state is backend-only language; the patient UI must render neutral payment copy such as `Provider confirmation` and must not mention demo/live-mode terminology
- the payment selector should collapse after selection into one readable summary row with `Change` as the expansion affordance, keeping the main dispatch CTA as the only primary action
- add-card is supported on native and web: native uses Stripe `CardField`, web uses Stripe.js Elements, and both attach through the existing SetupIntent / `payment_methods` reflection path
- `COMMIT_TRIAGE` should be added before payment as a skippable sheet phase, not as a legacy modal

#### `COMMIT_PAYMENT -> TRACKING`

Trigger:

- request commit succeeds
- payment method succeeds or enters an allowed pending state

Payment resolution ownership:

- `COMMIT_PAYMENT` must own `submitting`, `pending_approval`, `approved`, `denied`, and `failed` states inside the map sheet
- pending cash/provider approval should show a waiting state in the same sheet, not a legacy modal
- approved should show a short acceptance transition before switching into tracking
- denied should preserve the draft and offer recovery through `Change payment` and `Try again`
- failed network/system states should preserve the draft and retry path
- no patient-facing copy may mention demo/simulation mode

Tracking entry rule:

- do not switch into `TRACKING` until a real request id exists
- do not switch into `TRACKING` until payment status allows dispatch/tracking
- hydrate active request truth through `EmergencyContext.jsx` and realtime before showing live movement when possible

Tracking UI direction:

- `TRACKING` is the first phase that may use the app-owned smart / scroll-aware header
- the header should behave like active navigation chrome: large instruction/status capsule, compact secondary line, and route truth
- the bottom sheet should become a compact route card with arrival, minutes, distance, and expandable controls
- route controls can include destination, share ETA, call, report issue, and cancel/end only when backend status rules allow it
- ambulance animation should use realtime responder coordinates when available and smooth route-progress projection only as a fallback
- `Share ETA` may ship first as a native share-sheet text action, but only with patient-facing fields
- do not expose request ids or debug labels in shared payloads
- the long-term standard is a public tokenized live tracking route, not raw text pretending to be live tracking

### 8.6 Database-backed commit lane

This is the real behind-the-scenes operational path for the new map-first sheet flow.

#### Real request creation

Use:

- `create_emergency_v4(UUID, JSONB, JSONB)`

What it does:

- creates the `emergency_requests` row
- creates or links the `payments` row
- creates the linked `visits` row
- enters the automation / lifecycle chain

Current app-evidence note:

- the live app path already calls this RPC through `services/emergencyRequestsService.create`
- the current RPC contract only consumes:
  - `hospital_id`
  - `hospital_name`
  - `service_type`
  - `specialty`
  - `ambulance_type`
  - `patient_location`
  - `patient_snapshot`
  - payment payload
- `COMMIT_DETAILS` should therefore prepare only the data that can be carried into that contract or safely deferred

#### Later patient mutation lane

Use:

- `patient_update_emergency_request(UUID, JSONB)`

What it should handle after commit:

- patient status changes allowed by DB state rules
- patient-side location/note updates
- triage snapshot or payload enrichment after request creation when allowed

Current app-evidence note:

- the patient mutation lane already merges `triage_snapshot` into `patient_snapshot.triage`
- this means `COMMIT_TRIAGE` can remain optional before payment without creating a schema gap

#### Payment lane

Use one of:

- `process_wallet_payment`
- `process_cash_payment_v2`
- `approve_cash_payment` / `decline_cash_payment` on the org-admin side when cash requires approval

Important product implication:

- cash may produce a `pending_approval` lane before true dispatch progresses
- if that appears in the UI, it should still remain a map-first status state, not a legacy modal break

Demo/hybrid addendum:

- demo-backed hospitals still create real requests through `create_emergency_v4`
- demo-backed payment should not wait for a human org-admin approval step
- the existing demo auto-approval function should collapse the wait quickly while still flowing through the real approval RPC and the real tracking lifecycle

### 8.7 Realtime / automation consequences after commit

Once the real request exists, the backend already supports the rest of the journey.

Existing automation / fan-out chain includes:

- emergency-to-visit sync
- ambulance assignment / reassignment
- doctor assignment / failover
- resource availability syncing
- realtime status propagation into patient and console surfaces

Product implication:

- the app does **not** need a second UI system after payment
- `TRACKING` should simply project the truth already maintained in `EmergencyContext.jsx` and realtime subscriptions

### 8.8 Runtime ownership for the refactor

Recommended ownership split:

- `MapScreen.jsx` — owns the map shell, selected hospital, selected care, and top-level sheet mode
- `MapSheetOrchestrator.jsx` — owns the visible sheet state machine and transitions between ambulance phases
- `EmergencyContext.jsx` — owns nearby hospitals, coverage mode, active emergency truth, and realtime tracking state
- `useRequestFlow.js` / `services/emergencyRequestsService.js` — own commit-time request creation and mutation
- Supabase RPC layer — owns the irreversible operational commit and lifecycle validity

### 8.9 Implementation rule for MVP

For the first map-first refactor pass:

1. move ambulance decision into the map sheet
2. move details + verification inline into the map sheet
3. keep triage as optional update flow in the same shell (primary commit path may bypass it)
4. keep payment and all post-submit payment states in the same shell
5. project tracking in the same shell after commit
6. stop routing new users into the old `showLegacyFlow -> EmergencyRequestModal` branch for the main ambulance path

That gives iVisit the correct first-pass emergency reading:

- the user sees the map
- the system recommends the closest workable response
- the user confirms
- details, optional triage, and payment complete the release
- tracking begins without ever leaving the map
