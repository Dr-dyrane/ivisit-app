# SCC-061: Data Room Shared Contract Reconciliation

Status: source implemented; production cutover pending separate review

Owner: App Supabase pillars with private Data Room receiver adoption

Date: 2026-07-21

## Outcome

The Data Room is not a separate database product. Its runtime schema is part of
the shared iVisit Supabase contract, while the private `iVisit-docs` manifest is
the authority for document revision, factual date, lifecycle, external sharing,
export, and content hash.

This pass restores the deployed Data Room tables to their canonical pillar
owners and implements a fail-closed receiver boundary. It does not apply SQL to
production, regenerate post-cutover types, deploy the Data Room, or publish an
App EAS update.

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

## Cutover sequence

1. Review the exact pillar delta and rollback SQL.
2. Emit one narrow temporary forward deployment from the approved pillar delta.
3. Apply column grants/RLS and receiver-compatible SQL atomically; refresh the
   PostgREST schema cache.
4. Prove unauthenticated/authenticated content denial, self-approval denial, and
   invite non-enumeration before publishing any document.
5. Regenerate App types, sync the canonical pillars/types to Console, and verify
   the Data Room build against the resulting contract.
6. Deploy the matching Data Room build.
7. Run admin, viewer, sponsor, lawyer, CTO, developer, pending, approved,
   revoked, email-mismatch, expiry, replay, reconnect, notification-idempotency,
   export, and content-hash-drift lanes on desktop and mobile.
8. Remove the temporary deployment file and repair its migration-history row
   only after live proof passes.

## Release decision

Production Data Room external access is No-Go until the cutover above is
completed. The App patient experience is unchanged, so this work does not
require an EAS update.
