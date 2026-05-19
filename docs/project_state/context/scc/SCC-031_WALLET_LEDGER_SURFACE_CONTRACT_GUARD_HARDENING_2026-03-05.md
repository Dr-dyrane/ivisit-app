# SCC-031 Wallet Ledger Surface Contract Guard Hardening (2026-03-05)

## Objective
Add a deterministic preventive guard lane for `wallet_ledger` to keep app/console type parity locked, enforce canonical query columns, and constrain console ledger mutations to approved insert-only paths.

## Why This Was Needed
`wallet_ledger` flow trace is currently clean, but this table is high-risk because:
- it affects finance reporting and settlement visibility,
- console has direct read/write touchpoints for repair workflows.

Without a dedicated guard, future drift could introduce non-canonical field usage or unsafe mutation patterns.

## Implemented
1. Deterministic wallet-ledger guard:
   - `supabase/tests/scripts/assert_wallet_ledger_surface_field_guard.js`
   - validates:
     - app/console `wallet_ledger` parity for `Row`/`Insert`/`Update`,
     - canonical select-column safety for any console `.from('wallet_ledger').select(...)`,
     - forbids direct console `.update/.delete/.upsert` on `wallet_ledger`,
     - allows direct `.insert(...)` only from approved wallet service path(s):
       - `src/services/walletService.js`.
   - report:
     - `supabase/tests/validation/wallet_ledger_surface_field_guard_report.json`.

2. Command + docs integration:
   - `package.json`:
     - `hardening:wallet-ledger-surface-field-guard`
   - `supabase/docs/TESTING.md`:
     - added guard command documentation.

3. Trace artifact refresh:
   - `supabase/tests/validation/table_flow_trace_wallet_ledger.json`
   - `supabase/tests/validation/table_flow_trace_wallet_ledger.md`.

## Verification (This Run)
- `node supabase/tests/scripts/export_table_flow_trace.js --table wallet_ledger`: PASS (2026-03-05)
- `npm run hardening:wallet-ledger-surface-field-guard`: PASS (2026-03-05)
- `npm run build` (console frontend): PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)

## Notes
- A transient Supabase `502` occurred during one cleanup guard attempt; rerun passed with zero planned side effects.
