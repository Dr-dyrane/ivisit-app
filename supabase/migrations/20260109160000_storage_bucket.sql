-- Enable the storage extension if not already enabled (standard in Supabase)
-- create extension if not exists "storage";

-- 1. Create the 'images' bucket
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- 2. Enable RLS on the bucket (good practice, though buckets often default to secure)
-- Note: Storage policies are set on the storage.objects table

-- POLICY: Public Read Access
-- Allow anyone to view images in this bucket
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'images' );

-- POLICY: Authenticated Upload
-- Allow authenticated users to upload files to their own folder: user_id/*
create policy "Authenticated Upload"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'images' 
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: Authenticated Update
-- Allow users to replace their own files
create policy "Authenticated Update"
on storage.objects for update
to authenticated
using (
    bucket_id = 'images' 
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: Authenticated Delete
-- Allow users to delete their own files
create policy "Authenticated Delete"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'images' 
    and (storage.foldername(name))[1] = auth.uid()::text
);
