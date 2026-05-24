---
status: living
owner: architecture
last_updated: 2026-05-11
---

# Manual Address Entry - Apple-Standard Progressive Address Resolution Redesign

**Date:** 2026-05-10
**Status:** PARTIALLY IMPLEMENTED - audit required before next feature pass
**Owner:** `components/map/views/locationIntent/`
**Depends on:** LocationSheet Pass 1-3 complete, `LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md`

---

## 2026-05-11 Implementation Checkpoint

The manual address flow is now partially implemented in `components/map/views/locationIntent/`.

Implemented:

- Inline country search.
- Country-specific region/state label overrides.
- Nigeria-specific correction:
  - Step 1: Country
  - Step 2: State
  - Step 3: City
  - Step 4: LGA or area
  - Step 5: Street, landmark, or place
- Manual search context now includes previous fields:
  - `districtArea`
  - `city`
  - `adminArea`
  - `country`
- Typed fallback exists for weak/no provider results.
- Pressing `Next` with a typed search query can advance the flow.
- Changing earlier geography clears dependent later fields.
- The sheet header owns manual mode identity:
  - active step as heading
  - `Manual Entry - Step x of y` as subheading
- Helper copy has been reduced.
- Mojibake in touched manual/location files was normalized to plain ASCII where possible.

Still not complete:

- Confirm-pin fallback is not yet a fully implemented recovery phase.
- Provider result confidence is not yet visibly reviewed in a final map-confirmation state.
- Keyboard and sticky footer behavior need runtime validation on mobile web and device.
- Manual field components need decomposition before adding more country-specific cases.

Audit required:

- Run the manual-address slice in the deep audit plan before adding more features.
- See [`../../audit/map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md`](../../audit/map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md).

---

# Philosophy

This redesign shifts manual address entry away from:

* bureaucratic address forms,
* hard validation,
* and modal-heavy flows

toward:

* calm progressive disclosure,
* guided location confidence,
* and Apple-standard contextual refinement.

The goal is not:

> "collect a perfect postal address."

The goal is:

> "help responders reliably find the user."

The flow should feel:

* lightweight,
* forgiving,
* map-native,
* and emotionally calm under stress.

---

# Core UX Principle

Manual entry is:

## a guided location refinement system

NOT:

## a traditional address form.

The system should:

* progressively improve search confidence,
* preserve flow continuity,
* and gracefully degrade into map confirmation.

Final dispatch truth becomes:

```txt
Confirmed map pin
+ structured admin hierarchy
+ landmark/place context
+ responder notes
```

-not strict street validation.

---

# Problem

The current manual entry flow is a full-screen stepped wizard:

* one blank `TextInput` per step,
* linear progression,
* and no structured contextual refinement.

This creates several problems:

* administrative fields use the wrong affordance
* users type information that should be selected
* no visual confidence hierarchy exists
* no contextual narrowing occurs between steps
* Mapbox alone is unreliable for global street validation
* worldwide address systems vary dramatically

The larger architectural issue:

> the system currently treats manual entry like a postal form instead of a location-resolution flow.

---

# New Address Architecture

## Hybrid Worldwide Address Resolution System

iVisit will use:

| Responsibility                | Source                 |
| ----------------------------- | ---------------------- |
| Country hierarchy             | Static dataset         |
| Region / state / province     | OSM-derived dataset    |
| City / area hierarchy         | OSM-derived dataset    |
| Street / landmark suggestions | Mapbox + OSM/Nominatim |
| Final truth                   | User-confirmed map pin |

---

# Important Direction

Mapbox is NOT the sole authority anymore.

Instead:

```txt
Structured hierarchy
down
OSM-derived datasets

Street/place refinement
down
Mapbox + OSM search

Final dispatch truth
down
Confirmed pin
```

This removes dependency on perfect street indexing globally.

---

# Progressive Step Flow

```txt
Where should help come

[ Use Current Location ]
[ Search Address or Landmark ]
[ Enter Manually ]
```

---

# Manual Flow Structure

```txt
Step 1 - Country
Step 2 - Region / State / Province
Step 3 - City / Area
Step 4 - Street, Landmark, or Nearby Place
Step 5 - Apartment / Directions
Step 6 - Confirm Pin on Map
```

---

# Critical Worldwide Rule

The system must NEVER assume:

* all countries have states,
* all users know postal addresses,
* or all streets are indexed.

Therefore:

* labels adapt dynamically,
* validation remains forgiving,
* and street matching is assistive, not mandatory.

---

# Dynamic Administrative Labels

Internally:

```js
adminLevel1
adminLevel2
```

UI labels adapt by country.

Examples:

| Country | Label           |
| ------- | --------------- |
| USA     | State           |
| Canada  | Province        |
| UK      | Region / County |
| Japan   | Prefecture      |
| UAE     | Emirate         |
| Nigeria | State           |

---

# Step Affordance Model

| Step | Field                            | Affordance       |
| ---- | -------------------------------- | ---------------- |
| 1    | Country                          | Select + Search  |
| 2    | Region / Province / State        | Select + Search  |
| 3    | City / Area                      | Select + Search  |
| 4    | Street / Landmark / Nearby place | Search drop      |
| 5    | Apartment / Directions           | Free text        |
| 6    | Confirm location                 | Map confirmation |

---

# Drop State Concept

A "drop state" means:

* inline expansion inside the same sheet,
* no pushed modal,
* one active context at a time,
* surrounding progress remains visible.

The active field expands inline while previous fields collapse into compact summaries.

This preserves:

* continuity,
* orientation,
* and calmness.

---

# Apple-Standard Interaction Philosophy

The system should ask:

```txt
Help us find you
```

NOT:

```txt
Enter your full address
```

The tone throughout should feel:

* assistive,
* low-pressure,
* and forgiving.

---

# Layout Contract

```txt
Header
Progress track
Completed step summaries
Active expanded step
Sticky footer CTA
```

The footer CTA is ALWAYS visible.

---

# Completed Step Summaries

Completed steps collapse into compact rows:

```txt
Country: United States                done
Region: California                   done
City: Los Angeles                  done
Place: Street or landmark           <- active
```

Tapping a summary reopens that step inline.

Only ONE expanded context may exist at a time.

---

# Country / Region / City Steps

## Affordance

```txt
Searchable select list
```

NOT:

```txt
free text input
```

---

# Data Source

These steps use:

* OSM-derived datasets,
* local indexed hierarchy,
* or cached structured data.

NOT Mapbox.

This ensures:

* deterministic hierarchy,
* fast filtering,
* predictable UX,
* and lower API dependency.

---

# Step 4 - Street / Landmark / Nearby Place

This is the only true geocoder-assisted step.

Label:

```txt
Street, landmark, or nearby place
```

Examples:

* Allen Avenue
* Near Shoprite
* Blue Gate Estate
* Opposite City Mall
* LASUTH
* St. Mary Church

---

# Search Logic

Structured query assembled progressively:

```js
[
  place,
  city,
  region,
  country
]
.filter(Boolean)
.join(", ")
```

Example:

```txt
Admiralty Way, Lekki, Lagos, Nigeria
```

or:

```txt
Near Shoprite, Lekki, Lagos, Nigeria
```

---

# Search Providers

## Primary

Mapbox

## Fallback

OpenStreetMap / Nominatim

---

# Search Resolution Strategy

```txt
1. Try Mapbox
2. If confidence weak -> try OSM/Nominatim
3. If unresolved -> center map on selected city/region
4. User adjusts pin manually
5. Save responder notes
```

The flow must NEVER dead-end because a street was not found.

---

# Apartment / Directions Step

Free text.

Examples:

* Apt 4B
* Blue gate
* Third floor
* Beside pharmacy
* Back entrance

This field is critical for responders.

---

# Confirm Pin Step

This is the final truth layer.

The user sees:

* resolved map location,
* nearby roads/landmarks,
* and can adjust the pin manually.

CTA:

```txt
Confirm pickup location
```

---

# Error Philosophy

Never show:

```txt
Invalid address
```

Instead:

```txt
We couldn't verify the exact location.
Place the pin as close as possible and add directions for responders.
```

---

# Navigation Rules

Back navigation:

* preserves draft state,
* preserves selected hierarchy,
* preserves expanded step,
* never resets the flow unintentionally.

Completed steps remain editable.

---

# Transition Rules

Step transitions:

* subtle horizontal spring motion,
* surrounding shell remains mounted,
* no blank flashes,
* reduced-motion fallback supported.

---

# Auto-Fill Cascade

Selecting a full place result cascades upward silently:

```txt
street/place
-> city
-> region
-> country
```

Only fills EMPTY fields.

Never overwrites user-confirmed data.

---

# Geocode Commit Rules

Manual entry NEVER directly mutates pickup state.

Instead:

```txt
Manual draft
-> geocode
-> candidate state
-> explicit confirmation
-> commit pickup
```

---

# State Architecture

## Manual Draft

```js
{
  country,
  countryCode,
  adminLevel1,
  adminLevel2,
  placeOrLandmark,
  apartmentDetails,
  responderNote,
  coordinates
}
```

---

# Important Architectural Principle

This system is:

## location-confidence-driven

NOT:

## postal-address-validation-driven.

That distinction defines the entire UX quality of the flow.

---

# Final UX Goal

The manual flow should feel:

* calm,
* modern,
* forgiving,
* globally adaptable,
* and Apple-grade.

The user should never feel:

* trapped in a form,
* punished by validation,
* or blocked by imperfect address systems.

The experience should instead communicate:

```txt
Help us understand where you are.
We'll work with you to locate you accurately.
```
