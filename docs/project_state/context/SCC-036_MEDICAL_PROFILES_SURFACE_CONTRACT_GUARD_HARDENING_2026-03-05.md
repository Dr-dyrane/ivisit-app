# SCC-036: Medical Profiles Surface Contract Guard Hardening (2026-03-05)

## Objective
Lock `medical_profiles` contract parity and profile write safety across app + console:
- align console relationship contract with canonical app type,
- harden profile payload write surfaces (no raw input spread),
- ensure app profile update can recover from missing-row drift via upsert.

## Implemented Changes

### 1) Console Type Contract Reconciliation
- Updated: `../ivisit-console/frontend/src/types/database.ts`
- Restored canonical relationship metadata:
  - `medical_profiles_user_id_fkey` (`isOneToOne: true`) -> `profiles(id)`.

### 2) Medical Profile Service Hardening (Console)
- Updated: `../ivisit-console/frontend/src/services/medicalProfilesService.js`
- Added deterministic payload builder (`buildMedicalProfilePayload`) with:
  - field whitelist for canonical medical profile columns,
  - array normalization for `allergies`, `conditions`, `medications`,
  - nullable text normalization for emergency contact + insurance fields,
  - explicit boolean normalization for `organ_donor`.
- Removed raw `...input` payload update pattern.

### 3) Medical Profile Service Hardening (App)
- Updated: `services/medicalProfileService.js`
- Added robust normalization helpers for text + array inputs.
- Hardened update persistence to:
  - include canonical optional emergency/insurance fields when present,
  - upsert on `user_id` (bootstrap safety if profile row is missing),
  - preserve offline cache fallback behavior.

### 4) Deterministic Guard Lane (New)
- Added: `supabase/tests/scripts/assert_medical_profiles_surface_field_guard.js`
- Added npm command:
  - `hardening:medical-profiles-surface-field-guard`
- Guard checks:
  - app/console type parity for `medical_profiles` (`Row`/`Insert`/`Update`)
  - console relationship parity for `medical_profiles_user_id_fkey`
  - console medical profile update avoids raw input spread and non-schema payload keys
  - app medical profile update path keeps canonical upsert behavior.

### 5) Testing Docs + Plan/Tracker
- Updated: `supabase/docs/TESTING.md`
- Updated: `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
- Updated: `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Validation Evidence
- `node supabase/tests/scripts/export_table_flow_trace.js --table medical_profiles` PASS (2026-03-05)
- `npm run hardening:medical-profiles-surface-field-guard` PASS (2026-03-05)
- `npm run build` PASS in `../ivisit-console/frontend` (2026-03-05)
- `npm run hardening:cleanup-dry-run-guard` PASS (2026-03-05)
- `npm run hardening:contract-drift-guard` PASS (2026-03-05)
