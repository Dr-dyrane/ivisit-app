# SCC-011 RPC Authority Guard (2026-03-05)

## Objective
Close SCC-005 finding F3 by enforcing canonical ownership for duplicate RPC signatures across migration modules.

## Scope
- `supabase/tests/scripts/assert_rpc_authority_map.js`
- `package.json`
- Validation artifact:
  - `supabase/tests/validation/rpc_authority_guard_report.json`

## Implemented Changes
1. Deterministic RPC authority guard
- Added migration scanner that parses `CREATE OR REPLACE FUNCTION public.*` signatures.
- Detects:
  - cross-file duplicate signatures,
  - same-file duplicate signatures.
- Enforces:
  - cross-file duplicates must be explicitly mapped in allowlist with canonical owner migration,
  - same-file duplicates must be explicitly mapped in debt allowlist.

2. Canonical authority map enforcement
- Captured current cross-module duplicate signatures (for emergency/dispatch flows) and asserted canonical owner as `20260219010000_core_rpcs.sql`.
- Guard now fails on:
  - new unmapped duplicates,
  - owner drift for allowlisted duplicates,
  - canonical owner drift.

3. Hardening command surface
- Added `hardening:rpc-authority-guard` script in `package.json`.
- Script writes report to `supabase/tests/validation/rpc_authority_guard_report.json`.

## Why This Slice
- Duplicate function names across domain and core facade modules are currently intentional, but previously unenforced.
- Without explicit guardrails, semantic drift can silently change authority boundaries.
- This slice locks the current authority model and forces intentional updates when migrations evolve.

## Verification
- `npm run hardening:rpc-authority-guard`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
