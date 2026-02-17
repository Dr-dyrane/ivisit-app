-- Create storage policies for documents bucket (sensitive insurance information)
-- This bucket is for private documents like insurance cards

-- 1. Ensure documents bucket exists
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false) -- Private bucket, no public access
on conflict (id) do nothing;

-- 2. POLICY: Users can upload to their own insurance folder
-- Allow authenticated users to upload files to their own folder: insurance/user_id/*
create policy "Users can upload own insurance documents"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'documents' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'insurance'
    and (storage.foldername(name))[2] = auth.uid()::text
);

-- 3. POLICY: Users can update their own insurance documents
-- Allow users to replace their own files
create policy "Users can update own insurance documents"
on storage.objects for update
to authenticated
using (
    bucket_id = 'documents' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'insurance'
    and (storage.foldername(name))[2] = auth.uid()::text
);

-- 4. POLICY: Users can read their own insurance documents
-- Allow users to access their own files
create policy "Users can read own insurance documents"
on storage.objects for select
to authenticated
using (
    bucket_id = 'documents' 
    and auth.role() = 'authenticated'
    and (
        -- User owns the folder
        ((storage.foldername(name))[1] = 'insurance' and (storage.foldername(name))[2] = auth.uid()::text)
        OR
        -- OR User is an Admin
        exists (
            select 1 from public.profiles 
            where id = auth.uid() 
            and role = 'admin'
        )
    )
);

-- 5. POLICY: Users can delete their own insurance documents
-- Allow users to delete their own files
create policy "Users can delete own insurance documents"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'documents' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'insurance'
    and (storage.foldername(name))[2] = auth.uid()::text
);

-- 6. POLICY: Service role can manage all documents (for backend processes)
-- Allow service role to handle document operations
create policy "Service role full access to documents"
on storage.objects for all
to service_role
using (bucket_id = 'documents');
