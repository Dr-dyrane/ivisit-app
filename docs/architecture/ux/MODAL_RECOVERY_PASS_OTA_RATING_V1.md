# Modal Recovery Pass: OTA Updates And Ratings

Status: in progress
Owner surface: root OTA modal layer and map rating modal
Rollback scope: isolated UI pass

## Problem

Two app-owned modals were creating avoidable friction:

- OTA completed state could trap users because the only obvious dismissal path was tapping outside the modal.
- Rating asked for rating, service context, note, tip, wallet state, and actions all at once, pushing CTAs below the first glance and creating visual congestion.

## Design Rules

- Every modal must have an explicit close affordance.
- Backdrop press can remain, but never be the only close path.
- One primary task should dominate the first glance.
- Rating stars are the primary task.
- Note and tip are progressive optional sections, collapsed by default.
- CTAs must remain visible without requiring users to discover a scroll path.
- Use existing iVisit modal language: borderless surfaces, continuous corners, restrained copy, platform-aware glass where already available, compact button heights.

## OTA Update Modal Contract

Available update:

```txt
Update ready
Restart to apply the latest improvements.

Later
Restart
```

Completed update:

```txt
You're up to date
iVisit is now running version {VERSION}.

Done
```

Rules:

- Show close icon in the modal header area.
- Completed state must be dismissible by close icon, Done, and backdrop.
- Keep copy short; avoid release-note style detail in this modal.

## Rating Modal Contract

First glance:

```txt
Rate your {service}
★★★★★

Add a note     >
Add a tip      >

Skip
Submit
```

Rules:

- Rating stars remain expanded.
- Note is collapsed by default; expand only on user intent.
- Tip is collapsed by default; expand only on user intent.
- Wallet balance and low-wallet warning only appear inside expanded tip.
- Actions live outside the scroll body where the modal shell supports a footer.

## Review Harness

Temporary dev review controls were used during the pass and removed before commit. Modal visibility is back to OTA update state and rating lifecycle state only.

## Rollback

To roll this pass back:

1. Restore `components/ui/UpdateAvailableModal.jsx`.
2. Restore `components/emergency/ServiceRatingModal.jsx`.
3. Restore `components/emergency/serviceRatingModal.styles.js`.
4. Keep this document as the rollback note or move it to archived UX notes after the pass is accepted.
