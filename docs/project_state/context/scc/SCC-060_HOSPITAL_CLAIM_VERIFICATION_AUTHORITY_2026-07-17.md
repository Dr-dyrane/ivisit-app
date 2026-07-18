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
