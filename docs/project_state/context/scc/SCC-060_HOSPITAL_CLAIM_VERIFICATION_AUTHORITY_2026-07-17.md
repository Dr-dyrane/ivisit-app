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

**Next incomplete lane:** rerun one disposable mobile completion to visually
confirm the rating close-animation copy fix, then gate the early Ambulance CTA
at its canonical nearby-query owner. Plan the patient-safe cash preflight RPC
as a separately reviewed backend/client migration aligned with the 1.0.9 OTA
boundary; do not publish an EAS update from this pack.
