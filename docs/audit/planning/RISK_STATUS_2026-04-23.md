# Risk Status Tracker — 2026-04-23

> Scope: resolution status of risks R1–R10 from [`ivisit_full_system_reconstruction_report_2026-03-02.md`](./ivisit_full_system_reconstruction_report_2026-03-02.md)
> Basis: evidence from [`../flows/emergency/workflow_map.md`](../flows/emergency/workflow_map.md) (Verification Snapshot 2026-03-03+), migration files, and hardening guard scripts under `supabase/tests/scripts/`
> Rule: each item is marked with the strongest evidence found. Items without a dated verification point are marked UNVERIFIED rather than assumed closed.

## Status Legend

- ✅ Resolved — evidence confirms the original failure mode no longer applies
- 🟡 Partial — core issue addressed, adjacent work remains
- ⚪ Unverified — no explicit resolution evidence in current docs or migrations; needs re-check
- 🟠 In Progress — tracked under an active execution plan

## Summary

| ID | Area | Severity | Status | Evidence Anchor |
|---|---|---|---|---|
| R1 | Realtime publication | P0 | ✅ | `workflow_map.md` Verification Snapshot 2026-03-03 |
| R2 | `discharge_patient` state | P0 | ✅ | `emergency_logic.sql:2060-2066` writes legal `status='completed'` |
| R3 | `auto_assign_driver` race | P0 | ✅ | `automations.sql:466` has `FOR UPDATE SKIP LOCKED` |
| R4 | Console direct writes | P0 | ✅ | `workflow_map.md` Verification Snapshot 2026-03-03 |
| R5 | Orphaned relations | P0 | ⚪ | `hospital_import_logs` still live; rest needs re-scan |
| R6 | Duplicate stamp triggers | P1 | ✅ | pillar-file grep shows exactly one `stamp_*_display_id` trigger per table |
| R7 | Broad grants / execute scope | P1 | 🟡 | RPC execute scope tightened; table grant audit pending |
| R8 | Missing secondary indexes | P1 | 🟡 | active-request partial indexes added; hot-path indexes unverified |
| R9 | Type drift | P1 | ⚪ | `sync_to_console.js` exists; CI gate status unknown |
| R10 | Mixed fallback / UX jitter | P2 | 🟠 | tracked by `MAP_RUNTIME_PASS_PLAN_V1` |

---

## Detail

### R1 — Realtime publication excluded subscribed tables ✅

**Original finding (2026-03-02):** Publication contained only `access_requests`; runtime listens on 17 tables → silent non-delivery risk.

**Current evidence:**
- [`workflow_map.md` #Verification Snapshot 2026-03-03](../flows/emergency/workflow_map.md): *"Realtime publication membership check: PASS for expected emergency-surface tables (`emergency_requests`, `payments`, `visits`, `ambulances`, `hospitals`, etc.)"*

**Next action:** none. Monitor via existing runner.

---

### R2 — `discharge_patient` writes disallowed status ✅

**Original finding (2026-03-02):** Function writes `status='discharged'`, but `emergency_requests.status` CHECK does not allow `discharged`.

**Current evidence:**
- [`20260219000800_emergency_logic.sql:2006-2070`](../../supabase/migrations/20260219000800_emergency_logic.sql) now writes `status = 'completed'` gated by `service_type = 'bed' AND status IN ('in_progress', 'accepted', 'arrived')`, which is legal per the emergency status state machine.
- The comment `-- Bed discharge must use legal emergency status values.` marks this as the intentional fix.
- Function also sets `ivisit.transition_source = 'discharge_patient'` and goes through the deterministic transition path.

**Next action:** none. Keep runner (`assert_emergency_status_transitions_surface_field_guard.js`) covering this path.

---

### R3 — `auto_assign_driver` race exposure ✅

**Original finding (2026-03-02):** Selects first available ambulance without row-level locking.

**Current evidence:**
- [`20260219000900_automations.sql:429-468`](../../supabase/migrations/20260219000900_automations.sql) defines `auto_assign_driver()` with `FOR UPDATE SKIP LOCKED` on the candidate ambulance selection (line 466). Comment: *"Harden auto assignment against race conditions."*
- [`workflow_map.md` #Verification Snapshot 2026-03-03](../flows/emergency/workflow_map.md) also confirms the sibling `auto_assign_doctor` uses the same pattern.
- [`20260423000100_active_request_concurrency_guard.sql`](../../supabase/migrations/20260423000100_active_request_concurrency_guard.sql) adds an upstream unique-partial-index guard preventing duplicate active requests per user per service type.

**Next action:** none. Concurrency guards are in place at both ends (request-level and assignment-level).

---

### R4 — Console direct writes bypass RPC boundary ✅

**Original finding (2026-03-02):** Console performs `.update()`/`.delete()` directly on `emergency_requests`, depending on caller role/RLS luck.

**Current evidence:**
- [`workflow_map.md` #Verification Snapshot 2026-03-03](../flows/emergency/workflow_map.md): *"Runtime write-surface scan: `ivisit-console`: no direct runtime `insert/update/delete/upsert` on `emergency_requests`. Remaining direct writes are test/seed-only scripts."*
- Guard runner: `supabase/tests/scripts/run_console_direct_mutation_surface_report.js`

**Next action:** none. Continue running the guard in CI.

---

### R5 — Orphaned relation references in runtime ⚪

**Original finding (2026-03-02):** Runtime references `available_hospitals`, `hospital_import_logs`, `hospital_rooms`, `search_selections`, `trending_searches_view`, classification of `images` as relation.

**Current evidence:**
- `hospital_import_logs` is present in live schema ([`SCHEMA_SNAPSHOT.md`](../../supabase/docs/SCHEMA_SNAPSHOT.md)) — may be intentional.
- `search_selections` still appears in `supabase/tests/scripts/assert_search_selections_surface_field_guard.js` — may have been promoted to a real table.
- `available_hospitals`, `hospital_rooms`, `trending_searches_view`, `images` — not re-verified.

**Next action:** re-run the orphaned-logic inventory extraction; compare against current live schema; confirm which references are intentional vs stale.

---

### R6 — Duplicate stamp triggers on finance / notification tables ✅

**Original finding (2026-03-02):** Double stamp triggers on `notifications`, `organization_wallets`, `patient_wallets`, `payments`.

**Current evidence:** static grep across pillar files shows exactly one `stamp_*_display_id` trigger per table:
- `notifications` → `stamp_ntf_display_id` in [`20260219000500_ops_content.sql:169`](../../supabase/migrations/20260219000500_ops_content.sql)
- `payments` → `stamp_pay_display_id` in [`20260219000400_finance.sql:729`](../../supabase/migrations/20260219000400_finance.sql)
- `patient_wallets` → `stamp_pat_wallet_display_id` in [`20260219000400_finance.sql:730`](../../supabase/migrations/20260219000400_finance.sql)
- `organization_wallets` → `stamp_org_wallet_display_id` in [`20260219000400_finance.sql:731`](../../supabase/migrations/20260219000400_finance.sql)

No duplicate triggers in the current pillar files.

**Next action:** the live database may still carry ghost duplicates from earlier migration history; a production-side `pg_trigger` inventory would close the loop. Not urgent.

---

### R7 — Broad grants / execute scope 🟡

**Original finding (2026-03-02):** `anon`/`authenticated` write privileges across all 40 public tables; security definer routines broadly granted.

**Current evidence:**
- [`workflow_map.md` #Verification Snapshot 2026-03-03](../flows/emergency/workflow_map.md): *"Removed `anon` execute exposure from `create_emergency_v4`, `approve_cash_payment`, `decline_cash_payment`, `process_cash_payment_v2`, `notify_cash_approval_org_admins`. Added explicit execute grants to `authenticated` + `service_role` only."*
- *"RLS snapshot: `emergency_requests`, `payments`, `visits` all have RLS enabled. Policy roles tightened to `{authenticated}` on critical read/write paths (no `anon/public` write-surface)."*

**Gap:** table-level grant audit (40 tables total) is not cited as re-run. The hardening cited is per-RPC and per-critical-table, not a full sweep.

**Next action:** re-run full table-grant inventory; record deltas.

---

### R8 — Missing secondary indexes on hot predicates 🟡

**Original finding (2026-03-02):** `emergency_requests(hospital_id/status/created_at)`, `ambulances(hospital_id/status)`, `payments(emergency_request_id)`, `visits(request_id)` lack non-PK indexes.

**Current evidence:**
- [`20260423000100_active_request_concurrency_guard.sql`](../../supabase/migrations/20260423000100_active_request_concurrency_guard.sql): adds unique partial indexes on `emergency_requests(user_id)` scoped to active ambulance/bed statuses. This covers one hot path (per-user active lookup) but not the broader index list from R8.

**Gap:** the specific hot-predicate indexes from R8 are not individually confirmed.

**Next action:** compare live `pg_indexes` output against the R8 target list; add missing indexes concurrently in a post-pillar patch.

---

### R9 — Type and schema drift between live DB and TS types ⚪

**Original finding (2026-03-02):** Console types include removed tables; app types miss live columns.

**Current evidence:**
- `supabase/scripts/sync_to_console.js` exists, suggesting a sync path.
- `supabase/scripts/generate_schema_snapshot.js` exists.
- CI gate behavior is not documented in the current docs spine.

**Next action:** confirm `sync_to_console.js` is invoked in a release step; compare `supabase/database.ts` against live schema via `export_live_schema_inventory.js`; document the CI trigger in `supabase/docs/CONTRIBUTING.md`.

---

### R10 — Mixed fallback / simulation logic in emergency UX 🟠

**Original finding (2026-03-02):** Jitter and non-canonical UX from mixed fallback/simulation logic.

**Current evidence:**
- Active tracked work under [`../flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md`](../flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md) — Pass 12 in progress as of 2026-04-23.
- [`../flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md`](../flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md) #"Reliability Hardening (ETA + Ambulance Motion)" documents the canonical single-source-of-truth direction for tracking timeline and responder coordinates.

**Next action:** track via pass plan. Re-mark as 🟡 when Pass 4B (ambulance completion/recovery signoff) closes, and as ✅ when Passes 5–8 complete.

---

## Maintenance

This tracker supersedes the "10 risks" section of the 2026-03-02 report only for *resolution status*. The original report remains the source for the failure-mode description, rationale, and phase refactor plan.

Update this tracker:
- when a ⚪ item is verified
- when a 🟡 item closes its gap
- when a 🟠 item advances through pass-plan milestones
- never silently flip a ⚪ to ✅ without citing the evidence file/line
