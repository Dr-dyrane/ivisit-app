-- iVisit E2E Alignment Cleanup - Legacy Junk Rows (Idempotent)
-- Scope:
-- 1) organization_wallets rows with NULL organization_id and no ledger usage
-- 2) placeholder payments with no links/value and no ledger usage
--
-- This is intentionally strict to avoid deleting legitimate records.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Preview candidates
-- ---------------------------------------------------------------------------
WITH invalid_org_wallets AS (
  SELECT ow.*
  FROM public.organization_wallets ow
  LEFT JOIN public.wallet_ledger wl ON wl.wallet_id = ow.id
  WHERE ow.organization_id IS NULL
  GROUP BY ow.id
  HAVING COUNT(wl.id) = 0
)
SELECT 'preview_invalid_org_wallets' AS step, COUNT(*) AS candidate_count
FROM invalid_org_wallets;

WITH placeholder_payments AS (
  SELECT p.*
  FROM public.payments p
  LEFT JOIN public.wallet_ledger wl ON wl.reference_id = p.id
  WHERE p.emergency_request_id IS NULL
    AND p.organization_id IS NULL
    AND p.payment_method IS NULL
    AND COALESCE(p.amount, 0) = 0
    AND p.status = 'pending'
    AND COALESCE(p.metadata, '{}'::jsonb) = '{}'::jsonb
    AND COALESCE(p.provider_response, '{}'::jsonb) = '{}'::jsonb
  GROUP BY p.id
  HAVING COUNT(wl.id) = 0
)
SELECT 'preview_placeholder_payments' AS step, COUNT(*) AS candidate_count
FROM placeholder_payments;

-- ---------------------------------------------------------------------------
-- 2) Delete invalid org wallets (strict)
-- ---------------------------------------------------------------------------
WITH deleted AS (
  DELETE FROM public.organization_wallets ow
  WHERE ow.id IN (
    SELECT ow2.id
    FROM public.organization_wallets ow2
    LEFT JOIN public.wallet_ledger wl ON wl.wallet_id = ow2.id
    WHERE ow2.organization_id IS NULL
    GROUP BY ow2.id
    HAVING COUNT(wl.id) = 0
  )
  RETURNING ow.id
)
SELECT 'delete_invalid_org_wallets' AS step, COUNT(*) AS deleted_count
FROM deleted;

-- ---------------------------------------------------------------------------
-- 3) Delete placeholder orphan payments (strict)
-- ---------------------------------------------------------------------------
WITH deleted AS (
  DELETE FROM public.payments p
  WHERE p.id IN (
    SELECT p2.id
    FROM public.payments p2
    LEFT JOIN public.wallet_ledger wl ON wl.reference_id = p2.id
    WHERE p2.emergency_request_id IS NULL
      AND p2.organization_id IS NULL
      AND p2.payment_method IS NULL
      AND COALESCE(p2.amount, 0) = 0
      AND p2.status = 'pending'
      AND COALESCE(p2.metadata, '{}'::jsonb) = '{}'::jsonb
      AND COALESCE(p2.provider_response, '{}'::jsonb) = '{}'::jsonb
    GROUP BY p2.id
    HAVING COUNT(wl.id) = 0
  )
  RETURNING p.id
)
SELECT 'delete_placeholder_payments' AS step, COUNT(*) AS deleted_count
FROM deleted;

COMMIT;
