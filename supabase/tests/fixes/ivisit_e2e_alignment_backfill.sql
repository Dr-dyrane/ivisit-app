-- iVisit E2E 1:1 Alignment Backfill (Idempotent)
-- Purpose: repair foundational data gaps without changing schema.
-- Scope: organization wallets, platform wallet presence, emergency/visit linkage backfill,
--        canonical snapshot enrichment on emergencies/visits.
--
-- Safety:
-- - Idempotent inserts use ON CONFLICT / NOT EXISTS.
-- - Updates target NULL/blank or derivable values only.
-- - No deletes.
--
-- Recommended order:
-- 1) Run on staging first.
-- 2) Run ivisit_e2e_alignment_audit.sql before and after.
-- 3) Re-run task validation flows after backfill.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Pre-flight summary
-- ---------------------------------------------------------------------------
SELECT 'preflight' AS stage,
       (SELECT COUNT(*) FROM public.organizations) AS organizations_count,
       (SELECT COUNT(*) FROM public.organization_wallets) AS organization_wallets_count,
       (SELECT COUNT(*) FROM public.ivisit_main_wallet) AS platform_wallet_count,
       (SELECT COUNT(*) FROM public.emergency_requests) AS emergency_count,
       (SELECT COUNT(*) FROM public.visits) AS visit_count;

-- ---------------------------------------------------------------------------
-- 1) Backfill missing organization wallets
-- ---------------------------------------------------------------------------
WITH inserted AS (
  INSERT INTO public.organization_wallets (organization_id, balance, currency)
  SELECT o.id, 0.00, 'USD'
  FROM public.organizations o
  LEFT JOIN public.organization_wallets ow ON ow.organization_id = o.id
  WHERE ow.id IS NULL
  ON CONFLICT (organization_id) DO NOTHING
  RETURNING id, organization_id
)
SELECT 'org_wallet_backfill' AS step, COUNT(*) AS inserted_rows
FROM inserted;

-- ---------------------------------------------------------------------------
-- 2) Ensure platform wallet exists (required for fee distribution paths)
-- ---------------------------------------------------------------------------
WITH inserted AS (
  INSERT INTO public.ivisit_main_wallet (balance, currency, last_updated)
  SELECT 0.00, 'USD', NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.ivisit_main_wallet)
  RETURNING id
)
SELECT 'platform_wallet_backfill' AS step, COUNT(*) AS inserted_rows
FROM inserted;

-- ---------------------------------------------------------------------------
-- 3) Enrich emergency snapshots for UI parity (safe, derivable updates only)
-- ---------------------------------------------------------------------------
WITH updated_hospital_name AS (
  UPDATE public.emergency_requests er
  SET hospital_name = h.name,
      updated_at = NOW()
  FROM public.hospitals h
  WHERE er.hospital_id = h.id
    AND (er.hospital_name IS NULL OR BTRIM(er.hospital_name) = '')
  RETURNING er.id
)
SELECT 'emergency_hospital_name_backfill' AS step, COUNT(*) AS updated_rows
FROM updated_hospital_name;

WITH updated_responder_snapshot AS (
  UPDATE public.emergency_requests er
  SET responder_name = COALESCE(er.responder_name, p.full_name, p.username),
      responder_phone = COALESCE(er.responder_phone, p.phone),
      updated_at = NOW()
  FROM public.profiles p
  WHERE er.responder_id = p.id
    AND (
      er.responder_name IS NULL OR BTRIM(er.responder_name) = '' OR
      er.responder_phone IS NULL OR BTRIM(er.responder_phone) = ''
    )
  RETURNING er.id
)
SELECT 'emergency_responder_snapshot_backfill' AS step, COUNT(*) AS updated_rows
FROM updated_responder_snapshot;

-- ---------------------------------------------------------------------------
-- 4) Backfill visits for emergencies missing a linked visit (core 1:1 repair)
-- ---------------------------------------------------------------------------
WITH missing_emergencies AS (
  SELECT er.*
  FROM public.emergency_requests er
  LEFT JOIN public.visits v ON v.request_id = er.id
  WHERE v.id IS NULL
),
inserted AS (
  INSERT INTO public.visits (
    user_id,
    hospital_id,
    request_id,
    hospital_name,
    doctor_name,
    specialty,
    date,
    time,
    type,
    status,
    notes,
    cost,
    lifecycle_state,
    lifecycle_updated_at
  )
  SELECT
    me.user_id,
    me.hospital_id,
    me.id,
    COALESCE(me.hospital_name, h.name),
    d.name,
    me.specialty,
    TO_CHAR(COALESCE(me.completed_at, me.created_at, NOW()), 'YYYY-MM-DD'),
    TO_CHAR(COALESCE(me.completed_at, me.created_at, NOW()), 'HH24:MI:SS'),
    CASE
      WHEN me.service_type = 'ambulance' THEN 'emergency'
      WHEN me.service_type = 'bed' THEN 'bed'
      WHEN me.service_type = 'booking' THEN 'booking'
      ELSE COALESCE(me.service_type, 'emergency')
    END,
    CASE
      WHEN me.status = 'completed' THEN 'completed'
      WHEN me.status IN ('cancelled', 'payment_declined') THEN 'cancelled'
      WHEN me.status IN ('accepted', 'arrived', 'in_progress') THEN 'active'
      ELSE 'pending'
    END,
    'Backfilled from emergency_requests for 1:1 alignment remediation',
    CASE WHEN COALESCE(me.total_cost, 0) > 0 THEN me.total_cost::TEXT ELSE NULL END,
    'backfilled_from_emergency',
    NOW()
  FROM missing_emergencies me
  LEFT JOIN public.hospitals h ON h.id = me.hospital_id
  LEFT JOIN public.doctors d ON d.id = me.assigned_doctor_id
  RETURNING id, request_id
)
SELECT 'visit_backfill_from_emergencies' AS step, COUNT(*) AS inserted_rows
FROM inserted;

-- ---------------------------------------------------------------------------
-- 5) Normalize linked visit snapshots/statuses from canonical emergency state
--    (safe synchronization only for linked visits)
-- ---------------------------------------------------------------------------
WITH updated_visits AS (
  UPDATE public.visits v
  SET
    hospital_id = COALESCE(v.hospital_id, er.hospital_id),
    user_id = COALESCE(v.user_id, er.user_id),
    hospital_name = COALESCE(NULLIF(BTRIM(v.hospital_name), ''), er.hospital_name, h.name),
    specialty = COALESCE(NULLIF(BTRIM(v.specialty), ''), er.specialty),
    type = COALESCE(NULLIF(BTRIM(v.type), ''), CASE
      WHEN er.service_type = 'ambulance' THEN 'emergency'
      WHEN er.service_type = 'bed' THEN 'bed'
      WHEN er.service_type = 'booking' THEN 'booking'
      ELSE er.service_type
    END),
    doctor_name = COALESCE(NULLIF(BTRIM(v.doctor_name), ''), d.name),
    cost = COALESCE(NULLIF(BTRIM(v.cost), ''), CASE WHEN COALESCE(er.total_cost, 0) > 0 THEN er.total_cost::TEXT ELSE NULL END),
    status = CASE
      WHEN er.status = 'completed' THEN 'completed'
      WHEN er.status IN ('cancelled', 'payment_declined') THEN 'cancelled'
      WHEN er.status IN ('accepted', 'arrived', 'in_progress') THEN 'active'
      WHEN v.status IS NULL OR BTRIM(v.status) = '' THEN 'pending'
      ELSE v.status
    END,
    lifecycle_state = COALESCE(v.lifecycle_state, 'synced_from_emergency'),
    lifecycle_updated_at = NOW(),
    updated_at = NOW()
  FROM public.emergency_requests er
  LEFT JOIN public.hospitals h ON h.id = er.hospital_id
  LEFT JOIN public.doctors d ON d.id = er.assigned_doctor_id
  WHERE v.request_id = er.id
  RETURNING v.id
)
SELECT 'visit_sync_from_emergency' AS step, COUNT(*) AS updated_rows
FROM updated_visits;

-- ---------------------------------------------------------------------------
-- 6) Backfill payment.organization_id when emergency link exists and org can be derived
-- ---------------------------------------------------------------------------
WITH updated_payments AS (
  UPDATE public.payments p
  SET organization_id = h.organization_id,
      updated_at = NOW()
  FROM public.emergency_requests er
  JOIN public.hospitals h ON h.id = er.hospital_id
  WHERE p.emergency_request_id = er.id
    AND p.organization_id IS NULL
    AND h.organization_id IS NOT NULL
  RETURNING p.id
)
SELECT 'payment_org_backfill_from_emergency_hospital' AS step, COUNT(*) AS updated_rows
FROM updated_payments;

-- ---------------------------------------------------------------------------
-- 7) Post-backfill summary
-- ---------------------------------------------------------------------------
SELECT 'post_backfill' AS stage,
       (SELECT COUNT(*) FROM public.organizations) AS organizations_count,
       (SELECT COUNT(*) FROM public.organization_wallets) AS organization_wallets_count,
       (SELECT COUNT(*) FROM public.ivisit_main_wallet) AS platform_wallet_count,
       (SELECT COUNT(*) FROM public.emergency_requests) AS emergency_count,
       (SELECT COUNT(*) FROM public.visits) AS visit_count,
       (
         SELECT COUNT(*)
         FROM public.emergency_requests er
         LEFT JOIN public.visits v ON v.request_id = er.id
         WHERE v.id IS NULL
       ) AS emergencies_still_missing_visit,
       (
         SELECT COUNT(*)
         FROM public.payments
         WHERE emergency_request_id IS NOT NULL AND organization_id IS NULL
       ) AS payments_with_emergency_but_missing_org;

COMMIT;
