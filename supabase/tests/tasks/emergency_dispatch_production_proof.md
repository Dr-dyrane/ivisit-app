# Emergency Dispatch Production Proof

## Objective

Prove the linked emergency dispatch contract against a remote Supabase project without deploying schema, changing application feature code, touching unrelated rows, or leaving test residue.

This proof covers:

- patient, driver, dispatcher, organization admin, cross-organization, and anonymous scope
- same-organization discovery of a hospital-free ambulance-service unit and cross-organization assignment denial
- malformed telemetry returning controlled JSON rather than a SQL/PostgREST error
- Console request creation ignoring caller-authored paid and terminal state
- two independent dispatcher Auth sessions offering, and two driver Auth sessions accepting, one assignment concurrently
- service-role completion through the Console command path
- authenticated Realtime owner delivery and cross-organization suppression
- payment release and pre-payment dispatch denial
- staffing, telemetry, accept, arrival, patient acknowledgement, completion, decline, and retry behavior
- canonical notification event-key idempotency
- private and public Storage ownership
- unavailable-fleet fallback and requeue behavior
- deployed RPC and table drift
- exact cleanup followed by zero-residue assertions

## Ownership Boundary

The proof harness does not deploy migrations or Edge Functions and does not generate a deployment pack.

Files owned by this proof:

- `supabase/tests/scripts/assert_emergency_dispatch_live_contract.js`
- `supabase/tests/scripts/run_emergency_dispatch_live_e2e.js`
- this document

The separately owned deployment runner is outside this proof and must not be edited or invoked by the live harness.

## Safety Contract

The live runner defaults to a successful skip. Remote writes require all three gates:

1. `--apply`
2. `--project-ref=<linked-ref>` matching both `supabase/.temp/project-ref` and the Supabase URL
3. `IVISIT_EMERGENCY_LIVE_E2E=<linked-ref>`

The runner refuses localhost targets. It reports credential presence only as booleans and does not write Auth tokens, passwords, API keys, or raw session identifiers to its report.

After all three write gates pass, the runner executes the full local production contract assertion again. A red schema, type-parity, authorization, or harness-safety assertion exits before Supabase client creation.

Every fixture is identified by exact UUIDs plus a unique `dispatch-live-*` tag. Denied Storage probes register their exact paths before upload, so a broken policy cannot leave an untracked object. Realtime probes register their exact channel objects and remove them before fixture deletion. Cleanup runs in `finally`, deletes only learned fixture IDs or exact fixture relationship keys, and then independently verifies zero residue.

Fixtures use an isolated ocean coordinate and each request is explicitly scoped to its generated organization before payment can trigger dispatch. The static gate also requires readiness to fall back to the destination organization whenever the current dispatch organization is null. This prevents fallback and decline tests from selecting an unrelated production responder.

Immutable request history requires a narrow service-role cleanup block. It accepts validated UUID literals only, disables three named guards for that exact request graph, and restores all three guards in both success and exception paths. It never scans by email pattern or deletes unrelated expired offers.

## Required Environment

- `EXPO_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IVISIT_EMERGENCY_LIVE_E2E`, only for an explicitly approved live run

The currently linked project reference is `dlwtcmhdzoklveihuhjf`. Re-read `supabase/.temp/project-ref` before every live run instead of relying on this recorded value.

## Required Order

Run from the App repository root.

### 1. Parse and static safety

```powershell
node --check supabase/tests/scripts/assert_emergency_dispatch_live_contract.js
node --check supabase/tests/scripts/run_emergency_dispatch_live_e2e.js
node supabase/tests/scripts/assert_emergency_dispatch_live_contract.js --schema-only
```

`--schema-only` proves SQL ownership and harness safety but deliberately skips generated type parity. It is never sufficient for production approval.

### 2. Cross-repository type parity

```powershell
node supabase/tests/scripts/assert_emergency_dispatch_live_contract.js
```

This must pass against:

- `types/database.ts`
- `supabase/database.ts`
- `../ivisit-console/frontend/src/types/database.ts`

Do not run the live proof while this gate is red.

### 3. Supporting static contracts

```powershell
node supabase/tests/scripts/assert_notification_event_contract.js
node supabase/tests/scripts/assert_edge_function_payment_contract.js
node supabase/tests/scripts/assert_automation_contract.js
node supabase/tests/scripts/assert_finance_rpc_contract.js
node supabase/tests/scripts/assert_cash_fee_deduction_contract.js
node supabase/tests/scripts/assert_scheduled_visits_contract.js
node supabase/tests/scripts/assert_console_shared_contracts.js
```

All relevant guards must be green or have an explicitly reviewed, documented disposition before launch approval.

### 4. Dry run

```powershell
node supabase/tests/scripts/run_emergency_dispatch_live_e2e.js
```

Expected result: `SKIP: live mutation was not approved`, matching linked and URL project refs, and no report artifact from a live run.

### 5. Separate deployment and verification

The deployment owner must inspect and apply the additive contract before the live proof. This harness neither creates nor executes that deployment. A deployment file is temporary: after its behavior is proved live, absorb the final SQL into the 11 pillars, delete the file, and repair its remote migration version as reverted. The live run must prove deployed behavior through PostgREST OpenAPI and the isolated fixture matrix. After any deployment, regenerate App and Console types, rerun steps 1 through 4, and require a fully green type-parity result.

### 6. Explicitly approved live proof

Only after deployment and all prerequisite gates are green:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = '<service-role-secret>'
$env:IVISIT_EMERGENCY_LIVE_E2E = 'dlwtcmhdzoklveihuhjf'
node supabase/tests/scripts/run_emergency_dispatch_live_e2e.js --project-ref=dlwtcmhdzoklveihuhjf --apply
$proofExit = $LASTEXITCODE
Remove-Item Env:\IVISIT_EMERGENCY_LIVE_E2E
Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY
exit $proofExit
```

The runner first reads PostgREST OpenAPI and table contracts. This proves global workers such as `expire_responder_offers` are deployed without invoking them against unrelated production rows.

## Approval Gate

The live report is written to the ignored path:

`supabase/tests/artifacts/emergency_dispatch_live_e2e_report.json`

Approval requires all of the following:

- process exit code `0`
- `failed` equals `0`
- `cleanup_passed` equals `true`
- `zero_residue_passed` equals `true`
- a hospital-free ambulance-service unit was visible to its own organization and hidden from foreign discovery
- a foreign dispatcher was denied assignment before two same-org dispatcher sessions converged on one offer
- two distinct driver sessions converged on that same assignment generation
- malformed telemetry produced controlled JSON for UUID, integer, timestamp, and location failures
- hostile Console create fields persisted as `pending_approval` request and `pending` payment state
- service-role Console completion delegated to the responder lifecycle and retried idempotently
- the owner received the Realtime update while the cross-org subscriber received none
- exactly one transition and one canonical notification for each idempotent lifecycle event
- no unauthorized row, RPC, telemetry, or Storage access succeeded
- the unavailable fleet produced an explicit queued fallback without a fake assignment

Any cleanup failure is a hard stop even if workflow assertions passed. Inspect the ignored report and its exact fixture IDs; do not use broad cleanup predicates.

## Evidence At 2026-07-14

### Deployment state

- Linked project: `dlwtcmhdzoklveihuhjf`.
- Local and remote migration history contain exactly the 11 core pillars. Ten temporary July
  deployment versions through `20260714233000` were absorbed and repaired as reverted after
  live verification.
- `supabase db push --linked --dry-run` reports `Remote database is up to date`.
- The deployed emergency contract is represented in the core pillars and includes readiness,
  role authority, patient-consent wallet settlement, assignment-bound telemetry, responder
  lifecycle, Console telemetry guards, ambulance type compatibility, canonical notifications,
  and recipient-owned notification dismissal.
- App and Console generated database types were regenerated from the linked schema and
  synchronized through `supabase/scripts/sync_to_console.js`.
- Payment Edge functions are deployed at version `34`; the demo bootstrap function is
  deployed at version `51`.

### Static and build proof

- Full emergency production contract: `251/251` checks passed with no skips.
- Emergency hardening guards passed for Realtime publication, RLS scope, transition audit,
  lock semantics, RPC execute scope, and mutation role gates.
- Notification event, six-function payment/webhook, cash fee, and sixteen Console shared
  contracts passed.
- Cross-repository drift passed across `34` tables and `74` RPCs with zero missing columns,
  missing RPCs, stale signatures, or unresolved signatures.
- Edge payment unit tests passed `2/2`, including zero-fee connected-account payment.
- App lifecycle and AppState query-focus behavior tests passed.
- Console dispatch/map focused tests passed `43/43`; the optimized Console production build,
  data-contract guard, UI hardgate, mobile grammar, encoding, and mojibake checks passed.
- The App web production export bundled `2,831` modules and completed postprocessing.

### Live production proof

The explicitly approved isolated run started at `2026-07-14T18:24:41.519Z` and finished at
`2026-07-14T18:25:54.819Z`:

- `65` checks passed and `0` failed.
- `cleanup_passed` is `true`.
- `zero_residue_passed` is `true`.
- Two dispatcher Auth sessions converged on one offer.
- Two driver Auth sessions converged on one acceptance.
- RLS, role and organization isolation, Realtime owner delivery and foreign suppression,
  private/public Storage, assignment-bound telemetry, payment release, cash decline,
  idempotent arrival/completion, standalone ambulance organizations, unavailable-fleet
  fallback, and exact cleanup all passed against the linked backend.

The ignored machine-readable report remains at
`supabase/tests/artifacts/emergency_dispatch_live_e2e_report.json`.

### Linked lint disposition

`supabase db lint --linked --schema public --level error --fail-on error` connected and emitted
six vendor-extension body errors: `st_findextent` twice, `populate_geometry_columns`,
`postgis_full_version`, `lockrow`, and `addauth`. None of these routines is defined by project
SQL; the infrastructure migration installs `postgis`, whose public-schema legacy helpers are
included by the CLI lint. The CLI exposes no per-function exclusion. No application-owned
function error was emitted. Relocating or rewriting extension routines is outside this dispatch
repair and would add deployment risk, so these six findings are recorded as reviewed vendor
exceptions rather than hidden or altered.

## Production Verdict

- **Backend dispatch contract: GO.** The deployed authority, lifecycle, data isolation,
  concurrency, payment, telemetry, Storage, fallback, and cleanup contract is production-proven.
- **Supervised foreground dispatch pilot: GO.** Console drivers can receive offers, accept,
  arrive, complete, and maintain a telemetry lease while the Console remains open and active.
- **Unattended background dispatch: NO-GO in the current native binary.** The current App and
  Console do not provide native background-location tasks plus APNs/FCM delivery. Browser page
  notifications are explicitly foreground-only. An EAS OTA update cannot add missing native
  entitlements or modules; that capability requires a new native build and its own device proof.

The native-background boundary does not invalidate the foreground pilot, but operators must be
trained to keep the responder Console open and location sharing active until a background-capable
binary is released.
