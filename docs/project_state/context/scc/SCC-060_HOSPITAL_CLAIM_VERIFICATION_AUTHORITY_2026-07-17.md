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
