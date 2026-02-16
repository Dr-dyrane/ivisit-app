-- ============================================================
-- 1. SECURITY DEFINER RPC for hospital updates
--    Bypasses RLS (same pattern as delete_hospital_by_admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_hospital_by_admin(
  target_hospital_id TEXT,
  payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  caller_org_id UUID;
  hospital_org_id UUID;
  result JSONB;
BEGIN
  -- Get caller's role
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Admins can update any hospital
  IF caller_role = 'admin' THEN
    -- ok
  ELSIF caller_role = 'org_admin' THEN
    -- Org admins can only update hospitals in their org
    SELECT organization_id INTO caller_org_id
    FROM public.profiles WHERE id = auth.uid();

    SELECT organization_id INTO hospital_org_id
    FROM public.hospitals WHERE id = target_hospital_id::UUID;

    IF caller_org_id IS NULL OR hospital_org_id IS NULL OR caller_org_id != hospital_org_id THEN
      RAISE EXCEPTION 'Org admin cannot update hospitals outside their organization';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only admins and org_admins can update hospitals';
  END IF;

  -- Strip fields that don't exist in the table
  payload = payload - 'total_beds' - 'reserved_beds' - 'display_id'
                     - 'google_photos' - 'id' - 'created_at';

  -- Perform the update
  UPDATE public.hospitals
  SET
    name              = COALESCE((payload->>'name')::TEXT, name),
    address           = COALESCE((payload->>'address')::TEXT, address),
    phone             = (payload->>'phone')::TEXT,
    rating            = COALESCE((payload->>'rating')::NUMERIC, rating),
    type              = COALESCE((payload->>'type')::TEXT, type),
    image             = (payload->>'image')::TEXT,
    specialties       = CASE WHEN payload ? 'specialties' THEN (payload->'specialties') ELSE specialties END,
    service_types     = CASE WHEN payload ? 'service_types' THEN (payload->'service_types') ELSE service_types END,
    features          = CASE WHEN payload ? 'features' THEN (payload->'features') ELSE features END,
    emergency_level   = (payload->>'emergency_level')::TEXT,
    available_beds    = COALESCE((payload->>'available_beds')::INT, available_beds),
    ambulances_count  = COALESCE((payload->>'ambulances_count')::INT, ambulances_count),
    wait_time         = (payload->>'wait_time')::TEXT,
    price_range       = (payload->>'price_range')::TEXT,
    latitude          = CASE WHEN payload ? 'latitude' THEN (payload->>'latitude')::NUMERIC ELSE latitude END,
    longitude         = CASE WHEN payload ? 'longitude' THEN (payload->>'longitude')::NUMERIC ELSE longitude END,
    verified          = COALESCE((payload->>'verified')::BOOLEAN, verified),
    verification_status = COALESCE((payload->>'verification_status')::TEXT, verification_status),
    status            = COALESCE((payload->>'status')::TEXT, status),
    organization_id   = CASE
                          WHEN payload ? 'organization_id' AND payload->>'organization_id' != ''
                          THEN (payload->>'organization_id')::UUID
                          ELSE organization_id
                        END,
    updated_at        = now()
  WHERE id = target_hospital_id::UUID;

  -- Return the updated row
  SELECT to_jsonb(h.*) INTO result
  FROM public.hospitals h
  WHERE h.id = target_hospital_id::UUID;

  RETURN result;
END;
$$;

-- ============================================================
-- 2. Fix storage policies — drop restrictive per-user folder
--    and allow authenticated uploads to images bucket
-- ============================================================
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');
