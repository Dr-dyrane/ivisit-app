# Map Visit Detail Surface

## Overview

The visit detail sheet is a passport-style detail view for care history items on `/map`. It composes proven UI patterns from existing map surfaces with progressive disclosure, calm under urgency, and explicit null handling.

**Contract**: `docs/flows/emergency/history/MAP_VISIT_DETAIL_CONTENT_CONTRACT_V1.md`

---

## Architecture

```
MapVisitDetailStageBase (shell)
  └─ MapVisitDetailOrchestrator (state/flow)
       └─ MapVisitDetailBody (presentation)
            ├─ PassportHero
            ├─ PrimaryAction
            ├─ DetailRows (compact)
            ├─ JourneyCard (expanded)
            ├─ PaymentSection (expanded)
            ├─ TriageSection (expanded)
            ├─ ActionGroup
            └─ CancelButton
```

---

## Feature Parity Audit

### Hero Block
| Field | Legacy | Current | Status |
|-------|--------|---------|--------|
| Orb icon | requestType-based | same | ✅ |
| Title | historyItem.title | facilityName | ✅ |
| Subtitle | "type • date • time" | visit type only | ✅ Split kept |
| Facility line | facilityAddress | same | ✅ |
| Status chip | statusLabel | same | ✅ |

### Details Section
| Row | Status |
|-----|--------|
| When | ✅ |
| Type | ✅ |
| Specialty | ✅ |
| Clinician | ✅ |
| Room | ✅ |
| Reference | ✅ |
| Payment | ✅ (richer) |
| Next visit | ✅ |
| Rating | ✅ |
| Feedback | ✅ |
| Notes | ✅ |

### Actions
| Action | Status |
|--------|--------|
| Call clinic | ✅ |
| Join video | ✅ |
| Book again | ✅ |
| Directions | ✅ NEW |
| Payment details | ✅ NEW |

---

## Backend Data Inventory

### visits Table (Scheduled)
- **Identity**: id, displayId, requestId
- **Facility**: hospitalId, hospitalName, hospitalImage, address, phone, coordinates
- **Scheduling**: date, time, scheduledFor, type, status
- **Clinician**: doctorName, doctorImage, specialty
- **Clinical**: roomNumber, meetingLink, notes, preparation, nextVisit
- **Payment**: cost
- **Rating**: rating, ratingComment

### emergency_requests Table (Live)
- **Identity**: id, requestId, displayId
- **Service**: serviceType (ambulance|bed), specialty, ambulanceType, bedNumber, bedType
- **Facility**: hospitalId, hospitalName
- **Tracking**: estimatedArrival, status, responderName, responderPhone, responderVehicleType, responderVehiclePlate
- **Payment**: totalCost, paymentStatus, paymentMethodId

---

## UI Surface Harvest

Patterns borrowed from existing `/map` surfaces:

| Source Surface | Pattern | Used In |
|---------------|---------|---------|
| explore_intent | Facility-first summary | Hero identity block |
| service_detail | Service pills, meta | Hero badges |
| commit_payment | Payment breakdown | Payment section |
| commit_triage | Progress grouping | Triage section |
| tracking | Route card, factual rows | Journey card |
| hospital_detail | Gradients, image hero | Hero canvas |

---

## Theme Tokens

Surface-specific theme extensions in `history.theme.js`:

| Token | Usage |
|-------|-------|
| heroTextPanelSurface | Frosted glass panel behind hero text |
| heroBadgeSurface | Pill badges on image |
| heroImageScrimColors | Bottom-to-top gradient for text legibility |
| heroImageTopMaskColors | Top fade for safe area |
| heroOnImageTitleColor | Title over image |
| heroOnImageBodyColor | Body text over image |
| heroOnImageMutedColor | Secondary text over image |

---

## Null Handling Rules

1. **Never render empty label-value rows**
2. **Never show "Unknown" as placeholder noise**
3. **Hide entire optional sections when empty**
4. **Prefer omission over placeholder**

### Fallback Chains
| Field | Chain |
|-------|-------|
| Hero title | facilityName → hospitalName → title → "Care request" |
| Hero image | heroImageUrl → hospitalImage → doctorImage → request orb |
| Actor | doctorName → actorName → responderName → omit |
| Payment | totalCost + status → paymentSummary → omit |

---

## Journey Card Progress Mapping

| Status | Progress % |
|--------|-----------|
| completed / rating_pending | 100% |
| active | 72% |
| confirmed | 38% |
| pending | 20% |
| default | 56% |

---

## Files

| File | Responsibility |
|------|---------------|
| `MapVisitDetailBody.jsx` | Presentation components, hero, sections |
| `useMapVisitDetailModel.js` | Data resolution, memoized computations |
| `MapVisitDetailStageBase.jsx` | Sheet shell, expanded state |
| `mapVisitDetail.styles.js` | StyleSheet definitions |
| `history.content.js` | Copy/labels |
| `history.presentation.js` | Label formatters |
| `history.theme.js` | Theme tokens |

---

## Integration Points

- **MapScreen.jsx**: `handleOpenHistoryPaymentDetails` callback
- **MapSheetOrchestrator**: `onOpenHistoryPaymentDetails` prop
- **PaymentScreen.jsx**: Deep-link via `transactionId` / `historyRequestId` params

---

## Changelog

- **Apr 2026**: Hero canvas with image gradients, themed text panels
- **Apr 2026**: Journey card with progress connector and route pills
- **Apr 2026**: Rich payment resolution with currency parsing
- **Apr 2026**: Directions and payment details actions
- **Apr 2026**: Contract formalized in docs/
