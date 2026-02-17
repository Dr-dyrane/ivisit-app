-- ============================================================
-- Fix 1: Org Admins can manage hospitals in their organization
-- ============================================================
-- Currently only 'admin' has FOR ALL on hospitals.
-- Org admins need INSERT/UPDATE/DELETE on hospitals where organization_id matches.

DROP POLICY IF EXISTS "Org Admins can manage their hospitals" ON public.hospitals;
CREATE POLICY "Org Admins can manage their hospitals"
  ON public.hospitals FOR ALL
  USING (
    public.get_current_user_role() = 'org_admin'
    AND organization_id = (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    public.get_current_user_role() = 'org_admin'
    AND organization_id = (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- ============================================================
-- Fix 2: Storage — allow uploads to shared folders (hospitals/, ambulances/)
-- ============================================================
-- Current policy requires (storage.foldername(name))[1] = auth.uid()::text
-- but hospital/ambulance images upload to 'hospitals/...' or 'ambulances/...'
-- Fix: allow authenticated users to upload to any folder in images bucket.

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
