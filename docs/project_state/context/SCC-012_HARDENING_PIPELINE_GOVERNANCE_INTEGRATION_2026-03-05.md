# SCC-012 Hardening Pipeline Governance Integration (2026-03-05)

## Objective
Make governance checks mandatory in the canonical hardening pipeline by integrating inventory and RPC-authority guards directly into `hardening:full`.

## Scope
- `package.json`

## Implemented Changes
1. Added governance aggregate command
- `hardening:governance-guards`:
  - `hardening:inventory-guard`
  - `hardening:rpc-authority-guard`

2. Integrated governance checks into `hardening:full`
- Added governance guards at two gates:
  - pre-suite gate (before contract/matrix execution),
  - post-cleanup gate (after `cleanup-apply` and before final contract drift assertion).

## Why This Slice
- SCC-010 and SCC-011 added governance guards, but they were not yet guaranteed in the default full hardening execution.
- This slice removes optionality and enforces fail-fast governance in the main pipeline.

## Verification
- `npm run hardening:governance-guards`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
