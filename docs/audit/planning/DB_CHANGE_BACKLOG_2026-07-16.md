---
status: PARKED - awaiting deep multi-perspective review
owner: architecture
last_updated: 2026-07-16
review_depth_required: high
---

# Pending DB Changes - PARKED for deep review

> **NOTHING IN THIS DOCUMENT HAS BEEN APPLIED.** No migration was run, no policy created, no
> function replaced. Five changes were analysed read-only on 2026-07-16 (5 analysts + synthesis,
> every claim carried to file:line). Full briefing: claude.ai artifact `7d101c9a`.
>
> **Why parked:** the DB is a deep, interconnected network and the repo has not fully recovered
> from the June/July edit wave. Applying individual fixes on top of an unmapped baseline is how
> the July incident happened. This backlog is deliberately NOT a to-do list -- it is the input to
> a deeper review that must run with multiple contexts and perspectives before anything ships.

## 2026-07-17 nearby_providers resolution

The live contract was captured read-only with `pg_get_functiondef` and catalog ACL metadata before
any source edit. The recovered SQL is preserved at
`supabase/docs/live-contracts/nearby_providers_2026-07-17.sql`, and the reproducible capture probe is
`scripts/capture_live_nearby_providers_contract.js`.

The deployed function is a stable, invoker-rights, 20-field discovery projection over
`public.hospitals`. It does not join `public.providers`. Live execution is available to `PUBLIC`,
`anon`, `authenticated`, and `service_role`. The generated App and Console database types already
described this 20-field result.

Resolution:

- the core RPC pillar and API/schema documentation now describe the captured 20-field live shape;
- no live SQL was applied because production already has the selected contract;
- no EAS build, runtime bump, OTA, or App JavaScript change is required;
- the proposed 28-field replacement is rejected because its extra values can originate from
  category templates rather than organization-asserted facts;
- provider detail is now explicitly a future onboarding/claim/verification contract. Discovery
  may continue rendering honest unavailable states until verified organization-owned values exist.

This closes the `nearby_providers` source/live drift. It does not claim that provider-detail
onboarding is complete, and it does not unpark the other four changes in this document.

---

## 0. READ THIS FIRST - the baseline is not trustworthy yet

The analysis surfaced hard evidence that **the deployed database has drifted from this repo in
ways no migration records**:

- **`nearby_providers` (closed 2026-07-17)**: the LIVE function returned a 20-column shape while
  the pillar declared 28. `git log -S` proved only 28-column versions had been authored. The live
  body and ACL have now been recovered with `pg_get_functiondef`, preserved under
  `supabase/docs/live-contracts`, and adopted into the pillar/docs without mutating production.
- **`20260601000000_provider_taxonomy`**: credited in `supabase/docs/CONTRIBUTING.md` with
  deploying `nearby_providers`. **It does not exist in git history at all.**
- Three separate documents state three different column counts for the same function
  (20 live / 28 pillar / "29" in `02_RPCS_AND_FUNCTIONS.md:44`).

**Implication for the deep review: do NOT start from the migrations.** Start by reconciling the
LIVE database against the pillars (`pg_get_functiondef` / `pg_policies` / `information_schema`
dumps vs the repo), and treat every discrepancy as a finding. The repo is a *claim* about the
schema; only the live DB is the schema. Until that reconciliation exists, any single-change risk
assessment (including this one) rests on an assumption that may not hold.

---

## 1. What parking costs (be honest about it)

Waiting is the right call, but it is not free. Two of these are actively harming users today:

| Change | Cost of waiting |
|---|---|
| `insurance-storage-policy` | **Active data loss.** Every native insurance-card attach throws (`services/insuranceService.js:462`), which aborts `savePolicy` -- the user loses the whole POLICY, not just the photo. Identical on 1.0.6, 1.0.7, 1.0.8. Frozen runtimes can NEVER receive a client-side fix; a server policy is the only repair they can get. |
| `delete-user` | **Already broken, in two opposite directions, unobserved.** `emergency_responder_assignments.emergency_request_id` is ON DELETE RESTRICT, so for any patient who ever had a responder offered, deletion ALREADY aborts -- and `authService.js:611-621` returns `true` from its catch, so they are told "deleted" while fully intact. Others lose their profile row and get a permanent phantom account (`handle_new_user` fires on INSERT only, so re-login never restores it). Nobody has ever seen either failure. |
| `nearby-providers-shim` | Source/live drift is closed. Provider detail remains honestly unavailable until onboarding/claim/verification owns organization-asserted values. |
| `reschedule-self-exclusion` | The picker hides the slots you most want when rescheduling. Annoying, not harmful; the server would accept those times. |
| `wallet-top-up-receiver` | **Zero cost. Safe indefinitely.** Top-up is gated client-side (`services/paymentService.js` `WALLET_TOP_UP_CREDIT_RECEIVER_AVAILABLE = false`) and fails closed BEFORE any Stripe intent exists, so no card is charged. Waiting here is free. |

**The one EAS-safe move available with zero DB risk:** ship the `authService.deleteUser` catch
fix (stop returning `true` on failure). It is a pure client change, it ends the lie, and the
resulting error telemetry tells you **how many users are hitting the FK RESTRICT abort today** --
a number you are currently blind to and will want before designing the real fix.

---

## 2. The five changes - summary for the reviewer

Ordered safest-first. Full evidence, consumer traces, and rollback paths in artifact `7d101c9a`.

### 2.1 `insurance-storage-policy` - additive, CONTAINED
Add storage INSERT **and SELECT** policies for `documents/insurance/{uid}/*`.
- **Both are required.** `insuranceService.js:466` calls `createSignedUrl`; an INSERT-only fix
  still throws and still aborts the save -- a no-op shipped as a fix.
- Path check must be `[1]='insurance' AND [2]=auth.uid()::TEXT` on both. Get this wrong and
  **every patient can download every other patient's insurance card (PHI breach)**.
- Extension whitelist must include HEIC/HEIF or iOS stays broken (the onboarding whitelist,
  which this would otherwise be copied from, omits them).
- No `OR p_is_admin()`: nothing in the console reads cards (`CardImage` renders a placeholder).
- Rollback: `DROP POLICY` x2, instant. Does not un-upload objects already written.
- Accepted debt: `coverage_details` accumulates expired 1-hour signed URLs (audit E12). Queue the
  path-not-URL fix for a later OTA; do not block the repair on it.

### 2.2 `reschedule-self-exclusion` - mixed, CONTAINED
Add `p_exclude_visit_id UUID DEFAULT NULL` to `get_book_visit_availability`.
- **Mandatory:** explicit `DROP FUNCTION` of the 5-arg signature in the SAME transaction as the
  CREATE, **and re-apply REVOKE/GRANT onto the 6-arg signature** (`core_rpcs.sql:8318`/`:8329`).
  DROP discards grants and Postgres re-grants EXECUTE TO PUBLIC by default. Miss the DROP and
  the booking picker dies on 1.0.6, 1.0.7 AND 1.0.8 simultaneously (42725/PGRST203).
- The live anon e2e (`run_scheduled_visits_live_e2e.js:750`) **passes even with the REVOKE lost**
  (the body raises 'Unauthorized' itself), so it cannot be trusted to catch an ACL regression.
  Verify by hand with `\df+`.
- Ships alongside: regenerate `database.ts` in BOTH repos; update the live signature pin at
  `assert_scheduled_visits_contract_live.js:155`.
- The client half (thread `excludeVisitId`) is a LATER OTA and is itself blocked on adding
  `excludeVisitId` to the React Query key (`useBookVisitAvailabilityQuery.js:17-24`) -- otherwise
  book and reschedule collide on one 30s cache entry and the BOOK picker offers taken slots.
  **Never ship the OTA before the DB:** a 6-key body against a 5-arg function is PGRST202.

### 2.3 `nearby-providers-shim` - RESOLVED AS SOURCE RECONCILIATION

The live body and ACL were captured on 2026-07-17. `public.providers` contains 763 rows, so the
original row-count question is answered, but the detail rows can still contain generic
category-derived values. The 28-field replacement therefore remains the wrong product contract.

The safe resolution was to preserve the deployed 20-field discovery projection and reconcile the
pillar/docs to it. The pillar now includes an explicit signature drop for clean rebuilds, recreates
the invoker-rights function, and grants its read contract. Production required no mutation because
it already matched the selected definition.

Provider-specific services, specialties, insurance, hours, appointment requirements, turnaround,
age range, and crisis line must be promoted later through the organization onboarding,
facility-claim, and verification chain. Those values must be attributable to the claiming
organization and reflected only after the agreed verification state; category templates are not
provider truth.

### 2.4 `wallet-top-up-receiver` - mixed, MODERATE. Receiver may land; FLAG MUST NOT FLIP.
Credit `patient_wallets` for `is_top_up` payments.
- **Build as a TRIGGER BRANCH, not a webhook RPC.** Reason (proven): `notify_payment_status_change`
  (`ops_content.sql:276-280`) is an AFTER UPDATE OF status trigger on the SAME UPDATE, has no
  `is_top_up` exclusion, and sorts alphabetically FIRST -- it already pushes "Your payment was
  confirmed" to the patient. A webhook-RPC design would commit that push and let the credit fail
  independently. A trigger keeps credit and push in one transaction and inherits the
  `OLD.status='completed'` replay guard for free.
- Split the `:755` guard correctly:
  `IF v_is_top_up THEN <credit>; RETURN NEW; END IF; IF NEW.organization_id IS NULL THEN RETURN NEW; END IF;`
  Fusing the credit into the existing OR would credit **every null-org payment**.
- Claim the `wallet_ledger` idempotency key BEFORE mutating balance; assert `ROW_COUNT = 1` and
  RAISE otherwise (only ~1255 wallet rows exist and there is no auto-provision trigger -- a silent
  zero-row UPDATE is the exact July failure mode).
- Audit/cancel pending orphan `is_top_up` payments rows BEFORE the receiver exists, or the trigger
  may credit history retroactively. `payments` is ~202 rows: cheap and exhaustive.
- Landing the receiver alone is nearly inert (nothing confirms a top-up intent on any runtime
  today) -- a free rehearsal.

**THE FLAG IS BLOCKED ON (all four):**
1. **Refund/dispute handling, which does not exist ANYWHERE.** `charge.refunded` and
   `charge.dispute.created` fall through to `default: console.log('Unhandled event type')`.
   Without it the wallet is a mint: top up $500 -> wallet +$500 -> dispute -> Stripe returns $500
   -> wallet KEEPS $500 -> spend it -> a real provider is paid real money. Net -$500, repeatable
   at will, and it looks like a normal successful visit in every dashboard.
2. **A patient SELECT policy on `wallet_ledger`** (only an admin policy exists -- the credit would
   be invisible to the person it belongs to).
3. **A Stripe idempotency key on `create-payment-intent`.** It currently sends none, so every
   retry mints a DISTINCT intent + payments row with a DISTINCT key. No DB guard can dedupe them:
   double-tap = double-CHARGE.
4. Reconciliation alerting.

### 2.5 `delete-user` - destructive, SEVERE. DO NOT SHIP AS DESIGNED.
- The RPC name and signature do not change, so **1.0.6 and 1.0.7 begin executing the new
  destruction the instant the migration lands** -- no flag, no version gate, and they can never
  receive the client fix. This is the July RLS precedent inverted: that made frozen-bundle writes
  match zero rows; this makes a frozen-bundle RPC match the user's entire history.
- `profiles.id REFERENCES auth.users(id) ON DELETE CASCADE` means adding the auth delete
  detonates the tree: visits, emergency_requests, medical_profiles, emergency_contacts,
  insurance_policies, patient_wallets (balance destroyed, no payout). Meanwhile `payments.user_id`
  and `payments.emergency_request_id` are SET NULL and the request cascades away -- money rows
  left with no counterparty. **`wallet_ledger.wallet_id` has NO foreign key at all**, so ledger
  rows survive pointing at a dead wallet: the debt is provable, the creditor is not.
- No `deleted_at` anywhere. No tombstone. `delete_user` (unlike `delete_user_by_admin`) writes no
  audit row. **Only recovery is a full-project PITR, which rolls back every other user too.**
- **The schema has already voted:** `payments`, `insurance_billing`, `user_activity`,
  `support_tickets` are declared SET NULL, not CASCADE -- recorded intent that financial and audit
  rows must OUTLIVE the user. A hard delete contradicts the design.
- **Redesign as soft-delete + PII scrub (anonymise-and-retain).** If a true purge is ever needed
  it must be a service-role edge function (the `bootstrap-demo-ecosystem` pattern), never an
  app-callable RPC -- any user-callable RPC is reachable by bundles you can never patch.
- **Before designing:** ship the catch fix, then run the census -- count profiles blocked by each
  RESTRICT/NO ACTION parent (`emergency_responder_assignments.responder_id`,
  `ambulance_staff_assignments.responder_id`, `organization_verification_documents.uploaded_by`,
  `hospitals.org_admin_id`, `support_tickets.assigned_to`, `admin_audit_log.admin_id`) and count
  patients with >=1 responder assignment. If that number is large, hard delete does not work for
  most users and no error message fixes that.
- **Get a written retention decision from legal before any design is chosen.**

---

## 3. Claims that did NOT verify - do not trust the older docs

The 2026-07-16 defect audit and the briefing that drove this analysis were both wrong in places.
Anyone resuming this work should treat these as corrections of record:

**Material (would have changed a design):**
- "`process_payment_distribution` is the only trigger on `public.payments`" -- **FALSE, there are
  three.** `notify_payment_status_change` co-fires on the same UPDATE with no `is_top_up`
  exclusion. This single fact rules out the webhook-RPC receiver design.
- "The `stripe_payment_intent_id` idempotency guard prevents double-charges" -- **it does not**
  (no Stripe idempotency key; retries mint genuinely distinct intents).
- "The INSERT policy is the N2 fix" -- **incomplete**; SELECT is required or it is a no-op.
- "Does the console depend on `delete_user`?" -- it does not (`UsersPage.contract.test.js:112`
  actively pins its absence). The console is a *victim*, not a caller: rows vanish from operator
  views with no tombstone.

**Factual errors:**
- `nearby_providers` columns named `report_count` / `provider_rating` / `provider_reviews` **do not
  exist**. The real ones are `report_turnaround`, `age_range`, `crisis_line`.
- "The `nearby_hospitals` DROP+recreate had a cached-schema window" -- **not supported by the
  repo**; no incident is recorded. Treat the PostgREST cache window as a short self-healing blip
  (the app already wraps availability in `withRetry(maxRetries:2)`), not a proven outage.
- OTA identifiers `082b6d06` / `aa282c62` are **update-group IDs, not commits**. The commits are
  `f7c61745` (OTA #1) and `c566d7ff` (OTA #2).
- "`database.ts` is byte-identical across repos" -- it is **content**-identical only (app CRLF,
  console LF). A byte-compare sync check reports a false mismatch.

**Understated:**
- `delete_user` is not merely "leaves a phantom account" -- it **already aborts entirely** for any
  patient who ever had a responder offered, while the client reports success.
- Frozen 1.0.6/1.0.7 are lying about wallet top-ups right now: the pre-gate bundle shows
  `Alert.alert("Success", ...success(amount, result.newBalance))` and `topUpWallet`'s return has
  no `newBalance` field -- a Success alert quoting `undefined`, then the real balance redraws.
  Unpatchable on those runtimes; owed an explanation regardless of what is decided here.

---

## 4. What the deep review should actually do

In order. Do not skip to the fixes.

1. **Reconcile live vs repo** (see §0). Dump `pg_get_functiondef` for every function, `pg_policies`
   for every policy, and `information_schema` for columns/FKs/triggers; diff against the 11
   pillars. Every discrepancy is a finding. **This is the prerequisite for trusting anything else,
   including this document.** It also permanently answers "have we recovered from June/July".
2. **Capture the unrecoverable first.** `pg_get_functiondef` on `nearby_providers` (and anything
   else the diff shows as repo-absent) committed to the repo BEFORE any DROP is contemplated.
3. **Census the delete blast radius** (§2.5) -- data, not opinion.
4. **Legal retention decision** on account deletion.
5. **Then, and only then**, sequence the individual changes -- probably: storage policy ->
   reschedule -> (providers shim only if the row-count answer justifies it) -> receiver-without-flag.
6. **Multiple perspectives required** on the wallet receiver and delete-user specifically: money
   and irreversible data loss both deserve an adversarial reviewer who is not the author.

---

## 5. Cross-references
- Blast-radius briefing (full evidence, per-change consumer traces): claude.ai artifact `7d101c9a`
- Classified app defect plan (the E/B/N/T item IDs used above): claude.ai artifact `83a9c4e8`
- Build-only backlog (must never ride an OTA): `docs/audit/planning/BUILD_1.0.9_BACKLOG_2026-07-16.md`
- The law that governs OTA vs build: `docs/audit/map/ANDROID_MARKER_DENSITY_AUDIT_2026-07-15.md`
- Migration workflow (pillars + shim + repair): `supabase/docs/CONTRIBUTING.md`,
  `supabase/docs/console/sync_guide.md`
