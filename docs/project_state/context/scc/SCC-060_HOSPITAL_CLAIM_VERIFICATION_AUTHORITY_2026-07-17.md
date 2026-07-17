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
- Backend contract is `validated`. A field-agent rollout still requires one
  authenticated operator UI rehearsal of the claim and Approvals click path;
  the same receivers are already proven live by the disposable E2E.
