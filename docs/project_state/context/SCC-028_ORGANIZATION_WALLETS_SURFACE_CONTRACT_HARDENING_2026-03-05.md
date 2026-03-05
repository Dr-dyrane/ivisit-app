# SCC-028 Organization Wallets Surface Contract Hardening (2026-03-05)

## Objective
Lock `organization_wallets` contract parity and enforce deterministic query-column safety in console wallet surfaces.

## Why This Was Needed
`organization_wallets` flow trace review showed a type-cardinality parity gap:
- app canonical type marked `organization_wallets_organization_id_fkey` as `isOneToOne: true`;
- console type marked the same FK as `isOneToOne: false`.

Without a guard lane, this kind of drift can reappear silently while query surfaces continue to evolve.

## Implemented
1. Console type parity fix:
   - `../ivisit-console/frontend/src/types/database.ts`
   - updated `organization_wallets` relationship metadata:
     - `organization_wallets_organization_id_fkey` -> `isOneToOne: true`.

2. Deterministic organization-wallets guard:
   - `supabase/tests/scripts/assert_organization_wallets_surface_field_guard.js`
   - enforces:
     - app/console `organization_wallets` field parity for `Row`/`Insert`/`Update`,
     - relationship cardinality parity for `organization_wallets_organization_id_fkey`,
     - console query select safety for `organization_wallets` (canonical columns only or `*`) across:
       - `src/services/walletService.js`
       - `src/services/organizationsService.js`
       - `src/components/pages/WalletManagementPage.jsx`
       - `src/contexts/PageDataContext.jsx`
   - report:
     - `supabase/tests/validation/organization_wallets_surface_field_guard_report.json`.

3. Command + docs integration:
   - `package.json`:
     - `hardening:organization-wallets-surface-field-guard`
   - `supabase/docs/TESTING.md`:
     - added guard command documentation.

4. Trace refresh:
   - `supabase/tests/validation/table_flow_trace_organization_wallets.json`
   - `supabase/tests/validation/table_flow_trace_organization_wallets.md`.

## Verification (This Run)
- `node supabase/tests/scripts/export_table_flow_trace.js --table organization_wallets`: PASS (2026-03-05)
- `npm run hardening:organization-wallets-surface-field-guard`: PASS (2026-03-05)
- `npm run build` (console frontend): PASS (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard`: PASS (2026-03-05)
- `npm run hardening:contract-drift-guard`: PASS (2026-03-05)
