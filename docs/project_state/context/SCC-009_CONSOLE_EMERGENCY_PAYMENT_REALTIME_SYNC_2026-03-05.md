# SCC-009 Console Emergency/Payment Realtime Sync (2026-03-05)

## Objective
Remove manual-refresh dependency for emergency approval/dispatch visibility by synchronizing emergency request and payment updates in realtime.

## Scope
- `ivisit-console/frontend/src/components/pages/EmergencyRequestsPage.jsx`
- `ivisit-console/frontend/src/components/modals/EmergencyDetailsModal.jsx`

## Implemented Changes
1. Emergency page realtime source expansion
- Added realtime listener for `payments` in addition to `emergency_requests` on the existing emergency page channel.
- Kept existing normalized fetch pipeline so payment updates reflow into canonical request rows.

2. Selected-row staleness fix
- After each request refresh, selected request snapshot now rebinds to the latest normalized row by `id`.
- This keeps details/actions aligned with latest backend state when changes arrive from realtime events.

3. Details modal request-scoped realtime sync
- Added request-scoped channel in `EmergencyDetailsModal` while modal is open:
  - `payments` filtered by `emergency_request_id`,
  - `emergency_requests` filtered by request `id`.
- Payment changes refresh approval data immediately.
- Emergency status changes trigger visit-outcome refresh for terminal states (`completed`, `cancelled`) and payment refresh for active states.

## Why This Slice
- Prior flow could still appear stale until manual refresh when payment-side updates occurred.
- Realtime synchronization is lower-latency and lower-friction than adding polling loops.

## Verification
- `npm run build` in `ivisit-console/frontend`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` in `ivisit-app`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` in `ivisit-app`: PASS (2026-03-05)
