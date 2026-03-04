# Demo Coverage Flow: Task Verification Guide

## Goal
When a user has poor/no **verified** nearby coverage, let them switch to a deterministic demo ecosystem without breaking core emergency flows.

## Deterministic Phases
1. `prepare`
2. `hospitals`
3. `staff`
4. `pricing`
5. `summary`

Source of truth: Edge Function `bootstrap-demo-ecosystem` (idempotent, phase-based, no schema migration).

## Data Rules
- Demo entities are tagged and traceable:
  - `hospitals.place_id` starts with `demo:`
  - `hospitals.verification_status = demo_verified`
  - `hospitals.features` contains `demo_seed`, `demo_verified`, `ivisit_demo`
- Demo rows are safe to distinguish from live production rows.
- Demo mode is user-level via `preferences.demo_mode_enabled`.

## UX Rules
- Coverage modal shows `Switch To Demo Experience` when live verified coverage is poor/none.
- Demo bootstrap modal is non-dismissible while phases run.
- Phase progress is explicit (`pending`, `running`, `completed`, `failed`).
- Completion shows celebratory feedback and returns user to emergency map.
- Banner reminder appears when demo mode is active.
- User can toggle demo mode in **More > Demo Mode**.

## Acceptance Checks
1. No-coverage user sees coverage apology + demo switch CTA.
2. Tapping demo switch runs all phases successfully.
3. Demo hospitals become visible and are marked verified for experience continuity.
4. Demo mode toggle off hides demo hospitals.
5. Demo mode toggle on restores demo hospitals.
6. Coverage reminder opt-out still suppresses repeated reminder UX.
7. No destructive DB operations are used.

## Failure Handling
- Any phase error:
  - active phase marked `failed`
  - clear toast surfaced to user
  - modal remains closable after run stops
- Partial success:
  - rerunning is safe; edge function upserts and reuses deterministic identifiers.

## Console Subscriber 400 Fix Verification
Problem: console create payload wrote columns not present in `public.subscribers`.

Checks:
1. Create subscriber from console succeeds (HTTP 200/201).
2. Update subscriber succeeds without unknown-column errors.
3. `markWelcomeEmailSent` succeeds and sets:
   - `welcome_email_sent = true`
   - `new_user = false`
   - `status = active`
