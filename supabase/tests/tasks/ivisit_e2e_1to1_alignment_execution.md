## Task: iVisit End-to-End 1:1 Alignment Execution (App + DB + Console)

### **Objective**
Restore and validate a traceable 1:1 flow across `ivisit-app`, Supabase, and `ivisit-console/frontend` so UI-rendered values and automation outcomes match the database for core emergency, payment, visit, dispatch, and provider mobile workflows.

### **Prerequisites**
- Both repos are on the current remediation branch with Phase 1 service contract fixes applied
- Supabase project credentials available (`EXPO_PUBLIC_SUPABASE_URL`, service role key for audit scripts)
- All core migrations (through `20260219010000_core_rpcs.sql`) deployed
- Read/write access to staging database (production optional and only after staging pass)
- Validation references available:
  - `supabase/tests/tasks/task_validation.md`
  - `supabase/tests/tasks/comprehensive_system.md`
  - `supabase/tests/fixes/verify_flow.sql`

### **Test Steps**
1. **Run read-only alignment audit (JS)**
   - Action: Execute `node supabase/tests/scripts/run_alignment_audit.js`
   - Expected result: JSON report generated with counts, coverage gaps, dispatch linkage health, duplicate candidates
   - Validation method: Check `supabase/tests/validation/e2e_alignment_report.json`

2. **Run read-only SQL audit (DB-side evidence snapshot)**
   - Action: Execute `supabase/tests/fixes/ivisit_e2e_alignment_audit.sql` in Supabase SQL editor (or psql)
   - Expected result: Structured result sets for bootstrap coverage, org wallets, emergency/visit linkage, active dispatch completeness, duplicate candidates, trigger/function presence
   - Validation method: Save query outputs/screenshots and compare to JS report

3. **Apply idempotent backfill on staging**
   - Action: Execute `supabase/tests/fixes/ivisit_e2e_alignment_backfill.sql`
   - Expected result: Missing org wallets inserted, missing emergency-linked visits backfilled, payment org links enriched where derivable
   - Validation method: Inspect step result rows in script output and post-backfill summary

4. **Re-run audits (JS + SQL)**
   - Action: Repeat Steps 1 and 2
   - Expected result: Gaps reduced materially (especially `organization_wallets` and `emergency_requests -> visits`)
   - Validation method: Diff the before/after reports

5. **Run flow verification SQL**
   - Action: Execute `supabase/tests/fixes/verify_flow.sql`
   - Expected result: Key RPCs and trigger dependencies are present and callable
   - Validation method: SQL notices / result output

6. **Execute cross-app flow smoke tests (staging data)**
   - Action: Run manual flow matrix:
     - iVisit app creates emergency (card + cash variants)
     - Console sees request
     - Console/provider dispatches / accepts
     - Tracking fields update
     - Visit record appears and transitions
     - Completion and cash approval/decline update all linked entities
   - Expected result: State transitions match in both UIs and DB records
   - Validation method: Compare UI values to direct DB rows by `display_id` / UUID

7. **Provider mobile usability validation**
   - Action: Test provider-role views on mobile pages (visits, emergencies, map, dashboard metrics)
   - Expected result: No false empty states due to scoping drift; actionable lists and CTAs are available
   - Validation method: Record provider account screenshots + DB query matches

### **Expected Results**
- **Bootstrap automations**: 1:1 profile-dependent records (`preferences`, `medical_profiles`, `patient_wallets`)
- **Org wallet automations/backfill**: `organization_wallets` count matches `organizations` count
- **Emergency-to-visit linkage**: Every emergency request has a linked visit (or documented exception)
- **Payment linkage quality**: `payments.organization_id` present where `emergency_request_id` is present and hospital->organization mapping exists
- **Dispatch observability**: Active emergencies show expected linkage (`ambulance_id`, `responder_id`) and tracking fields when flow is exercised
- **UI parity**: App and console show the same core values for request status, hospital, responder, payment status, visit state

### **Error Scenarios**
- **SQL audit shows schema drift**: Stale service/UI fields still in use -> patch service/page contracts before rerunning
- **Backfill inserts zero visits while emergencies exist**: `request_id` link already populated or query mismatch -> inspect `visits.request_id` null/duplicates
- **Active emergencies still unlinked after backfill**: This is flow/automation entrypoint drift, not a backfill issue -> test creation/dispatch paths directly
- **Function exists but runtime fails**: Likely source/runtime column mismatch (e.g. automation references non-existent columns) -> inspect function source and patch migration/fix SQL
- **Provider mobile empty state persists**: RBAC scoping mismatch or hospital/provider mapping missing -> validate `profiles.organization_id`, `hospitals.organization_id`, provider assignments

### **Success Criteria**
- [ ] `organization_wallets` count equals `organizations` count
- [ ] `emergency_requests` have linked `visits` for all historical rows (or documented exclusions)
- [ ] Core flow smoke tests pass for card and cash emergency variants end-to-end
- [ ] Console + app UI values match DB values for sampled records (request, payment, visit)
- [ ] Provider mobile views show scoped records and actions without false empty states
- [ ] Validation artifacts (JSON + SQL outputs) saved for traceability

### **Constraints**
- **Time limits**: 30-60 minutes for audit + backfill + re-audit; additional time for manual flow tests
- **Resource limits**: Use staging DB first; production changes require explicit review checkpoint
- **Data limits**: Backfill script is idempotent and non-destructive (no deletes)
- **Access limits**: Service-role access recommended for scripted audits; SQL editor access required for backfill execution

### **Dependencies**
- **Required tasks**:
  - Phase 1 service-contract patch pack (app + console)
  - Core migration deployment validation
- **System dependencies**:
  - Supabase database
  - `ivisit-app` and `ivisit-console/frontend` runtime environments
- **Data dependencies**:
  - Existing organizations/emergencies for audit/backfill
  - At least one provider, hospital, ambulance for dispatch smoke tests

### **Execution Artifacts (This Task)**
- `supabase/tests/scripts/run_alignment_audit.js`
- `supabase/tests/scripts/apply_alignment_backfill.js`
- `supabase/tests/fixes/ivisit_e2e_alignment_audit.sql`
- `supabase/tests/fixes/ivisit_e2e_alignment_backfill.sql`
- `supabase/tests/validation/e2e_alignment_report.json` (generated)

### **Rollout Sequence (Strict)**
1. Staging audit (JS + SQL)
2. Staging backfill
3. Staging re-audit
4. Staging end-to-end smoke tests (app -> DB -> console)
5. Review evidence
6. Production audit
7. Production backfill (if approved)
8. Production re-audit and smoke verification
