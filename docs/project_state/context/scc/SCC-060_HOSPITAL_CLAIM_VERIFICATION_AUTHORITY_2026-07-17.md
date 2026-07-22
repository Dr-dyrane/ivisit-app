# SCC-060: Hospital Claim And Verification Authority

## Objective

Close the provider-network onboarding gap without creating a parallel database
system or weakening patient eligibility. A new organization must be able to
register a new facility or submit a reviewable claim for an existing unowned
facility, attach private evidence, receive explicit evidence/claim/organization
decisions, and become visible to the patient App only after the existing
organization and facility eligibility gates are both satisfied.

## Locked Architecture

- Preserve the eleven canonical migration pillars.
- `org_structure` owns organization, facility-claim, and evidence lifecycle data.
- `security` owns RLS, direct-write denial, and private evidence access.
- `core_rpcs` owns public onboarding and platform-admin review commands.
- Existing-facility claims never transfer a facility already linked to another
  organization. Ownership transfer remains a separate manual/legal workflow.
- Claim approval links ownership only. It does not verify the organization or
  facility and does not make the facility dispatch eligible.
- Evidence, claim, organization, and facility decisions remain distinct.
- `nearby_hospitals` and emergency matching continue requiring a verified
  organization and dispatch-eligible facility.
- Production deployment must use exact SQL emitted from the reviewed pillar
  markers, followed by live proof, cleanup, temporary-history repair, and drift
  validation. No EAS update, APK, or AAB is required because patient behavior
  is unchanged.

## Required Proof Chain

`public onboarding search -> selected facility identity -> atomic organization +
claim + private evidence -> admin evidence decision -> admin claim decision ->
admin organization decision -> existing facility decision -> App
nearby/emergency eligibility`

## Acceptance Matrix

| Lane | Required evidence |
|---|---|
| New organization/new facility | Existing provisioning remains atomic and pending. |
| Existing unowned facility claim | Selected UUID is consumed; no duplicate hospital is inserted; one pending claim is reflected. |
| Existing owned facility | Claim receiver rejects it without changing ownership. |
| Private evidence | Files remain actor-path constrained, linked to organization and claim, and immutable after submission. |
| Evidence review | Platform-admin-only accept/reject/request-changes command with reflected reviewer metadata. |
| Claim review | Platform-admin-only approve/reject/request-changes command; approval requires accepted evidence and links only an unowned facility. |
| Organization review | Platform-admin-only approve/reject/request-changes command; approval requires accepted evidence and an owned facility for hospital/clinic organizations. |
| Facility review | Existing platform-admin receiver remains the only facility verification command. |
| App consequence | Pending or partially reviewed records remain absent from real nearby/emergency eligibility; both verified gates admit the facility. |
| Retry | A changes-requested organization can submit new evidence without creating another organization or claim. |

## Verification

- exact-source rollback contract with role, idempotency, duplicate, decision,
  and eligibility assertions;
- SQL/PLpgSQL parse;
- generated type and App/Console pillar parity;
- Console service/controller tests and production build;
- cleanup and contract-drift guards;
- disposable live Auth, Storage, organization, claim, evidence correction,
  decision, App visibility, and cleanup E2E.

## Production Proof

- App/backend PR `#6` merged as `dda2aa49`; Console PR `#3` merged as
  `22f10ff3`.
- Exact-source deployment `20260717234000` applied to project
  `dlwtcmhdzoklveihuhjf`, verified, removed locally, and repaired as reverted.
- Rollback contract passed 71 statements with no residue.
- Cross-repository drift guard passed with zero missing tables, columns, RPCs,
  or stale signatures.
- Live run `1784331764953-555d656a` passed onboarding, evidence correction,
  ownership, organization, facility, App eligibility ordering, Storage/Auth,
  invitation, reflection, and deterministic cleanup.
- Cleanup dry-run guard returned zero planned side effects after live proof.
- Deployed Console `/onboarding` rendered cleanly at desktop and 390 x 844
  mobile viewports with no browser console errors.
- Authenticated deployed-Console rehearsal
  `1784332419231-847df363` passed the complete visible operator path: claimant
  sign-in, unowned-facility search and selection, separate organization
  details, evidence upload, submission, admin evidence acceptance, ownership
  approval, organization approval, and final facility approval.
- The UI kept the final facility action disabled until the preceding gates were
  reflected. The facility then left Needs review, entered the Approved count,
  and became visible through `nearby_hospitals`.
- Browser errors were zero. Tagged Auth, profile, organization, wallet,
  facility, claim, evidence, and Storage artifacts were removed; the global
  cleanup and contract-drift guards both passed afterward.
- Backend contract and authenticated operator workflow are `validated`.
  Controlled field onboarding may proceed under the documented no-transfer
  boundary; existing owned-facility transfer remains a manual/legal workflow.

## One-Week Repeatability Gate

The live-readiness campaign must preserve the provider catalog while allowing
new clean demos:

- real imported/discovered hospitals are permanent claim-catalog truth;
- an unowned discovered hospital may be searched and selected, but a disposable
  run must never delete or rename it;
- stable demo coverage is reset to a documented baseline;
- ephemeral facilities are visibly labeled `[DEMO <short-run-id>]` and carry
  `e2e:<run-id>` plus `demo_scope:<run-id>` provenance; they must not use the
  stable-preview `demo:*` eligibility bypass;
- every mutating run writes an exact recovery manifest before continuing;
- cleanup deletes exact manifest resources in dependency order, then runs a
  second time and proves zero residue;
- a facility cannot be both protected and test-created in one manifest.

Execution order:

1. manifest and cleanup safety, including interrupted-run recovery;
2. new-facility and existing-unowned-facility onboarding retries;
3. evidence, claim, organization, and facility review ordering;
4. App eligibility before and after the final gate;
5. payment, dispatch, tracking, arrival, completion, visit, and one-rating
   lifecycle;
6. multi-tab, double-submit, offline/reconnect, and delayed-realtime recovery;
7. three consecutive fresh-run passes, double cleanup, global zero-residue,
   contract-drift, and eleven-pillar sign-off.

Idempotency has four separate proofs: the same command/key does not duplicate,
a fresh run remains isolated, interrupted clients converge on backend truth,
and cleanup can be applied repeatedly without touching protected catalog data.

Initial repeatability proof:

- run `1784334104297-7b38c565` intentionally failed the pending-eligibility
  assertion after its ephemeral fixture used the stable-preview `demo:*`
  encoding; exact cleanup still ran twice and global residue was zero;
- the collision was removed by reserving `e2e:*`/`demo_scope:*` for ephemeral
  fixtures while retaining a visible `[DEMO]` label;
- run `1784334199571-2d9f6608` then passed Auth, Storage, onboarding,
  correction/retry, evidence, claim, organization, facility, App eligibility,
  invitation, reflection, and two cleanup applications;
- the recovery CLI previewed zero resources, applied again successfully, and
  previewed zero afterward; the global cleanup guard remained zero.

Emergency lifecycle manifest adoption:

- the final matrix covers card confirmation, cash approval, bed reservation,
  dispatch offer/acceptance, telemetry, responder arrival, patient arrival
  acknowledgement, completion, resource release, visit synchronization, tips,
  transition audit, and rating;
- rating replay is idempotent: the first five-star write persists, the replay
  reports `already_rated`, and cannot overwrite the original value or comment;
- nonzero recovery rehearsal `flow-matrix-1784335652915-9c405b47` correctly
  failed after exposing five omitted staffing/wallet display mappings; its
  fallback cleanup left global residue at zero;
- corrected final runs `flow-matrix-1784335771609-67916700`,
  `flow-matrix-1784335859230-7e2301a5`, and
  `flow-matrix-1784335909079-03becf97` passed consecutively;
- each final run captured 21 non-empty dependency classes, reduced every class
  to zero on the first manifest cleanup, planned zero actions on the second,
  and left the global cleanup guard at zero.

### Live-readiness continuation - 2026-07-18

- Recovery audit found one manifest still marked incomplete from the intentional
  nonzero rehearsal `flow-matrix-1784335652915-9c405b47`. An exact-run preview
  found zero remaining rows or Storage objects across every cleanup class.
  Applying the same manifest cleanup completed with zero actions and a second
  preview remained zero. No protected or discovered facility was selected,
  renamed, or deleted.
- The deployed patient web app at `https://app.ivisit.ng` reached `/map` in the
  existing authenticated browser session. The map, care choices, hospital
  history, and rating entry labels rendered. The session was not created by the
  current run manifest, so no request, arrival, completion, or rating action was
  performed against it.
- The deployed smoke recorded one location-permission timeout while the manual
  map/care surface remained available. It also recorded the existing Expo AV,
  web native-driver, and Google Maps legacy-marker warnings. This is not yet
  evidence of a payment/tracking regression.
- **Next incomplete lane:** provision a disposable patient/responder/operator
  browser fixture whose identities and lifecycle rows are registered before UI
  interaction, retain it only for the rendered desktop/mobile journey, then
  exercise payment confirmation, tracking pill/sheet/ETA, realtime reconnect,
  Confirm Arrival, responder completion, and exactly one rating before applying
  the exact manifest cleanup twice. The current flow-matrix runner proves the
  backend lifecycle but always cleans its fixture in `finally`; it does not
  expose a safe browser-fixture handoff. Do not reuse the authenticated browser
  session or its unrated visits as test data.

### Rendered emergency lifecycle proof - 2026-07-18

- The flow-matrix runner now has an explicit `--prepare-browser-fixture`
  handoff. It retains only the exact manifest-owned graph, funds the disposable
  patient wallet, places the temporary facility inside the live nearby query,
  and prints disposable patient, responder, and organization-admin identities.
  The companion coordinator advances only the manifest's newest request through
  canonical RPC owners. It never writes lifecycle columns directly.
- Desktop run `flow-matrix-1784378365723-ddda6923` passed wallet payment,
  immediate Assigning render, canonical delayed-dispatch recovery, En Route
  realtime state, ETA/distance telemetry, page reload/reconnect, Arrived,
  rendered Confirm Arrival, responder completion, one five-star rating, no
  rating after reload, and idempotent repeat completion/dispatch.
- Mobile run `flow-matrix-1784378984298-4c026dee` repeated the same lifecycle at
  390 x 844. Confirm Arrival changed the rendered sheet and backend
  `patient_acknowledged_arrival_at` without refresh. Completion produced one
  rating write (`rating = 5`), reload produced no rating dialog, and repeat
  completion returned `already_completed`.
- Both manifests were applied twice. Each first cleanup removed its exact Auth,
  profile, organization, facility, staffing, responder, request, transition,
  payment, wallet, visit, notification, activity, audit, billing, doctor
  assignment, and display-mapping graph. Every second application and final
  preview planned zero resources. Older retained browser fixtures were also
  exact-cleaned twice. No discovered or otherwise unowned hospital was changed.
- A slow human rehearsal can outlive the disposable responder's telemetry lease.
  The request then remains honestly in Assigning until the coordinator refreshes
  that same responder lease and calls `console_dispatch_emergency`. The recovered
  sheet, pill, ETA, and request state converged live without a hard refresh.
- The mobile care chooser currently permits Ambulance before its nearby
  candidate query has settled. That early tap opens an honest but avoidable
  `No dispatch candidate yet` dead end; returning to the map and waiting
  recovers. Gate the CTA with the query loading/ready owner in a separate UI
  patch rather than inventing a fallback hospital.
- Cash preflight remains a captured shared-contract migration. The patient
  client directly reads `organization_wallets.balance`, while production RLS
  correctly restricts that balance to organization admins. The existing
  `check_cash_eligibility` RPC is Console-oriented and exposes balance/fee
  details without accepting the payable amount. The safe receiver is a new
  patient-safe RPC that returns generic eligibility from canonical pricing and
  the same predicates used by `approve_cash_payment`; do not weaken wallet RLS.
  Shipping that shared client change to native is an OTA/EAS Update concern and
  remains outside the no-EAS 1.0.8 readiness pack.
- Browser proof found one close-animation copy regression: after a successful
  transport rating, the single physical modal briefly fell back from `Rate your
  transport` to `Rate your visit` while saving. Git history confirmed one
  renderer and the prior dual-owner guards; the defect was presentation props
  being cleared before `MapModalShell` finished its exit. The orchestrator now
  retains the last visible service presentation for the closing frame, with a
  recovery contract assertion.
- Console Copilot P1-P3 was independently audited, rebased onto current main,
  hardened so confirmed actions cannot execute a different command or mint
  over-broad receipts, and merged through Console PR `#9` as
  `dbce47734320f37175ae9c33ced37b9cf49c453e`.

Final mobile sign-off run `flow-matrix-1784380129981-7b722a56` repeated wallet
payment, Assigning, canonical dispatch/acceptance, realtime En Route ETA,
Arrived, rendered Confirm Arrival, completion, five-star submission, reload,
and idempotent repeat completion. Nine rendered samples from submit through
2.4 seconds proved the closing sheet retained `Rate your transport` in every
visible/saving frame; `Rate your visit` never appeared. Backend truth contained
one rating (`rating = 5`), reload contained no rating dialog, and repeat
completion returned `already_completed`. Exact cleanup removed the owned graph
on its first application; the second application and final preview contained
zero resources.

The rendered payment-to-tracking-to-arrival-to-completion-to-single-rating lane
is signed off for this pack. The early Ambulance CTA loading gate and the
patient-safe cash-preflight RPC remain separately captured 1.0.9 work; do not
publish an EAS update from this pack.

### Demo catalog isolation and desktop hospital rail - 2026-07-18

- A protected global inventory captured 1,419 discovered/non-demo facilities
  before removing the historical explicit demo graph. Seven real provider
  discoveries were retained and released only from deleted demo organization
  ownership; thirteen retained facilities were released from obsolete demo
  admin identities.
- The exact cleanup removed 423 legacy demo hospitals, 106 demo
  organizations, 1,382 demo identities, 696 demo doctors, 507 demo
  ambulances, and their manifest-derived request, visit, payment, wallet,
  notification, activity, staffing, and mapping dependencies. A second apply
  was a zero-action success.
- A post-cleanup reload exposed three client-owned background bootstrap paths.
  They recreated 11 hospitals, two organizations, six identities, six doctors,
  and six ambulances. That recreated pack was captured, cleaned twice, and a
  subsequent reload plus inventory proved zero demo residue.
- Query reads, the deprecated entry loader, and the deprecated ambulance
  screen cannot provision demo data. The coverage-aware `/map` orchestrator
  remains the single automatic sparse-region recovery owner, alongside the
  explicit coverage-mode command. This preserves the historical never-empty
  guarantee without duplicate provisioning.
- No schema or migration was changed. Exact-run manifests now carry owner,
  seven-day expiry, and cleanup disposition. Existing hospital `features[]`
  carries `demo_owner:*` and `demo_expires_at:<epoch-ms>` tags. Expired demo
  fixtures are excluded at the Edge sufficiency and App service projection
  boundaries while real Google/Mapbox discoveries remain permanent.
- The desktop/left-sheet specialty rail no longer stretches vertically. It is
  bounded to a compact 50 px horizontal row, preserving hospital list space.
  Mounted web verification showed structural loading, then a real discovered
  hospital without a zero-results flash; the compact rail rendered correctly.
- Git history explains why the former writers existed. `680be76d` added intake
  backfill to prevent an incomplete emergency choice, `2471da2f` protected a
  short-lived entry-loader route, and `12d5c331` established the canonical
  `/map` recovery. The entry route and intake screen later became legacy, but
  `f2af061b` copied provisioning into the TanStack hospital query without
  retiring `/map`; that query-side copy was the active duplicate regression.
- The retained map hook also had a self-cancelling lifecycle: its pending state
  was one of its own effect dependencies. Hemet could finish provisioning while
  leaving the flag stuck, so the next location (Anchorage in the browser proof)
  could not recover until reload. Bootstrap ownership is now token-scoped, and
  a superseded completion cannot clear or block the current location.
- The emergency query refresh removed its active TanStack query and then called
  `refetch` without returning the promise. Bootstrap therefore appeared
  complete before the new hospital projection converged. Refresh now awaits the
  active observer refetch without tearing down its cache owner.
- Alaska browser proof used Anchorage and Utqiagvik. Anchorage produced six
  usable hospitals and remained six hospitals in one organization after hard
  reload. Utqiagvik started with zero demo hospitals, produced five in one
  organization, rendered the five-row list without a hard refresh, and remained
  five after reload.
- `bootstrap-demo-ecosystem` and `discover-hospitals` were deployed with the
  no-schema feature-tag contract. All five Utqiagvik fixtures carried
  `demo_owner:*` and a seven-day `demo_expires_at:*`. Forcing those exact five
  expiry tags into the past hid them immediately; canonical `/map` recovery
  renewed the same five UUIDs and the same organization, with no duplicate
  graph and a new 2026-07-25 expiry.
- Final exact cleanup removed the five hospitals, one organization, twelve
  doctors, five ambulances, eighteen demo Auth identities, and their owned
  dependents. The second apply planned zero actions while 1,437 discovered
  facilities remained protected. The cleanup path now deletes exact
  user-scoped activity through its service-only SQL receiver so an unindexed
  activity lookup cannot strand demo residue.

## 1.0.9 Local Resolution (2026-07-18)

- The care chooser now derives one discovery-pending flag from the existing
  coverage-preference and nearby-hospital query owners. Ambulance and
  Compare are unavailable across the panel, mobile-web cards, and canonical
  orbs until discovery settles; the callback repeats the guard as a backstop.
  Background demo provisioning is intentionally excluded because a failed
  bootstrap may retry independently and must never hold an emergency CTA.
- `paymentService.checkCashEligibility` no longer reads `organizations` or
  `organization_wallets`. It calls the new
  `check_patient_cash_eligibility(service_type, hospital_id, ambulance_type,
  distance_km)` receiver.
- The receiver recomputes `resolve_emergency_pricing`, uses the same
  organization fee fallback and wallet sufficiency predicate as request
  creation/`approve_cash_payment`, and returns only `BOOLEAN`. Existing Console
  `check_cash_eligibility` remains the scoped finance projection for admins.
- Wallet RLS remains unchanged. `approve_cash_payment` remains the only final
  cash debit and emergency-release owner.
- App and Console copies of the maintained `emergency_logic` and `core_rpcs`
  pillars, plus generated RPC types, have been updated together. Static
  contracts assert canonical pricing, generic output, grants, no patient wallet
  query, and App/Console pillar parity.
- This is source-complete but not production-active until the shared RPC is
  deployed and verified. Native delivery then requires a scoped OTA/EAS Update;
  no APK/AAB rebuild is implied because no native module or runtime version
  changed.

## Day 2 Cross-Lane Browser Regression (2026-07-19)

- The exact-run manifest inventory contained 34 manifests. None was expired at
  the start of this pass, none used `retire_then_prune`, and no cleanup was
  applied.
- Desktop App `/map` resolved the current pickup, six Hemet candidates, 73
  visible beds, and the recent-visit projection without browser errors.
- Mobile-web App at the Alaska sparse-region pickup began with no visible
  candidate. The canonical `/map` coverage owner created five facilities, and
  Console observed the new pack without a duplicate organization or additional
  hospital rows on reload.
- A convergence regression remains: when the hospital sheet was already open,
  it stayed at `No nearby hospitals yet` after the five facilities existed.
  Reloading `/map` immediately rendered the same five facilities and 60 beds.
  This is a query/sheet refresh defect, not permission to add another bootstrap
  owner or provision from an ordinary hospital read.
- Mobile Console at a 488 CSS-pixel viewport rendered Hospitals, 38 Requests,
  and 63 Visits with no horizontal overflow or browser errors. Initial
  structural loading settled to the authoritative rows.
- Desktop Console rendered Hospitals, Requests, Visits, Analytics, Wallet, and
  Pricing without browser errors or horizontal overflow. Wallet and Pricing
  retained their read-only/receiver-limited language.
- The location audit found a separate P0 split owner:
  `GlobalLocationContext` can render fresh device GPS while
  `useEmergencyLocationSync` preserves an older persisted device coordinate
  used by emergency coverage and request fallbacks. Manual pickup must remain
  protected, but a stale device-owned snapshot must not override fresh GPS.
- The final legacy request fallback to `DEFAULT_APP_COORDINATES` is also unsafe:
  no confirmed/manual/device pickup must fail into the existing location
  recovery flow instead of creating a request at Lagos.
- GPS accuracy, timestamp, and quality are currently discarded; coordinate
  truthiness rejects valid zero coordinates; and precise GPS can fall through
  to public Nominatim. These remain separate location-quality/privacy work and
  require no schema migration.

**Next incomplete lane:** diagnose and repair the Alaska post-bootstrap query
convergence through its existing TanStack/query owner, then close the two P0
location correctness defects with focused contracts. After those pass, repeat
the exact-manifest App-Console-Supabase lifecycle and cleanup/idempotency proof
before any commit, deployment, or EAS action.

## Day 3 Exact-Manifest Lifecycle And Cleanup Proof (2026-07-19)

- Prepared exact disposable run
  `flow-matrix-1784453090551-bdae600f` with disposition
  `hard_delete_exact_run`. The manifest exclusively owned its patient,
  responder, doctor, organization admin, organization, hospital, ambulance,
  staffing, wallets, and later lifecycle graph. It protected no discovered
  facility and performed no broad-match cleanup.
- The signed-in patient selected the manifest hospital from a Lagos pickup and
  completed the rendered wallet path. Backend truth created one request
  (`REQ-B87041`), one completed wallet payment, and one request-derived visit.
  The payment sheet showed `Payment confirmed` before the map entered
  `Assigning`.
- Canonical coordinator commands dispatched and accepted the manifest
  responder, then wrote leased telemetry. The already-mounted App converged
  without reload from `Assigning` to `En Route`; the top pill, tracking sheet,
  responder identity, ETA, and route values agreed.
- Reload/reconnect preserved the same request and responder assignment. The
  rendered route recomputed from 31 minutes / 15 km to 30 minutes / 9.9 km
  without creating another request, payment, visit, or assignment.
- The coordinator advanced the request to `arrived`. The mounted App updated
  without a hard refresh: the top pill showed `Arrived`, ETA and distance
  reached zero, and the sheet exposed `Confirm Arrival`.
- The patient used the rendered `Confirm Arrival` control. Backend status
  remained `arrived` while `patient_acknowledged_arrival_at` became non-null,
  and the sheet immediately changed to `Arrival confirmed`.
- Canonical completion then moved the request and visit to `completed`.
  Exactly one transport-rating dialog rendered. A five-star submission wrote
  one visit rating and one `rated_at`; reload rendered zero rating dialogs.
  Repeating completion returned `already_completed` and did not alter the
  rating.
- Console independently rendered the same completed request, manifest
  hospital, responder, confirmed patient arrival, wallet payment amount and
  status, and the completed request-derived visit. Console performed no repair
  or lifecycle mutation.
- First exact cleanup removed the owned graph, including eight notifications,
  one audit row, one insurance-billing row, three doctor assignments, one
  visit, one payment and ledger reference, one responder assignment, five
  status transitions, one request, four patient-wallet targets, one ambulance,
  one doctor, one created facility, one organization, thirteen display
  mappings, four profiles, and four Auth identities.
- The second cleanup application succeeded with every planned count already
  zero. A final preview again reported every count as zero. The global cleanup
  dry-run guard reported zero planned side effects, and all twelve
  exact-manifest contract tests passed.
- The Day 2 Alaska convergence diagnosis remains valid despite the older
  checkpoint language above: commit `21030ace` removed three duplicate
  provisioning owners correctly, but its retained `/map` hook can cancel a
  successful same-key completion before `refreshHospitals`. The hospital rows
  persist in Supabase; a hard reload merely reads them. The repair must
  stabilize the single retained owner and its loading projection, not restore
  query-, entry-, or legacy-intake provisioning.

**Next incomplete lane:** repair and verify the retained `/map` bootstrap
refresh race, device-owned location synchronization, and missing-location
request guard. Keep each change independently testable; do not touch schema,
migrations, production contracts, git, deployment, or EAS until the combined
verification gate passes.

## Day 4 Bootstrap And Location Correctness Gate (2026-07-19)

- The canonical `/map` sparse-region bootstrap remains the only automatic demo
  coverage owner. Its task identity is now pickup- and user-scoped rather than
  render-scoped, so same-pickup query churn cannot cancel a successful
  provisioning completion before the mounted hospital query refreshes.
- Coverage count changes and callback identity changes do not create a second
  task. A real pickup change, a covered next pickup, disabled demo coverage, or
  unmount invalidates the old task before it can refresh stale UI. A successful
  task refreshes the current query exactly once.
- Map loading truth now reaches the hospital list from the existing query and
  bootstrap owners. Structural loading wins over the terminal
  `No nearby hospitals yet` state while sparse-region recovery is pending; no
  query-, entry-, or deprecated request-screen provisioner was restored.
- Fresh device GPS can replace a stale device-owned or legacy persisted pickup
  after meaningful movement. A 25 m threshold prevents GPS noise from churning
  persisted discovery state, while explicit manual pickup remains protected.
  Observation timestamps prevent older device events from winning.
- Coordinate guards accept genuine numeric `0,0`, but reject null, blank,
  non-finite, and out-of-range latitude/longitude values. Malformed coordinates
  cannot be coerced into a Gulf of Guinea pickup.
- Emergency request creation no longer imports or commits
  `DEFAULT_APP_COORDINATES`. It prefers an explicit request pickup, then valid
  device GPS, then a valid stored pickup. If all are unavailable, it returns
  recoverable `MISSING_LOCATION` before the backend receiver and releases the
  in-flight guard for retry. Existing UI copy tells the patient to choose a
  pickup location.
- Focused bootstrap/location tests passed seven Node subtests plus the request
  commit guard. The seven emergency continuity contracts passed for active-trip
  read authority, discovery, payment lifecycle, pricing, rating recovery,
  realtime, and web tracking state.
- A clean local web reload rendered the map with six Hemet candidates and 73
  beds. Opening the hospital sheet rendered all six authoritative rows with no
  new runtime error. The existing deleted disposable test identity produced
  only the expected profile lookup warning and created no new fixture.
- The web export completed successfully. No Day 4 change touched schema,
  migration SQL, Edge Functions, Supabase contracts, or Console source. Dirty
  payment/RPC migration work remains a separate 1.0.9 pack and must not be
  accidentally included with this patch.
- The Console Requests regression pass surfaced one intermittent
  `Maximum update depth exceeded` failure in
  `CheckboxIndicator -> Presence`. The row and shared checkbox source were
  unchanged by this pass; the installed Radix Checkbox 1.3.3 resolved the
  documented affected Presence 1.1.5 implementation under React 19. The
  official patched Checkbox 1.3.7 now resolves Presence 1.1.7 for that
  component. Twenty Requests contracts, the full Console production build,
  clean route reload, repeated row toggles, and repeated select-all/clear-all
  transitions passed with no new runtime error.

**Next incomplete lane:** isolate and review the intended Day 4 source, tests,
and this ledger entry from the pre-existing payment/RPC work. Obtain explicit
action-time approval before staging, committing, pushing, deploying, or
publishing an EAS Update.

## Console Invitation Receiver And Delivery Proof (2026-07-19)

- The shared Auth Site URL remains the patient callback
  `ivisit://auth/callback`; changing that global owner would break patient Auth.
  Console invitations now require an explicit `CONSOLE_URL` and target only
  `https://console.ivisit.ng/set-password`.
- The exact Console password receiver was added to the hosted Auth redirect
  allowlist. The `invite-user` Edge Function fails closed when its Console
  origin is absent or malformed, marks invited users with
  `invitation_surface: console`, and returns the resolved receiver as delivery
  evidence.
- The Console receiver recognizes a Console invitation session after Supabase
  consumes the URL fragment, clears the invitation marker when the password is
  set, and routes an assigned provider into the operational workspace.
- A real delivered provider invitation was accepted in the deployed Console.
  Password creation succeeded and the assigned provider reached the Today
  workspace instead of the patient app or generic onboarding.
- The hosted invite email now uses the subject
  `You're invited to iVisit Console`, short organization-aware copy, and a
  secure CTA whose `redirect_to` is the exact Console password receiver. No
  patient deep-link or internal implementation copy is visible.
- All disposable invitation probes were exact-manifest owned. Cleanup ran
  twice for each probe and final checks found zero profile rows and zero Auth
  users.
- Console commits `3fc437e6` and `3dfbb89d` are on `main` and deployed.
  App commits `cf8a1a34` and `b15e5f4c` isolate the invitation contract and the
  bootstrap/location repair from the still-dirty payment/RPC 1.0.9 pack.

### Release Closure (2026-07-19)

- App commits `cf8a1a34`, `b15e5f4c`, and `530e82b9` were pushed to `main`.
  The pre-existing payment/RPC and migration work remained unstaged.
- A clean worktree at exact commit `530e82b9` passed the Android marker-density
  OTA law, service-role bundle guard, focused bootstrap/location tests, and a
  2,833-module web export.
- The deployed patient web bundle renders the authoritative hospital sheet and
  contains the recoverable missing-location contract.
- Production OTA group `24202178-4aaa-4916-8180-90844048f10b` was published for
  runtime `1.0.8` on Android and iOS from exact commit `530e82b9`. Expo reports
  it as the current production update.

**Next incomplete lane:** the bootstrap/location and invitation incident is
closed. Treat the still-dirty patient cash-eligibility RPC and payment UI work
as its own 1.0.9 contract, migration, verification, and release decision.

### Historical Test-Payment Retirement (2026-07-19)

- The product owner confirmed that every historical payment record was test
  data. An exact manifest retired 28 payment rows and the 19 request graphs
  they funded; it did not select hospitals, organizations, profiles, Auth
  users, or wallets as cleanup targets.
- The cleanup removed only dependent evidence owned by those exact request or
  payment IDs: 22 wallet-ledger entries, 19 visits, 25 status transitions,
  eight billing rows, 14 notifications, one chat room, and associated ID
  mappings. Wallet effects were reversed by signed ledger amount and only
  after proving each affected wallet has exactly one supported owner.
- The first application reported zero residue. A second application was a
  no-op, proving repeat safety. Read-back confirmed zero payments, zero
  captured requests, and zero ledger entries for the retired IDs.
- This is test-data hygiene and cleanup-tool hardening only; it requires no
  schema change, production contract change, or EAS update.

### Historical Synthetic Ledger Retirement (2026-07-19)

- After payment retirement, a read-only audit found 79 orphaned ledger rows:
  46 false platform-fee entries and their matching synthetic organization
  audit effects. None referenced a remaining payment or emergency request.
- An exact ledger-ID manifest removed only those 79 entries. The platform
  wallet was a live, uniquely owned receiver, so its false fee credits were
  reversed by the signed ledger total: `$100,201.00` to `$100,120.75`
  (`$80.25`). The counterpart wallet rows were evidence-only because their
  historical wallet owners no longer existed; no nonexistent balance was
  invented or altered.
- The cleanup remains fail-closed for ambiguous wallet ownership. It may
  delete an exact manifest-owned ledger row with no surviving wallet owner,
  while reversing balances only for uniquely resolved organization, patient,
  or platform wallets.
- First apply reported zero residue; second apply was a no-op; the final
  `wallet_ledger` count is zero. This does not reset the platform's seeded
  opening balance, which would be a separate product/accounting decision.

### Synthetic Platform Opening-Balance Correction (2026-07-19)

- The product owner confirmed that the remaining `$100,120.75` platform
  opening balance was also test money. A one-time guarded correction targeted
  only the verified platform wallet ID at that exact balance and set it to
  `$0.00 USD`; read-back confirmed the result. No ledger, organization,
  hospital, profile, patient, or schema record was changed.

### Seamless Demo Finance Isolation (2026-07-19)

- The ordinary patient demo remains seamless: its cash confirmation advances
  into dispatch, live tracking, arrival, completion, and one canonical rating.
  It now uses a service-role-only `approve_demo_cash_payment` receiver that
  requires demo-hospital provenance and records `demo = true`,
  `settlement = simulated`; it cannot write a platform/org wallet or ledger.
- `bootstrap-demo-ecosystem` no longer seeds or tops up either shared wallet.
  Demo readiness is simulated; real `approve_cash_payment` and the
  manifest-owned finance-contract harness remain the only fee-settlement lane.
- The payment-readiness projection recognizes only that explicit simulated
  demo proof, so an arbitrary completed cash row cannot bypass the dispatch
  gate. The receiver, real cash approval, and mobile UI are independently
  reversible; no EAS update is involved.
- Deployed proof: the manifest-owned live demo lifecycle ran 30 checks through
  auto-approval, realtime dispatch/ETA, arrival acknowledgement, completion,
  and rating with zero graph residue. A harness cleanup defect that left a
  `$4.50` real-fee probe balance was caught, exactly reversed, and repaired;
  final platform balance and ledger count are both zero.

### Current Demo and Financial-State Inventory (2026-07-19)

- The zero-residue proof above applies to the exact live-test manifest and to
  real-money receivers. It must not be interpreted as a claim that the shared
  database contains no historical demo coverage fixtures.
- A read-only inventory found seven active, expiry-tagged coverage-demo
  organizations, 46 demo hospitals, 29 available demo ambulances, 29 active
  responder assignments, 95 demo profiles, and 61 demo doctors. Their expiry
  tags all currently resolve to 2026-07-26; no demo-hospital emergency request
  is active. Discovered hospitals remain outside this set and are preserved for
  future organization claims.
- The platform wallet is `$0.00` and `wallet_ledger` is empty. Demo patient
  wallets also total `$0.00`. Five historical demo organization wallets still
  hold a combined synthetic `$125,000.00`; this is legacy bootstrap residue,
  not payment settlement, and requires a separate exact ownership/retirement
  manifest before any write.
- `insurance_billing` has 220 historical pending rows totaling `$10,635.00`.
  211 are fully unlinked from request, hospital, and user; the remaining nine
  are zero-dollar links. They are not valid receivables and must be quarantined
  from operational totals, then retired only through an exact-ID manifest after
  the related historical request evidence is classified.

### Exact Historical Finance and Notification Retirement (2026-07-19)

- The product owner authorized the retirement of the identified synthetic
  residues. A preflight manifest selected exactly five known demo organization
  wallet IDs at `$25,000.00 USD` each, 220 historical `insurance_billing` IDs,
  and 29 notification IDs whose recipients were all proven demo profiles.
- The manifest reset only those five wallet balances to `$0.00`, deleted the
  220 non-receivable billing artifacts, and deleted the 29 demo notifications.
  It did not target profiles, Auth users, discovered hospitals, claims,
  emergency requests, visits, audit/activity records, or ID mappings.
- The same manifest was immediately re-applied as an idempotency proof:
  zero wallet updates, zero billing deletions, and zero notification deletions.
  Post-checks found zero non-zero target-wallet balances and zero manifest
  billing/notification rows. The 46 active expiry-tagged demo hospitals and 29
  demo ambulances were preserved unchanged for seamless fallback coverage.

## Day 5 Rendered Lifecycle And Onboarding Repeat (2026-07-21)

- The manifest gate found 34 exact-run manifests. None was expired and none
  used `retire_then_prune`, so no expiry-driven cleanup was applied before the
  run.
- The self-cleaning live emergency suite passed all 30 checks, including demo
  cash approval, two-session realtime convergence, arrival acknowledgement,
  completion ordering, one-rating idempotency, retry recovery, and zero
  residue.
- Rendered run `flow-matrix-1784656361449-7313241e` proved the mounted App at
  desktop and 390 x 844 mobile-web sizes. Responder acceptance changed
  `Assigning` to `En Route` without reload; the pill, sheet, responder, ETA,
  and route agreed. Reload restored the same lifecycle graph. Arrival changed
  the pill and sheet immediately, rendered `Confirm Arrival`, and the patient
  action showed pending feedback before reflecting `Arrival confirmed`.
- Repeating arrival acknowledgement returned `already_acknowledged`.
  Completion rendered exactly one transport-rating dialog. One five-star
  submission produced `rating = 5` and one `rated_at`; reload rendered zero
  rating dialogs. Exact cleanup removed the complete owned graph and the
  second preview reported zero resources in every class.
- The live Console contract run `1784656636220-d40cb757` passed Auth, private
  evidence, invitation redirect, organization provisioning, facility claim,
  review ordering, App eligibility, failure recovery, and double cleanup.
- Deployed Console browser run `1784656693733-3bda49c3` used protected
  discovered facility `8bc06c7d-a47e-489a-8ec8-a0e0cdac60b6`. The reviewer
  accepted evidence, requested ownership changes, accepted replacement
  evidence, then approved ownership, organization, and facility in order.
  Needs-review changed from 962 to 961, Approved from 38 to 39, and the exact
  facility became visible through `nearby_hospitals` only after the final gate.
- The claimant correction receiver worked and requeued the same organization
  and claim. The deployed frontend did not route the claimant into the
  correction wizard; direct `/onboarding` redirected to Today. Git history and
  the worktree showed the July 18 correction UI, owner-bound draft storage,
  safe correction projection, and exact queue-count repair were preserved
  locally but not adopted into the deployed bundle. Protected-route onboarding
  detection also lacked the `changes_requested` organization state.
- Cleanup correctly stopped when the protected facility differed from its
  captured snapshot. After an exact current-state assertion, the five captured
  eligibility/ownership fields were restored to the pre-run snapshot. Exact
  cleanup then removed two Auth users, two profiles, one organization, one
  claim, two evidence rows, two Storage objects, the owned wallet graph, and
  mappings. The second preview was all zero while the discovered hospital
  remained present, unowned, pending, and non-dispatch-eligible.

**Next incomplete lane:** adopt the preserved Console correction pack plus the
`changes_requested` protected-route guard, run focused onboarding/verification
tests and the production build, commit and push only that coherent pack, deploy
Console, then repeat the adverse-decision claimant redirect on the deployed
bundle. No schema, migration, patient contract, or EAS update is involved.

### Day 5 closure: deployed correction recovery (2026-07-21)

- Console commit `cca63dc1` adopted the correction recovery, owner-bound draft,
  exact queue-count, and shared review-gate pack on `main`. The Git-linked
  Vercel deployment completed successfully.
- Focused verification passed 17 onboarding tests and 40 verification tests;
  the production build also passed encoding, mojibake, data-contract,
  UI-hardgate, mobile-grammar, and optimized compilation checks.
- The final deployed rehearsal used exact manifest
  `1784658135711-4ae9a5b1`. It established that claim-level
  `changes_requested` and organization-level `changes_requested` are distinct
  contracts: a claim correction requeues ownership evidence, while the
  organization decision is what places the account back into onboarding.
- After the reviewer requested organization changes, the already-authenticated
  claimant reloaded directly into `Submit requested changes` on `/onboarding`.
  The correction view restored the same organization and claim identifiers and
  required replacement evidence; it did not create a parallel owner.
- The protected discovered hospital was restored to its exact captured snapshot
  before cleanup. The owned fixture graph was removed, and a second preview
  reported zero resources in every disposable class while retaining the
  protected hospital for future claiming.

**Next incomplete lane:** none for this Day 5 payment-to-tracking and hospital
claim/verification gate. The separate short-lived responder telemetry limitation
in the pre-created `ready` browser fixture remains a test-harness improvement;
it is not evidence of a production lifecycle regression. No EAS update is
required for this Console-only closure.

## Patient Cash Preflight And Rich-Fixture Closure (2026-07-21)

- The patient cash-availability gate no longer reads organization fee
  percentages or organization-wallet balances. It calls the boolean-only
  `check_patient_cash_eligibility` receiver with the same service, hospital,
  ambulance tier, and distance context used by the active checkout surface.
  A missing or failed receiver fails closed and asks the patient to choose a
  different payment method; the eligibility boundary exposes no finance
  details. Existing checkout-fee presentation remains a separately owned
  pricing concern and was not changed by this pack.
- The exact three-statement receiver bundle was extracted from the canonical
  emergency pillar, rehearsed inside a rolled-back transaction, and applied to
  project `dlwtcmhdzoklveihuhjf`. Six live preflight checks and two post-deploy
  catalog/ACL assertions passed. A direct service-role probe returned a BOOLEAN
  and returned `false` for an unknown hospital. Exact rollback is
  `DROP FUNCTION IF EXISTS public.check_patient_cash_eligibility(TEXT, UUID,
  TEXT, NUMERIC);`.
- The Console top-up command now sends the receiver-owned top-level
  `is_top_up: true` discriminator in addition to descriptive metadata. This
  prevents future top-up confirmations from being misclassified as ordinary
  payments without changing the payments schema.
- The emergency flow matrix passed payment, dispatch, arrival,
  acknowledgement, completion, transition-history, notification, billing, and
  wallet assertions. Its first exact-manifest cleanup removed three requests,
  five payments, 13 transitions, 23 notifications, seven ledger effects, and
  the rest of the owned graph with zero residue. The second cleanup planned
  zero resources.
- The cleanup harness had a proof-only Auth residue bug: after deleting and
  directly asserting captured Auth users were absent, it re-counted every
  manifest Auth ID without querying existence. The follow-up planner now uses
  the proven-absent option. The interrupted run was cleaned twice; the repeated
  full matrix then passed with both cleanup proofs.
- `fleet-rich` prepared six independently rendered ambulance states using
  valid timestamp ETAs. `provider-rich` prepared six provider states and four
  schedules. Both exact-run manifests were cleaned to zero residue and applied
  a second time as no-ops. Discovered hospitals were not targeted.
- Seven emergency continuity test files, the RPC authority guard, all 17
  shared App/Console source contracts, and all 16 live shared contracts passed.
  The App web export and Console production build remain required release gates
  after the final diff review.

**Next incomplete lane:** finish App and Console production builds, commit and
push coherent packs, and verify the deployed Console build. The current task
session does not expose the in-app browser-control runtime, so a fresh visual
desktop/mobile click-through remains an explicit release observation rather
than an inferred pass. Publish an App EAS OTA only after that observation and
only if the final patient JavaScript diff is intentionally released before
1.0.9.

## Day 6 Deployed Browser Lifecycle And Facility Identity Repair (2026-07-21)

- The deployed App passed the unauthenticated map and ambulance-decision lane
  at 1280 x 720 and 390 x 844. Both layouts had zero horizontal overflow; the
  mobile decision sheet rendered the selected hospital, Everyday care,
  `$160.00`, responder/crew facts, and one `Confirm & continue` action.
- Exact run `flow-matrix-1784683977169-816bf0ba` then proved the authenticated
  live lifecycle. A telemetry event changed `Tracking delayed` to `Approaching`
  without reload. Responder arrival changed the top pill and sheet to
  `Arrived` without reload and exposed `Confirm Arrival`. The patient action
  immediately persisted `patient_acknowledged_arrival_at` and changed the
  sheet to `Arrival confirmed`.
- Responder completion produced exactly one rating dialog. One five-star
  submission persisted `rating = 5` and one `rated_at`; reload rendered zero
  rating dialogs. The manifest-owned graph was then removed, and a second
  cleanup pass found zero resources in every disposable class.
- That cross-session fixture also exposed a previously masked facility-identity
  defect. The request truth was `[DEMO 816bf0ba] Flow Matrix Hospital`, but the
  tracking sheet and map rendered the browser's prior Banning map selection.
  Git history traced both causes to original extractions rather than a recent
  database change: `mapActiveRequestModel` had preferred local map selection
  over `record.hospitalId` since `0cd9f485` (2026-04-22), and the active-trip
  projection had omitted `hospitalName` since `8bdce65d` (2026-04-26).
- The surgical repair makes the request-owned hospital ID authoritative,
  hydrates that exact facility once through `hospitalsService`, preserves it
  across same-request refreshes, and falls back to an ID/name-only object when
  facility hydration is unavailable. It will no longer route or label an
  active emergency with an unrelated cached hospital.
- Post-deploy verification proved the exact facility name and address were
  restored, then exposed the matching pickup boundary: the tracking sheet and
  route still used the browser's current Banning pickup while the request-owned
  `patient_location` was in Lagos. Git history traced that fallback to the same
  April map-model extraction. The follow-up projects the request pickup into
  the tracking model, map origin, responder bearing, route calculation, and
  sheet copy. Non-tracking discovery continues to use the user's current map
  location. A stable coordinate memo prevents the shared tracking clock from
  causing route recalculation every second.
- All seven emergency continuity contracts and the production web export pass.
  The deployed Console login shell also passed at desktop and 390 x 844 with
  zero horizontal overflow and correct mobile recomposition. No schema,
  migration, RPC, payment receiver, or Console contract changed in this pack.

**Next incomplete lane:** commit and push the request-owned pickup continuation,
wait for the Git-linked App web deployment, then reload the still-owned exact
accepted request to prove the deployed facility, pickup, and route all come
from the request rather than the prior map selection. Clean that manifest
twice. Publish EAS only after that post-deploy proof passes.
