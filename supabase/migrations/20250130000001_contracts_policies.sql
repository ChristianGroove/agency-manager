-- Allow authenticated users to upload contract files
create policy "Authenticated users can upload contracts"
on storage.objects for insert
with check (
  bucket_id = 'contracts' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to view contract files
create policy "Authenticated users can view contracts"
on storage.objects for select
using (
  bucket_id = 'contracts' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update contract files
create policy "Authenticated users can update contracts"
on storage.objects for update
with check (
  bucket_id = 'contracts' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete contract files
create policy "Authenticated users can delete contracts"
on storage.objects for delete
using (
  bucket_id = 'contracts' and
  auth.role() = 'authenticated'
);

-- Restrict access to own organization's contracts
create policy "Users can only access their organization's contracts"
on storage.objects for all
using (
  bucket_id = 'contracts' and
  split_part(name, '/', 1) = auth.jwt() ->> 'organization_id'
)
with check (
  bucket_id = 'contracts' and
  split_part(name, '/', 1) = auth.jwt() ->> 'organization_id'
);