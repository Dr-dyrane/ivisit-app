# SCC-056: Console CRUD Matrix Surface Coverage Closure (2026-03-06)

## Objective
Close the remaining `console_ui_crud_contract_matrix` risk surfaces by hardening:
- matrix parser/config coverage for helper-built payload services
- explicit writable-field contracts in console services
- type parity for newly surfaced `hospitals` column drift

## Implemented
1. Matrix parser + surface config hardening:
- File: `supabase/tests/scripts/run_console_ui_crud_contract_matrix.js`
- Added key-source mappings:
  - `hospitals` -> `HOSPITAL_CREATE_FIELDS`, `HOSPITAL_UPDATE_FIELDS`
  - `organizations` -> `ORGANIZATION_CREATE_FIELDS`, `ORGANIZATION_UPDATE_FIELDS`
  - `support_tickets` -> `SUPPORT_TICKET_CREATE_FIELDS`, `SUPPORT_TICKET_UPDATE_FIELDS`
  - `support_faqs` -> `SUPPORT_FAQ_WRITABLE_FIELDS`
  - `medical_profiles` -> `MEDICAL_PROFILE_CREATE_FIELDS`, `MEDICAL_PROFILE_UPDATE_FIELDS`
- Extended `extractSetConstantValues` to parse both:
  - `const X = new Set([...])`
  - `const X = [...]`

2. Console service writable-field contracts:
- `../ivisit-console/frontend/src/services/hospitalsService.js`
  - Added `HOSPITAL_CREATE_FIELDS` and `HOSPITAL_UPDATE_FIELDS`
  - Enforced payload filtering against the active field allowlist.
- `../ivisit-console/frontend/src/services/organizationsService.js`
  - Added `ORGANIZATION_CREATE_FIELDS` and `ORGANIZATION_UPDATE_FIELDS`
  - Enforced payload filtering against the active field allowlist.
- `../ivisit-console/frontend/src/services/medicalProfilesService.js`
  - Added `MEDICAL_PROFILE_CREATE_FIELDS` and `MEDICAL_PROFILE_UPDATE_FIELDS`
  - Enforced payload filtering against the active field allowlist.

3. Type parity closure for surfaced drift:
- `types/database.ts`
- `../ivisit-console/frontend/src/types/database.ts`
- Added missing `hospitals` columns:
  - `icu_beds_available`
  - `total_beds`

## Verification
- `npm run hardening:console-ui-crud-matrix` PASS (`surfaces=28 risks=0`)
- `npm run hardening:targeted-matrix-guard` PASS
- `npm run hardening:governance-guards` PASS
- `npm run build` (console frontend) PASS

## Artifacts
- `supabase/tests/validation/console_ui_crud_contract_matrix_report.json`
- `supabase/tests/validation/targeted_matrix_coverage_report.json`
- `supabase/tests/validation/runtime_crud_relationship_batch_report.json`
