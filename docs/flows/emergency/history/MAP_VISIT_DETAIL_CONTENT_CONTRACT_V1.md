# Map Visit Detail Content Contract V1

## Purpose

Visit details on `/map` must not be designed as an isolated detail dump.
They should be composed from proven `/map` surface primitives, preserve key legacy utility, and obey the same runtime rules as the rest of the map flow:

- calm under urgency
- one primary action per state
- progressive disclosure
- low visual cognition
- explicit null handling
- platform-inclusive structure

This document is the implementation contract for the visit-detail sheet.

## Source Surface Harvest

These existing `/map` surfaces already define the language visit details should use:

- `explore_intent` hospital summary:
  facility-first identity, short meta, compact support pills
- `history` grouped rows:
  title, subtitle, status chip, grouped chronology
- `hospital_detail`:
  quiet floating top slot and facility-led header language
- `service_detail`:
  service-type pill, hero meta pills, feature bullets, support-card rhythm
- `commit_payment`:
  hero blade, grouped info rows, payment support blocks
- `commit_triage`:
  secondary triage/progress support block for emergency-derived history
- `tracking`:
  route card, factual details card, grouped actions, single strong primary CTA

Visit details should reuse these patterns instead of inventing new ones.

## Core UX Contract

### Mid Snap

Mid snap answers only:

1. What is this?
2. Where is it?
3. What state is it in?
4. What should I do next?

Mid snap should contain:

- quiet top slot
- identity hero
- one primary CTA
- one compact passport facts card with 3 to 5 rows

Mid snap should not contain:

- long route explanation
- payment breakdown
- full notes dump
- large action lists
- triage dumps

### Expanded

Expanded adds support context:

- journey / route card when relevant
- additional facts card
- payment support card
- preparation or notes
- triage summary if meaningful
- grouped secondary actions

## Top Slot Contract

The top slot should stay quiet.

- `title`:
  facility name
- `subtitle`:
  status plus time context when available

Examples:

- `Odyssey Hospice`
  `Upcoming • Apr 23 / 10:40 AM`
- `Odyssey Hospice`
  `Active • 6 min away`
- `Odyssey Hospice`
  `Completed • Apr 18 / 3:20 PM`

The top slot is not the place for dense metadata.

## Hero Contract

The hero is the passport identity block.

It should contain:

- request orb or image/avatar
- service/visit title
- one short secondary identity line
- facility support line only if still useful
- status chip
- up to two short pills

Examples:

- Scheduled visit:
  - title: `Telehealth follow-up`
  - secondary: `Cardiology • Dr. A. Bello`
  - pill: `Apr 23 / 10:40 AM`

- Ambulance:
  - title: `Everyday care transport`
  - secondary: `Demo Driver 2 • Type III`
  - pill: `6 min away`

- Bed:
  - title: `Private room reservation`
  - secondary: `Private room • Bed 12`
  - pill: `Waiting approval`

## Content by Request Type

### Scheduled Visit

#### Mid Snap

- hero
- primary CTA:
  - `Join video`
  - or `Rate visit`
  - or none
- compact facts:
  - When
  - Specialty
  - Clinician
  - Room
  - Reference

#### Expanded

- additional details:
  - next visit
  - rating
  - feedback
  - notes
- payment support block
- preparation block
- grouped actions:
  - call clinic
  - join video
  - book again
  - directions

### Ambulance / Emergency Transport

#### Mid Snap

- hero
- primary CTA:
  - `Resume tracking`
  - or `Rate visit`
- compact facts:
  - ETA or When
  - Responder
  - Vehicle / service level
  - Reference

#### Expanded

- journey card
- additional details:
  - specialty if present
  - responder phone if present
  - payment support
  - rating / feedback / notes
- triage summary when meaningful
- grouped actions:
  - call clinic / responder
  - directions

### Bed Reservation

#### Mid Snap

- hero
- primary CTA:
  - `Resume request`
  - or `Rate visit`
- compact facts:
  - ETA or When
  - Bed type
  - Bed number
  - Reference

#### Expanded

- linked transport or journey card only when real transport context exists
- additional details:
  - room / bed specifics
  - payment support
  - rating / feedback / notes
- triage summary when meaningful
- grouped actions:
  - call facility
  - directions

## Null Handling Contract

Global rules:

- never render an empty label-value row
- never show placeholder noise for optional medical metadata
- prefer omission over `Unknown`
- hide entire optional sections when they have no meaningful rows

Fallback chains:

- hero image:
  `heroImageUrl -> doctorImage -> request orb`
- top slot title:
  `facilityName -> hospitalName -> title -> "Care request"`
- hero title:
  `visitTypeLabel -> requestTypeLabel -> "Care request"`
- actor:
  `doctorName -> actorName -> responderName`
- payment:
  `total + status + method -> paymentSummary -> omit`
- journey:
  render only when the route context is real enough to be legible

## Regression Guard

Do not regress legacy utility while migrating to `/map`.

The following remain required:

- strong row recognition in history
- filters / browse control for history
- clear provider visibility
- payment clarity
- active emergency rows resuming tracking instead of opening passive details first

## Implementation Shape

The visit-detail implementation should expose, at minimum:

- `topSlot`
- `hero`
- `primaryAction`
- `compactDetails`
- `journey`
- `expandedDetails`
- `paymentRows`
- `triageRows`
- `preparation`
- `actions`
- `canCancel`

This contract is intentionally explicit so the sheet remains easy to reason about and hard to regress.
