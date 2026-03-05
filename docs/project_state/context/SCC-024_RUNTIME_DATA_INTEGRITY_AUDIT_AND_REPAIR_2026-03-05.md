# SCC-024 Runtime Data Integrity Audit + Repair (2026-03-05)

## Objective
Stop relying on memory/debug traces by adding a deterministic live-data audit lane and repair path for runtime anomalies that static schema/UI checks can miss.

## Why This Was Needed
We confirmed a real gap:
- static contract guards passed,
- but live data still had missing cash fee deductions and null visit display fields.

## Implemented
1. Runtime audit script:
   - `supabase/tests/scripts/assert_runtime_data_integrity.js`
   - checks:
     - completed cash payments with expected fee have both ledger legs:
       - org wallet debit
       - platform wallet credit
     - pending approval requests have coherent pending payment state
     - linked visit records are not orphaned and have hospital display backfill quality
   - report:
     - `supabase/tests/validation/runtime_data_integrity_report.json`

2. Deterministic repair script:
   - `supabase/tests/scripts/repair_runtime_data_integrity.js`
   - supports dry-run and `--apply`
   - repairs:
     - missing cash fee ledger entries
     - missing `payments.ivisit_fee_amount` + fee metadata persistence
     - missing `visits.hospital_name` from linked emergency request
   - report:
     - `supabase/tests/validation/runtime_data_integrity_repair_report.json`

3. Commands added:
   - `hardening:runtime-data-integrity`
   - `hardening:runtime-data-repair`
4. Pipeline integration:
   - `hardening:full` now includes `hardening:runtime-data-integrity` as a required gate.

## Evidence (This Run)
- Initial audit (detected issues): FAIL
  - critical cash fee ledger misses: 4
  - warnings (fee persistence + visit hospital display): 7
- Repair dry-run: PASS
- Repair apply: PASS
  - cash fee debits inserted: 4
  - cash fee credits inserted: 4
  - payment fee persistence updates: 4
  - visit hospital-name backfills: 3
- Post-repair audit: PASS
  - no critical anomalies
  - no warnings

## Verification
- `npm run hardening:runtime-data-integrity` (detect pass/fail lane): PASS post-repair (2026-03-05)
- `npm run hardening:runtime-data-repair -- --apply`: PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
