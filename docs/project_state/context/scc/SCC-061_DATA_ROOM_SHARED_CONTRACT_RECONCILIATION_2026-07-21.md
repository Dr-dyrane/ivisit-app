# SCC-061: Data Room Shared Contract Reconciliation

Status: production contract cut over; signed-in role/content release matrix pending

Owner: App Supabase pillars with private Data Room receiver adoption

Date: 2026-07-21

## Outcome

The Data Room is not a separate database product. Its runtime schema is part of
the shared iVisit Supabase contract, while the private `iVisit-docs` manifest is
the authority for document revision, factual date, lifecycle, external sharing,
export, and content hash.

This pass restores the deployed Data Room tables to their canonical pillar
owners and implements a fail-closed receiver boundary. The matching private Data
Room build and the reviewed App-owned contract were deployed on 2026-07-21. No
App EAS update was published because the patient runtime is unchanged.

## Production cutover evidence

- Vercel reported the exact private Data Room commit `fdaaee8` successful on the
  production branch before database privileges were narrowed.
- the final atomic cutover extracted 41 statements only from the four canonical
  Data Room marker blocks; source digest `2352b81439742b57`;
- production row counts remained 22 documents, 8 access rows, and 0 invites
  before and after deployment;
- anonymous document-content and invite reads are denied;
- authenticated document-content, `file_path`, and invite reads are denied;
- authenticated direct self-approval insert is denied;
- `claim_document_invite(TEXT)` is live and rejects an unknown token without
  exposing invite truth;
- the exact disposable authentication fixture was removed with zero access-row
  residue;
- replay initially exposed a missing drop for the canonical access-read policy;
  the failed replay rolled back, the mirror was repaired, and two subsequent
  full applies passed with unchanged row counts;
- authenticated lifecycle runs then exposed that Realtime Postgres Changes
  requires table-level `SELECT`; `access_requests` now grants that read while
  RLS remains the row boundary and documents/invites remain denied;
- two consecutive exact-run lifecycle passes proved email mismatch, expiry,
  claim, realtime approval, same-user replay, reconnect, revocation, and
  approved/revoked notification idempotency, followed by double cleanup and
  zero exact-run residue;
- the canonical `https://docs.ivisit.ng` shell initially rendered cleanly, but a
  completed Google OAuth handoff later proved that the query-bearing callback
  was not covered by the hosted redirect allowlist and fell back to the patient
  `ivisit://` Site URL;
- the hosted allowlist was therefore extended narrowly with
  `https://docs.ivisit.ng/auth/callback*`, preserving the patient Site URL while
  allowing the Data Room's internal `next` return path;
- the web manifest's undeployed `/logo.svg` and `/logo.png` entries and false
  512x512 declaration were removed in favor of the tracked, deployed 218x218
  Next `/icon.png` asset.

## Read-only live proof

Live catalog inspection established:

- 22 documents, 8 approved NDA-signed access rows, and 0 invite rows;
- `documents`, `access_requests`, and `document_invites` have RLS enabled;
- authenticated users currently have broad table privileges;
- the live documents SELECT policy is authenticated `USING (true)`, allowing
  direct reads of all `content` bodies;
- the live access INSERT policy checks only `auth.uid() = user_id`, allowing a
  caller to submit `status = 'approved'` for itself;
- the live invite SELECT policy is `USING (true)` for anon/authenticated, so a
  future token and recipient email would be enumerable;
- `claim_document_invite(TEXT)` is absent;
- Data Room migration 003 is unapplied and insufficient because row eligibility
  alone does not protect the `content` column.

No row, schema, function, migration history, invite, or deployment was changed
during the capture.

## Canonical ownership

| Contract | Owner |
|---|---|
| `documents`, `access_requests`, `document_invites` tables and indexes | `0005_ops_content` |
| RLS, table/column grants, direct-write denial, token non-enumeration | `0007_security` |
| Access-created/status notification triggers | `0009_automations` |
| Atomic invite claim command | `0100_core_rpcs` |
| Revision, lifecycle, external-share, export, approved SHA-256 | private `iVisit-docs` manifest |
| Access request, admin decision, invite delivery, protected content | Data Room Next server receivers |

The existing shared `user_roles`, `profiles`, `notifications`, and
`emit_canonical_notification` contracts are reused. Data Room migrations must
not create competing versions.

## Implemented source contract

- `documents` now matches the deployed structural shape in the owner pillar,
  including required `file_path`, `icon`, tier constraint, and live-compatible
  timestamp nullability.
- `access_requests` and `document_invites` are restored to `ops_content` with
  their live keys, constraints, indexes, and access-request realtime membership.
- authenticated clients receive only eligible document metadata columns. They
  receive no `content` or `file_path` column grant.
- direct authenticated document mutation, access mutation, and invite reads or
  writes are revoked. Server receivers remain the action owners.
- `claim_document_invite` serializes on the invite and request rows and validates
  authentication, token shape, recipient email, signature, expiry, revocation,
  cross-user replay, and same-user approved replay.
- access notifications call the canonical idempotent notification helper with
  stable event keys and fixed function search paths.
- the content route authorizes first, performs service-only content retrieval,
  and rejects non-admin delivery when the DB body does not match the approved
  manifest hash.
- access and invite receivers reject documents that are not explicitly approved
  for external sharing.
- multi-row Data Room audience roles resolve by deterministic precedence rather
  than `.maybeSingle()`.
- invite API responses distinguish invite creation from email-delivery truth.

## Completed cutover sequence

1. Reviewed the exact pillar delta and retained a fail-closed containment path.
2. Generated one narrow deployment directly from the approved pillar markers.
3. Applied column grants/RLS and receiver-compatible SQL atomically; refreshed the
   PostgREST schema cache.
4. Proved unauthenticated/authenticated content denial, self-approval denial, and
   invite non-enumeration before publishing any document.
5. Synchronized the generated App and Console function contracts and verified
   the Data Room build against the resulting contract.
6. Deployed the matching Data Room build before narrowing database privileges.
7. Authenticated receiver lanes for pending, approved, revoked, email mismatch,
   expiry, replay, reconnect, and notification idempotency are complete.
   Remaining release gate: signed-in admin/viewer/sponsor/lawyer/CTO/developer
   visual acceptance plus export and content-hash-drift checks on desktop/mobile.

No temporary migration-history row was created; the deployment harness invoked
the canonical pillar blocks atomically through the service-only SQL receiver.

## Release decision

The three live authorization bypasses are closed. External document publication
remains No-Go until human content/legal approvals and the signed-in role matrix
are complete. The App patient experience is unchanged, so this work does not
require an EAS update.
